import React, { useState, useEffect } from 'react';
import { parseUnits, parseEther, formatUnits, formatEther } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers, isWstETHAddress, wrapEthToWstEth, calculateEthWrapForFlashLoan, minBigInt, formatTokenSymbol, clampToPositive } from '@/utils';
import { PreviewBox, NumberDisplay, TransitionLoader } from '@/components/ui';
import { useAdaptiveInterval, useFlashLoanPreview } from '@/hooks';
import { GAS_RESERVE_WEI } from '@/constants';
import { findSharesForEthWithdraw } from '@/utils/findSharesForAmount';
import { maxBigInt } from '@/utils';
import { ERC20__factory } from '@/typechain-types';

type ActionType = 'deposit' | 'withdraw';

interface FlashLoanDepositWithdrawHandlerProps {
  actionType: ActionType;
}

// fixed slippage for redeem, 0.1%
const REDEEM_SLIPPAGE_DIVIDEND = 999;
const REDEEM_SLIPPAGE_DIVIDER = 1000;

const MINT_SLIPPAGE_DIVIDEND = 1000001;
const MINT_SLIPPAGE_DIVIDER = 1000000;

const FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDEND = 99999;
const FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDER = 100000;

export default function FlashLoanDepositWithdrawHandler({ actionType }: FlashLoanDepositWithdrawHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [estimatedShares, setEstimatedShares] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const [useEthWrapToWSTETH, setUseEthWrapToWSTETH] = useState(true);
  const [ethToWrapValue, setEthToWrapValue] = useState('');
  const [isWrapping, setIsWrapping] = useState(false);
  const [previewedWstEthAmount, setPreviewedWstEthAmount] = useState<bigint | null>(null);
  const [maxAmount, setMaxAmount] = useState('');
  const [isMaxWithdraw, setIsMaxWithdraw] = useState(false);
  const [minDeposit, setMinDeposit] = useState('');
  const [minWithdraw, setMinWithdraw] = useState('');
  const [minTooBig, setMinDisablesAction] = useState(false);

  const { address, provider, signer, publicProvider } = useAppContext();

  const {
    vault,
    vaultLens,
    vaultAddress,
    flashLoanMintHelper,
    flashLoanRedeemHelper,
    flashLoanMintHelperAddress,
    flashLoanRedeemHelperAddress,
    collateralToken,
    collateralTokenAddress,
    sharesSymbol,
    sharesDecimals,
    sharesBalance,
    collateralTokenSymbol,
    collateralTokenDecimals,
    collateralTokenBalance,
    ethBalance,
    refreshBalances,
    refreshVaultLimits,
    borrowTokenSymbol
  } = useVaultContext();

  const helper = actionType === 'deposit' ? flashLoanMintHelper : flashLoanRedeemHelper;
  const helperAddress = actionType === 'deposit' ? flashLoanMintHelperAddress : flashLoanRedeemHelperAddress;

  // Check if this is a wstETH vault that supports ETH input
  const isWstETHVault = actionType === 'deposit' && collateralToken && isWstETHAddress(collateralTokenAddress || '');

  const {
    isLoadingPreview,
    previewData,
    receive,
    provide,
    isErrorLoadingPreview,
    invalidRebalanceMode
  } = useFlashLoanPreview({
    sharesToProcess: estimatedShares,
    helperType: actionType === 'deposit' ? 'mint' : 'redeem',
    helper,
    collateralTokenDecimals,
    sharesBalance,
    sharesDecimals,
  });

  useEffect(() => {
    setInputValue('');
    setEstimatedShares(null);
    setError(null);
    setApprovalError(null);
    setSuccess(null);
    setUseEthWrapToWSTETH(true);
    setEthToWrapValue('');
    setPreviewedWstEthAmount(null);
  }, [actionType]);

  const applyRedeemSlippage = (amount: bigint) => {
    return amount * BigInt(REDEEM_SLIPPAGE_DIVIDEND) / BigInt(REDEEM_SLIPPAGE_DIVIDER);
  }

  const applyMintSlippage = (amount: bigint) => {
    return amount * BigInt(MINT_SLIPPAGE_DIVIDEND) / BigInt(MINT_SLIPPAGE_DIVIDER);
  }

  const applyFlashLoanDepositWithdrawSlippage = (amount: bigint) => {
    return amount * BigInt(FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDEND) / BigInt(FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDER);
  }

  const loadMinAvailable = async () => {
    if (!vaultLens || !publicProvider || !vaultAddress || !sharesDecimals) return;

    const [, deltaShares] = await vaultLens.previewLowLevelRebalanceBorrow(0);

    if (deltaShares > 0n) {
      setMinWithdraw('0');

      const variableDebtEthWETH = "0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE";
      const variableDebtToken = ERC20__factory.connect(variableDebtEthWETH, publicProvider);
      const variableDebtTokenAmount = await variableDebtToken.balanceOf(vaultAddress);
      const variableDebtTokenShares = await vaultLens.convertToShares(variableDebtTokenAmount);
      const amountWithPrecision = variableDebtTokenShares * 2n / 10_000_000n;

      const rawMinMint = maxBigInt(
        deltaShares * 101n / 100n,
        deltaShares + 5n * amountWithPrecision
      )

      const rawMinDeposit = await vaultLens.convertToAssets(rawMinMint);
      const rawMinDepositWithPrecision = rawMinDeposit * 10001n / 10000n

      const formattedMinDeposit = formatEther(rawMinDepositWithPrecision);
      setMinDeposit(formattedMinDeposit);
    } else if (deltaShares < 0n) {
      setMinDeposit('0');

      const absDelta = deltaShares < 0n ? -deltaShares : deltaShares;
      const rawMinRedeem = absDelta * 10001n / 10000n;

      const rawMinWithdraw = await vaultLens.convertToAssets(rawMinRedeem);
      const rawMinWithdrawWithPrecision = rawMinWithdraw * 10001n / 10000n

      const formattedMinWithdraw = formatEther(rawMinWithdrawWithPrecision);
      setMinWithdraw(formattedMinWithdraw);
    } else {
      setMinDeposit('0');
      setMinWithdraw('0');
    }
  };

  useAdaptiveInterval(loadMinAvailable, {
    initialDelay: 12000,
    maxDelay: 60000,
    multiplier: 2,
    enabled: !!vaultLens && !!publicProvider
  });

  useEffect(() => {
    if (!maxAmount || !minDeposit || !minWithdraw) return;

    const rawMaxAmount = parseEther(maxAmount);
    const rawMinDeposit = parseEther(minDeposit);
    const rawMinWithdraw = parseEther(minWithdraw);

    if (actionType === 'deposit') {
      if (rawMinDeposit > rawMaxAmount) {
        setMinDisablesAction(true);
      } else {
        setMinDisablesAction(false);
      }
    } else {
      if (rawMinWithdraw > rawMaxAmount) {
        setMinDisablesAction(true);
      } else {
        setMinDisablesAction(false);
      }
    }

  }, [actionType, minDeposit, minWithdraw, maxAmount]);

  const calculateShares = async () => {
    if (!inputValue || !vaultLens) {
      setEstimatedShares(null);
      return;
    }

    try {
      const inputAmount = parseUnits(inputValue, 18); // TODO: Dynamically fetch

      if (inputAmount <= 0n) {
        setEstimatedShares(null);
        return;
      }

      if (actionType === 'deposit') {
        if (!flashLoanMintHelper || !publicProvider) return;

        let shares = await vaultLens.convertToShares(inputAmount);
        
        if (!shares) return;

        shares = applyFlashLoanDepositWithdrawSlippage(shares);
        setEstimatedShares(shares);
      } else {
        if (isMaxWithdraw) {
          const shares = parseUnits(sharesBalance, Number(sharesDecimals));
          setEstimatedShares(shares);
          return;
        }

        if (!flashLoanRedeemHelper) return;

        let shares = await findSharesForEthWithdraw({
          amount: inputAmount,
          helper: flashLoanRedeemHelper,
          vaultLens
        })
        
        if (!shares) return;

        shares = applyFlashLoanDepositWithdrawSlippage(shares);
        setEstimatedShares(shares);
      }

    } catch (err) {
      console.error("Error estimating shares:", err);
      setEstimatedShares(null);
    }
  };

  // Calculate estimated shares based on input amount
  useEffect(() => {
    const timeoutId = setTimeout(calculateShares, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue, actionType, vaultLens, flashLoanMintHelper, flashLoanRedeemHelper, publicProvider, isMaxWithdraw]);

  const setMaxDeposit = async () => {
    if (!vaultLens) return;

    const rawEthBalance = parseEther(ethBalance);
    const sharesFromEth = await vaultLens.convertToShares(rawEthBalance);
    const userMaxMint = clampToPositive(sharesFromEth - GAS_RESERVE_WEI);
    const vaultMaxMint = await vaultLens.maxLowLevelRebalanceShares();

    const maxMint = minBigInt(userMaxMint, vaultMaxMint);
    const maxDeposit = await vaultLens.convertToAssets(maxMint);
    const formattedMaxDeposit = formatEther(maxDeposit);

    setMaxAmount(formattedMaxDeposit);
  };

  const setMaxWithdraw = async () => {
    if (!helper || !sharesBalance || sharesBalance === '0') {
      setMaxAmount('0');
      return;
    }

    try {
      const rawShares = parseUnits(sharesBalance, Number(sharesDecimals));
      // @ts-expect-error - helper is FlashLoanRedeemHelper
      const maxWeth = await helper.previewRedeemSharesWithCurveAndFlashLoanBorrow(rawShares);
      setMaxAmount(formatEther(maxWeth));
    } catch (err) {
      console.error("Error calculating max withdraw:", err);
      setMaxAmount('0');
    }
  };

  useEffect(() => {
    if (actionType === 'deposit') {
      setMaxDeposit();
    } else {
      setMaxWithdraw();
    }
  }, [actionType, ethBalance, collateralTokenBalance, sharesBalance, isWstETHVault, helper, sharesDecimals]);

  useEffect(() => {
    // Reset state if input is empty or invalid
    if (!estimatedShares || estimatedShares <= 0n) {
      setPreviewedWstEthAmount(null);
      setEthToWrapValue('');
      setHasInsufficientBalance(false);
      return;
    }
  }, [estimatedShares]);

  useEffect(() => {
    if (!estimatedShares || estimatedShares <= 0n) {
      return;
    }

    if (actionType === 'withdraw') {
      const userSharesBalance = parseUnits(sharesBalance, Number(sharesDecimals));
      setHasInsufficientBalance(userSharesBalance < estimatedShares);
      return;
    }

    // Helper type is deposit (mint)
    const determineRequiredWrapAmount = async () => {
      if (!useEthWrapToWSTETH || !isWstETHVault) {
        setPreviewedWstEthAmount(null);
        setEthToWrapValue('');

        if (previewData?.amount) {
          // For deposit, previewData.amount is required collateral
          // We check against collateral balance (if not wrapping)
          setHasInsufficientBalance(parseUnits(collateralTokenBalance, Number(collateralTokenDecimals)) < previewData.amount);
        } else {
          setHasInsufficientBalance(false);
        }
        return;
      }

      // If wrapping is enabled, we need previewData to calculate wrap amount
      if (!previewData) {
        setHasInsufficientBalance(false);
        return;
      }

      const result = await calculateEthWrapForFlashLoan({
        provider,
        previewData,
        collateralTokenBalance,
        collateralTokenDecimals,
        ethBalance,
        gasReserveWei: GAS_RESERVE_WEI
      });

      if (result.shouldWrap) {
        const ethToWrap = applyMintSlippage(parseEther(result.ethToWrapValue));
        setEthToWrapValue(formatUnits(ethToWrap, 18));
        setPreviewedWstEthAmount(result.previewedWstEthAmount);
        setHasInsufficientBalance(false);
      } else {
        setEthToWrapValue('');
        setPreviewedWstEthAmount(null);

        
        if (previewData?.amount) {
          setHasInsufficientBalance(parseUnits(collateralTokenBalance, Number(collateralTokenDecimals)) < previewData.amount);
        } else {
          setHasInsufficientBalance(false);
        }
      }
    };

    determineRequiredWrapAmount();
  }, [
    previewData,
    estimatedShares,
    actionType,
    useEthWrapToWSTETH,
    isWstETHVault,
    collateralTokenBalance,
    collateralTokenDecimals,
    sharesBalance,
    sharesDecimals,
    ethBalance,
    provider
  ]);

  const checkAndApproveToken = async () => {
    if (!previewData || !address || !helperAddress || !estimatedShares) {
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      if (actionType === 'deposit') {
        if (!collateralToken) return;
        const currentAllowance = await collateralToken.allowance(address, helperAddress);
        if (currentAllowance < previewData.amount) {
          const tx = await collateralToken.approve(helperAddress, previewData.amount);
          await tx.wait();
          setSuccess(`Successfully approved ${collateralTokenSymbol}.`);
        } else {
          setSuccess(`Already approved ${collateralTokenSymbol}.`);
        }
      } else {
        if (!vault) return;

        const sharesAllowance = await vault.allowance(address, helperAddress);
        if (sharesAllowance < estimatedShares) {
          const tx = await vault.approve(helperAddress, estimatedShares);
          await tx.wait();
          setSuccess(`Successfully approved ${sharesSymbol}.`);
        } else {
          setSuccess(`Already approved ${sharesSymbol}.`);
        }
      }
    } catch (err) {
      if (isUserRejected(err)) {
        setApprovalError('Approval canceled by user.');
      } else {
        const tokenName = actionType === 'deposit' ? 'collateral token' : 'shares';
        setApprovalError(`Failed to approve ${tokenName}.`);
        console.error(`Failed to approve ${tokenName}:`, err);
      }
      throw err;
    } finally {
      setIsApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!helper || !address || !estimatedShares || estimatedShares <= 0n) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setApprovalError(null);

    try {
      // If using ETH input for wstETH vault, wrap ETH to wstETH first
      if (useEthWrapToWSTETH && isWstETHVault && ethToWrapValue && provider && signer) {
        setIsWrapping(true);
        const ethAmount = parseEther(ethToWrapValue);

        const wrapResult = await wrapEthToWstEth(
          provider,
          signer,
          ethAmount,
          address,
          setSuccess,
          setError
        );

        setIsWrapping(false);

        if (!wrapResult) {
          return; // Error already set by wrapEthToWstEth
        }

        // Refresh balances to get updated wstETH balance
        await refreshBalances();
      }

      await checkAndApproveToken();

      let tx;
      if (actionType === 'deposit') {
        // @ts-expect-error - helper is FlashLoanMintHelper
        tx = await helper.mintSharesWithFlashLoanCollateral(estimatedShares);
      } else {
        // @ts-expect-error - helper is FlashLoanRedeemHelper
        tx = await helper.redeemSharesWithCurveAndFlashLoanBorrow(estimatedShares, applyRedeemSlippage(previewData!.amount));
      }

      await tx.wait();

      await Promise.all([refreshBalances(), refreshVaultLimits()]);

      setInputValue('');
      setEstimatedShares(null);
      setEthToWrapValue('');
      setSuccess(`Successfully ${actionType === 'deposit' ? 'deposited' : 'withdrawn'} with flash loan!`);
    } catch (err: unknown) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        // Check if it's a contract revert without error data
        const isGenericRevert = (err as any)?.data === '0x' || (err as any)?.data === null || (err as any)?.reason === 'require(false)';

        if (isGenericRevert) {
          setError(
            `Contract execution failed. Please try a smaller amount or contact support.`
          );
        } else {
          setError(`Failed to ${actionType} with flash loan`);
        }
        console.error(`Failed to ${actionType} with flash loan:`, err);
      }
    } finally {
      setLoading(false);
      setIsWrapping(false);
    }
  };

  const handleInputChange = (value: string) => {
    const cleanedValue = allowOnlyNumbers(value);
    setInputValue(cleanedValue);

    setError(null);
    setSuccess(null);
    setApprovalError(null);
  };

  const handleSetMax = () => {
    if (!maxAmount) return;
    handleInputChange(maxAmount);
    if (actionType == "withdraw") {
      setIsMaxWithdraw(true);
    }
  };

  const rawInputSymbol =actionType === 'deposit' ? (isWstETHVault ? 'ETH' : collateralTokenSymbol) : borrowTokenSymbol;
  const inputSymbol = formatTokenSymbol(rawInputSymbol);

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="flash-loan-action-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Amount to {actionType === 'deposit' ? 'Deposit' : 'Withdraw'}
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              name="flash-loan-action-amount"
              id="flash-loan-action-amount"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete="off"
              className="block w-full pr-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0.0"
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={handleSetMax}
                className="bg-transparent text-sm text-indigo-600 hover:text-indigo-500 mr-2"
                disabled={loading || !maxAmount}
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">{inputSymbol}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          <span>Max Available:</span>
          <TransitionLoader isLoading={!maxAmount}>
            <span>
              <NumberDisplay value={maxAmount} />
              {' '}
              {inputSymbol}
            </span>
          </TransitionLoader>
        </div>

        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          <span>Min Available:</span>
          <TransitionLoader isLoading={!minDeposit || !minWithdraw}>
            {actionType === "deposit" ?
              <>
                <NumberDisplay value={minDeposit} />
                {' '}ETH
              </> :
              <>
                <NumberDisplay value={minWithdraw} />
                {' '}{formatTokenSymbol(borrowTokenSymbol)}
              </>
            }
          </TransitionLoader>
        </div>

        {isWstETHVault && actionType === 'deposit' && (
          <>
            {useEthWrapToWSTETH && (
              <div>
                <p className="mt-1 text-xs text-gray-500">
                  ETH will be automatically wrapped to wstETH
                </p>
                {previewedWstEthAmount && ethToWrapValue && (
                  <p className="mt-1 text-xs text-green-600">
                    → Will wrap <NumberDisplay value={ethToWrapValue} /> ETH to ~<NumberDisplay value={formatUnits(previewedWstEthAmount, collateralTokenDecimals)} /> wstETH
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Preview Section */}
        {!!estimatedShares && estimatedShares > 0n && previewData && !isErrorLoadingPreview && (
          <PreviewBox
            receive={receive}
            provide={provide}
            isLoading={isLoadingPreview}
            title="Transaction Preview"
          />
        )}

        {/* Preview Error */}
        {!!estimatedShares && (isErrorLoadingPreview || invalidRebalanceMode) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <span>
              {invalidRebalanceMode
                ? "Flash loan rebalance is currently unavailable for this amount."
                : "Error loading preview. Amount might be too high or low."}
            </span>
          </div>
        )}

        {/* Balance warning */}
        {hasInsufficientBalance && !!estimatedShares && estimatedShares > 0n && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <span>
              Insufficient balance.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !estimatedShares ||
            estimatedShares <= 0n ||
            isApproving ||
            isWrapping ||
            hasInsufficientBalance ||
            isErrorLoadingPreview ||
            invalidRebalanceMode ||
            minTooBig
          }
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWrapping
            ? 'Wrapping ETH to wstETH...'
            : isApproving
              ? `Approving ${actionType === 'deposit' ? 'Collateral' : 'Shares'}...`
              : loading
                ? 'Processing...'
                : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : `${actionType === 'deposit' ? 'Deposit' : 'Withdraw'}`}
        </button>

        {approvalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {approvalError}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
