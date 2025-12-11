import React, { useState, useEffect } from 'react';
import { parseUnits, parseEther, formatUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import {
  isUserRejected,
  allowOnlyNumbers,
  isWstETHAddress,
  wrapEthToWstEth,
  calculateEthWrapForFlashLoan,
  minBigInt,
  formatTokenSymbol,
  clampToPositive
} from '@/utils';
import { PreviewBox, NumberDisplay, TransitionLoader } from '@/components/ui';
import { useAdaptiveInterval, useFlashLoanPreview } from '@/hooks';
import { GAS_RESERVE_WEI } from '@/constants';
import { maxBigInt } from '@/utils';
import { ERC20__factory } from '@/typechain-types';

type HelperType = 'mint' | 'redeem';

interface FlashLoanHelperHandlerProps {
  helperType: HelperType;
}

// fixed slippage for redeem, 0.1%
const REDEEM_SLIPPAGE_DIVIDEND = 999;
const REDEEM_SLIPPAGE_DIVIDER = 1000;

const MINT_MAX_SLIPPAGE_DIVIDEND = 999999;
const MINT_MAX_SLIPPAGE_DIVIDER = 1000000;

const MINT_SLIPPAGE_DIVIDEND = 1000001;
const MINT_SLIPPAGE_DIVIDER = 1000000;

export default function FlashLoanHelperHandler({ helperType }: FlashLoanHelperHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [sharesToProcess, setSharesToProcess] = useState<bigint | null>(null);
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
  const [effectiveCollateralBalance, setEffectiveCollateralBalance] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minMint, setMinMint] = useState('');
  const [minRedeem, setMinRedeem] = useState('');
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
  } = useVaultContext();

  const helper = helperType === 'mint' ? flashLoanMintHelper : flashLoanRedeemHelper;
  const helperAddress = helperType === 'mint' ? flashLoanMintHelperAddress : flashLoanRedeemHelperAddress;

  // Check if this is a wstETH vault that supports ETH input
  const isWstETHVault = helperType === 'mint' && collateralToken && isWstETHAddress(collateralTokenAddress || '');

  const {
    isLoadingPreview,
    previewData,
    receive,
    provide,
    isErrorLoadingPreview,
    invalidRebalanceMode
  } = useFlashLoanPreview({
    sharesToProcess,
    helperType,
    helper,
    collateralTokenDecimals,
    sharesBalance,
    sharesDecimals,
  });

  useEffect(() => {
    setInputValue('');
    setSharesToProcess(null);
    setError(null);
    setApprovalError(null);
    setSuccess(null);
    setUseEthWrapToWSTETH(true);
    setEthToWrapValue('');
    setPreviewedWstEthAmount(null);
  }, [helperType]);

  const applyRedeemSlippage = (amount: bigint) => {
    return amount * BigInt(REDEEM_SLIPPAGE_DIVIDEND) / BigInt(REDEEM_SLIPPAGE_DIVIDER);
  }

  const applyMaxMintSlippage = (amount: bigint) => {
    return amount * BigInt(MINT_MAX_SLIPPAGE_DIVIDEND) / BigInt(MINT_MAX_SLIPPAGE_DIVIDER);
  }

  const applyMintSlippage = (amount: bigint) => {
    return amount * BigInt(MINT_SLIPPAGE_DIVIDEND) / BigInt(MINT_SLIPPAGE_DIVIDER);
  }

  const setMaxMint = async () => {
    if (
      !vaultLens ||
      !ethBalance ||
      !collateralTokenBalance ||
      !collateralTokenDecimals ||
      !sharesDecimals
    ) return;

    if (isWstETHVault) {
      const rawEthBalance = parseEther(ethBalance);
      const rawCollateralBalance = parseUnits(collateralTokenBalance, collateralTokenDecimals);

      const sharesFromCollateral = await vaultLens.convertToSharesCollateral(rawCollateralBalance);
      const sharesFromEth = await vaultLens.convertToShares(rawEthBalance);

      const userMaxMint = clampToPositive(sharesFromCollateral + sharesFromEth - GAS_RESERVE_WEI);
      const vaultMaxMint = await vaultLens.maxLowLevelRebalanceShares();

      const maxMint = minBigInt(userMaxMint, vaultMaxMint);
      const maxMintWithSlippage = applyMaxMintSlippage(maxMint);
      const formattedMaxMint = formatUnits(maxMintWithSlippage, sharesDecimals)

      setMaxAmount(formattedMaxMint);
    }

    // TODO: Write calculation logic for MAE/WETH Sepolia vault
  }

  const setMaxRedeem = () => {
    // For redeem no needed special calculations, max amount is shares balance
    setMaxAmount(sharesBalance);
  }

  const loadMinAvailable = async () => {
    if (!vaultLens || !publicProvider || !vaultAddress || !sharesDecimals) return;

    const [, deltaShares] = await vaultLens.previewLowLevelRebalanceBorrow(0);

    if (deltaShares > 0n) {
      setMinRedeem('0');

      const variableDebtEthWETH = "0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE";
      const variableDebtToken = ERC20__factory.connect(variableDebtEthWETH, publicProvider);
      const variableDebtTokenAmount = await variableDebtToken.balanceOf(vaultAddress);
      const variableDebtTokenShares = await vaultLens.convertToShares(variableDebtTokenAmount);
      const amountWithPrecision = variableDebtTokenShares * 2n / 10_000_000n;

      const rawMinMint = maxBigInt(
        deltaShares * 101n / 100n,
        deltaShares + 5n * amountWithPrecision
      )

      const formattedMinMint = formatUnits(rawMinMint, sharesDecimals);
      setMinMint(formattedMinMint);
    } else if (deltaShares < 0n) {
      setMinMint('0');

      const absDelta = deltaShares < 0n ? -deltaShares : deltaShares;
      const rawMinRedeem = absDelta * 10001n / 10000n;

      const formattedMinRedeem = formatUnits(rawMinRedeem, sharesDecimals);
      setMinRedeem(formattedMinRedeem);
    } else {
      setMinMint('0');
      setMinRedeem('0');
    }
  };

  useAdaptiveInterval(loadMinAvailable, {
    initialDelay: 12000,
    maxDelay: 60000,
    multiplier: 2,
    enabled: !!vaultLens && !!publicProvider
  });

  useEffect(() => {
    if (!maxAmount || !minMint || !minRedeem) return;

    const rawMaxAmount = parseUnits(maxAmount, sharesDecimals);
    const rawMinMint = parseUnits(minMint, sharesDecimals);
    const rawMinRedeem = parseUnits(minRedeem, sharesDecimals);

    if (helperType === 'mint') {
      if (rawMinMint > rawMaxAmount) {
        setMinDisablesAction(true);
      } else {
        setMinDisablesAction(false);
      }
    } else {
      if (rawMinRedeem > rawMaxAmount) {
        setMinDisablesAction(true);
      } else {
        setMinDisablesAction(false);
      }
    }
  }, [helperType, sharesDecimals, minMint, minRedeem, maxAmount]);

  useEffect(() => {
    if (helperType === 'mint') {
      setMaxMint();
    } else {
      setMaxRedeem();
    }
  }, [
    helperType, vaultLens, ethBalance,
    sharesBalance, sharesDecimals,
    collateralTokenBalance, collateralTokenDecimals
  ]);

  useEffect(() => {
    // Reset state if input is empty or invalid
    if (!sharesToProcess || sharesToProcess <= 0n) {
      setPreviewedWstEthAmount(null);
      setEthToWrapValue('');
      setHasInsufficientBalance(false);
      return;
    }

    if (helperType === 'redeem') {
      const userSharesBalance = parseUnits(sharesBalance, Number(sharesDecimals));
      setHasInsufficientBalance(userSharesBalance < sharesToProcess);
      return;
    }

    // Helper type is mint
    const determineRequiredWrapAmount = async () => {
      if (!useEthWrapToWSTETH || !isWstETHVault) {
        setPreviewedWstEthAmount(null);
        setEthToWrapValue('');
        setEffectiveCollateralBalance(collateralTokenBalance);

        if (previewData?.amount) {
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

        const currentBalance = parseUnits(collateralTokenBalance || '0', Number(collateralTokenDecimals));
        const totalBalance = currentBalance + (result.previewedWstEthAmount ?? 0n);
        const formattedBalance = formatUnits(totalBalance, Number(collateralTokenDecimals));
        setEffectiveCollateralBalance(formattedBalance);
        setHasInsufficientBalance(false);
      } else {
        setEthToWrapValue('');
        setPreviewedWstEthAmount(null);
        setEffectiveCollateralBalance(collateralTokenBalance);

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
    sharesToProcess,
    helperType,
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
    if (!previewData || !address || !helperAddress || !sharesToProcess) {
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      if (helperType === 'mint') {
        if (!collateralToken) return;
        const currentAllowance = await collateralToken.allowance(address, helperAddress);
        if (currentAllowance < previewData.amount) {
          const tx = await collateralToken.approve(helperAddress, previewData.amount);
          await tx.wait();
          setSuccess(`Successfully approved ${formatTokenSymbol(collateralTokenSymbol)}.`);
        } else {
          setSuccess(`Already approved ${formatTokenSymbol(collateralTokenSymbol)}.`);
        }
      } else {
        if (!vault) return;

        const sharesAllowance = await vault.allowance(address, helperAddress);
        if (sharesAllowance < sharesToProcess) {
          const tx = await vault.approve(helperAddress, sharesToProcess);
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
        const tokenName = helperType === 'mint' ? 'collateral token' : 'leveraged tokens';
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

    if (!helper || !address || !sharesToProcess || sharesToProcess <= 0n) return;

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
      if (helperType === 'mint') {
        // @ts-expect-error - helper is FlashLoanMintHelper when helperType is 'mint'
        tx = await helper.mintSharesWithFlashLoanCollateral(sharesToProcess);
      } else {
        // @ts-expect-error - helper is FlashLoanRedeemHelper when helperType is 'redeem'
        tx = await helper.redeemSharesWithCurveAndFlashLoanBorrow(sharesToProcess, applyRedeemSlippage(previewData.amount));
      }

      await tx.wait();

      await Promise.all([refreshBalances(), refreshVaultLimits()]);

      setInputValue('');
      setSharesToProcess(null);
      setEthToWrapValue('');
      setSuccess(`Successfully ${helperType === 'mint' ? 'minted' : 'redeemed'} leveraged tokens with flash loan!`);
    } catch (err: unknown) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        // Check if it's a contract revert without error data
        const isGenericRevert = (err as any)?.data === '0x' || (err as any)?.data === null || (err as any)?.reason === 'require(false)';

        if (isGenericRevert) {
          setError(
            `Contract execution failed. This may be due to: insufficient liquidity in Curve pool, flash loan provider lacks funds, or other contract conditions. Please try a smaller amount or contact support.`
          );
        } else {
          setError(`Failed to ${helperType} leveraged tokens with flash loan`);
        }
        console.error(`Failed to ${helperType} leveraged tokens with flash loan:`, err);
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

    if (!cleanedValue || cleanedValue === '' || cleanedValue === '.') {
      setSharesToProcess(null);
      return;
    }

    try {
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue)) {
        setSharesToProcess(null);
        return;
      }

      const parsed = parseUnits(cleanedValue, Number(sharesDecimals));
      setSharesToProcess(parsed);
    } catch {
      setSharesToProcess(null);
    }
  };

  const handleSetMax = () => {
    if (!maxAmount) return;
    handleInputChange(maxAmount);
  };

  const userBalance = helperType === 'mint' ? effectiveCollateralBalance : sharesBalance;
  const userBalanceToken = helperType === 'mint' ? formatTokenSymbol(collateralTokenSymbol) : sharesSymbol;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-2">
            Leveraged Tokens to {helperType === 'mint' ? 'Mint' : 'Redeem'}
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              name="shares"
              id="shares"
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
              <div className="text-gray-500 sm:text-sm">
                <TransitionLoader isLoading={!sharesSymbol}>
                  {sharesSymbol}
                </TransitionLoader>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          <span>Max Available:</span>
          <TransitionLoader isLoading={!maxAmount}>
            <NumberDisplay value={maxAmount} />{' '}{sharesSymbol}
          </TransitionLoader>
        </div>

        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          <span>Min Available:</span>
          <TransitionLoader isLoading={!minMint || !minRedeem}>
            {helperType === "mint" ?
              <NumberDisplay value={minMint} /> :
              <NumberDisplay value={minRedeem} />
            }
            {' '}{sharesSymbol}
          </TransitionLoader>
        </div>

        {isWstETHVault && helperType === 'mint' && (
          <>
            {useEthWrapToWSTETH && (
              <div>
                <p className="mt-1 text-xs text-gray-500">
                  ETH will be wrapped to wstETH before the flash loan mint
                </p>
                {previewedWstEthAmount && ethToWrapValue && (
                  <p className="mt-1 text-xs text-green-600">
                    → Will receive ~<NumberDisplay value={formatUnits(previewedWstEthAmount, collateralTokenDecimals)} /> wstETH from wrapping and use ~<NumberDisplay value={collateralTokenBalance} /> from balance
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Preview Section */}
        {!!sharesToProcess && sharesToProcess > 0n && previewData && !isErrorLoadingPreview && (
          <PreviewBox
            receive={receive}
            provide={provide}
            isLoading={isLoadingPreview}
            title="Transaction Preview"
          />
        )}

        {/* Preview Error */}
        {!!sharesToProcess && (isErrorLoadingPreview || invalidRebalanceMode) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                {invalidRebalanceMode
                  ? "Flash loan rebalance is currently unavailable for this amount."
                  : "Error loading preview."}
              </span>
            </div>
          </div>
        )}

        {/* Balance warning */}
        {hasInsufficientBalance && !!sharesToProcess && sharesToProcess > 0n && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-red-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Insufficient {userBalanceToken} balance. You have{' '}
                <NumberDisplay value={userBalance} /> {userBalanceToken}.
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !sharesToProcess ||
            sharesToProcess <= 0n ||
            sharesToProcess > parseUnits(maxAmount, sharesDecimals) ||
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
              ? `Approving ${helperType === 'mint' ? 'Collateral' : 'Leveraged Tokens'}...`
              : loading
                ? 'Processing...'
                : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : `${helperType === 'mint' ? 'Mint' : 'Redeem'} with Flash Loan`}
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

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          About Flash Loan {helperType === 'mint' ? 'Mint' : 'Redeem'}
        </h4>
        <p className="text-xs text-blue-800 mb-2">
          {helperType === 'mint'
            ? `Use a flash loan to mint leveraged tokens. You only need to provide the net collateral required. The flash loan covers the borrow amount temporarily during the transaction.${isWstETHVault ? ' For wstETH vaults, you can also use ETH which will be automatically wrapped to wstETH.' : ''}`
            : 'Use a flash loan to redeem leveraged tokens and swap them for borrow tokens via Curve. You only need to provide the net borrow tokens required. The flash loan helps unwind your leveraged position efficiently.'}
        </p>
        <p className="text-xs text-blue-700">
          💡 Tip: This is a more capital-efficient way to {helperType} leveraged tokens compared to the
          standard method.
        </p>
      </div>
    </div>
  );
}
