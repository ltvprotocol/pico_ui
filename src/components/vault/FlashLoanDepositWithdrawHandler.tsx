import React, { useState, useEffect } from 'react';
import { parseUnits, parseEther, formatUnits, formatEther } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import {
  isWstETHAddress,
  minBigInt,
  clampToPositive,
  formatTokenSymbol,
  formatUsdValue,
  wrapEthToWstEth,
  calculateEthWrapForFlashLoan,
  processInput
} from '@/utils';
import {
  PreviewBox,
  NumberDisplay,
  TransitionLoader,
  ErrorMessage,
  SuccessMessage,
  WarningMessage
} from '@/components/ui';
import {
  useAdaptiveInterval,
  useFlashLoanPreview,
  useMaxAmountUsd,
  useIsAmountMoreThanMax,
  useIsMinMoreThanMax,
  useIsAmountLessThanMin,
  useFlashLoanAction
} from '@/hooks';
import { GAS_RESERVE_WEI } from '@/constants';
import { findSharesForEthWithdraw } from '@/utils/findSharesForAmount';
import { maxBigInt } from '@/utils';
import { ERC20__factory } from '@/typechain-types';

type ActionType = 'deposit' | 'withdraw';

interface FlashLoanDepositWithdrawHandlerProps {
  actionType: ActionType;
}

const GAS_RESERVE_MULTIPLIER = 3n;
const GAS_RESERVE = GAS_RESERVE_WEI * GAS_RESERVE_MULTIPLIER;

const MINT_SLIPPAGE_DIVIDEND = 1000001;
const MINT_SLIPPAGE_DIVIDER = 1000000;

const FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDEND = 99999;
const FLASH_LOAN_DEPOSIT_WITHDRAW_PRECISION_DIVIDER = 100000;

export default function FlashLoanDepositWithdrawHandler({ actionType }: FlashLoanDepositWithdrawHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [estimatedShares, setEstimatedShares] = useState<bigint | null>(null);
  const [wrapError, setWrapError] = useState<string>('');
  const [wrapSuccess, setWrapSuccess] = useState<string>('');
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const [useEthWrapToWSTETH, setUseEthWrapToWSTETH] = useState(true);
  const [ethToWrapValue, setEthToWrapValue] = useState('');
  const [isWrapping, setIsWrapping] = useState(false);
  const [previewedWstEthAmount, setPreviewedWstEthAmount] = useState<bigint | null>(null);
  const [maxAmount, setMaxAmount] = useState('');
  const [isMaxWithdraw, setIsMaxWithdraw] = useState(false);
  const [minDeposit, setMinDeposit] = useState('');
  const [minWithdraw, setMinWithdraw] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const { address, provider, signer, publicProvider, currentNetwork } = useAppContext();

  const {
    vaultLens,
    vaultAddress,
    flashLoanMintHelperLens,
    flashLoanRedeemHelperLens,
    flashLoanMintHelperAddress,
    flashLoanRedeemHelperAddress,
    collateralToken,
    collateralTokenAddress,
    sharesDecimals,
    sharesBalance,
    collateralTokenSymbol,
    collateralTokenDecimals,
    collateralTokenBalance,
    ethBalance,
    refreshBalances,
    borrowTokenSymbol,
    sharesSymbol,
    borrowTokenPrice
  } = useVaultContext();

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
    mintHelperLens: flashLoanMintHelperLens,
    redeemHelperLens: flashLoanRedeemHelperLens,
    collateralTokenDecimals,
    sharesBalance,
    sharesDecimals,
  });

  const rawInputSymbol = actionType === 'deposit' ? (isWstETHVault ? 'ETH' : collateralTokenSymbol) : borrowTokenSymbol;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const inputSymbol = formatTokenSymbol(rawInputSymbol);

  const maxAmountUsd = useMaxAmountUsd({
    needConvertFromShares: false,
    maxAmount,
    tokenPrice: borrowTokenPrice,
  });

  useEffect(() => {
    setInputValue('');
    setIsMaxWithdraw(false);
    setMaxAmount('');

    setEstimatedShares(null);
    setPreviewedWstEthAmount(null);
    setEthToWrapValue('');

    setHasInsufficientBalance(false);

    setIsWrapping(false);

    setWrapError('');
    setWrapSuccess('');

    // Something very ugly here, should be rewrited in future
    setUseEthWrapToWSTETH(true);

    setShowWarning(false);
  }, [actionType]);

  const isInputMoreThanMax = useIsAmountMoreThanMax({
    amount: inputValue,
    max: maxAmount,
    decimals: 18 // 100% sure for ETH and WETH
  });

  const isMinMoreThanMax = useIsMinMoreThanMax({
    maxAmount,
    minDeposit,
    minWithdraw,
    actionType,
    decimals: 18 // 100% sure for ETH and WETH
  });

  const isAmountLessThanMin = useIsAmountLessThanMin({
    amount: inputValue,
    minDeposit,
    minWithdraw,
    actionType,
    decimals: 18 // 100% sure for ETH and WETH
  });

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

  const calculateShares = async () => {
    if (!inputValue || !vaultLens) {
      setEstimatedShares(null);
      setShowWarning(false);
      return;
    }

    try {
      const inputAmount = parseUnits(inputValue, 18); // TODO: Dynamically fetch

      if (inputAmount <= 0n) {
        setEstimatedShares(null);
        return;
      }

      if (actionType === 'deposit') {
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

        if (!flashLoanRedeemHelperLens) return;

        let shares = await findSharesForEthWithdraw({
          amount: inputAmount,
          helper: flashLoanRedeemHelperLens,
          vaultLens
        });

        if (!shares) {
          setShowWarning(true);
          setEstimatedShares(null);
          return;
        }

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
  }, [inputValue, actionType, vaultLens, flashLoanRedeemHelperLens, publicProvider, isMaxWithdraw]);

  const setMaxDeposit = async () => {
    if (!vaultLens) return;

    const rawEthBalance = parseEther(ethBalance);
    const sharesFromEth = await vaultLens.convertToShares(rawEthBalance);
    const userMaxMint = clampToPositive(sharesFromEth - GAS_RESERVE);
    const vaultMaxMint = await vaultLens.maxLowLevelRebalanceShares();

    const maxMint = minBigInt(userMaxMint, vaultMaxMint);
    const maxDeposit = await vaultLens.convertToAssets(maxMint);
    const formattedMaxDeposit = formatEther(maxDeposit);

    setMaxAmount(formattedMaxDeposit);
  };

  const setMaxWithdraw = async () => {
    if (!flashLoanRedeemHelperLens || !sharesBalance) {
      setMaxAmount('0');
      return;
    }

    try {
      const rawShares = parseUnits(sharesBalance, Number(sharesDecimals));
      const maxWeth = await flashLoanRedeemHelperLens.previewRedeemSharesWithCurveAndFlashLoanBorrow(rawShares);
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
  }, [actionType, ethBalance, collateralTokenBalance, sharesBalance, isWstETHVault, sharesDecimals]);

  useEffect(() => {
    // Reset state if input is empty or invalid
    if (!inputValue || !estimatedShares || estimatedShares <= 0n) {
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
      if (flashLoan.loading) return; // not calculate when processing to prevent wrong warnings
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

  const flashLoan = useFlashLoanAction({
    mode: actionType,
    currentNetwork: currentNetwork ?? '',
    userAddress: address ?? undefined,
    helperAddress: helperAddress ?? undefined,
    previewAmount: previewData?.amount,
    sharesAmount: estimatedShares ?? undefined,
    refreshMins: loadMinAvailable
  });

  useEffect(() => {
    if (flashLoan.success) {
      setWrapSuccess('');
    }
  }, [flashLoan.success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !estimatedShares || estimatedShares <= 0n) return;

    setWrapError('');
    setWrapSuccess('');

    // If using ETH input for wstETH vault, wrap ETH to wstETH first
    if (useEthWrapToWSTETH && isWstETHVault && ethToWrapValue && provider && signer) {
      setIsWrapping(true);
      const ethAmount = parseEther(ethToWrapValue);

      const wrapResult = await wrapEthToWstEth(
        provider,
        signer,
        ethAmount,
        address,
        setWrapSuccess,
        setWrapError
      );

      setIsWrapping(false);

      if (!wrapResult) {
        return; // Error already set by wrapEthToWstEth
      }

      // Refresh balances to get updated wstETH balance
      await refreshBalances();
    }

    const success = await flashLoan.execute();

    if (success) {
      setInputValue('');
      setEstimatedShares(null);
      setEthToWrapValue('');
    }
  };

  const handleInputChange = (value: string) => {
    setShowWarning(false);
    setIsMaxWithdraw(false);
    const { formattedValue } = processInput(value);

    setInputValue(formattedValue);
    flashLoan.reset();

    setWrapError('');
    setWrapSuccess('');
  };

  const handleSetMax = () => {
    if (!maxAmount) return;
    handleInputChange(maxAmount);
    if (actionType == "withdraw") {
      setIsMaxWithdraw(true);
    }
  };

  const handlePercentage = (percentage: bigint) => {
    if (!maxAmount) return;
    const rawMax = parseEther(maxAmount);
    const amount = rawMax * percentage / 100n;
    handleInputChange(formatEther(amount));
    setIsMaxWithdraw(false);
  };

  const userBalance = actionType === 'deposit' ? collateralTokenBalance : sharesBalance;
  const userBalanceToken = actionType === 'deposit' ? formatTokenSymbol(collateralTokenSymbol) : sharesSymbol;

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
              disabled={flashLoan.loading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={handleSetMax}
                className="bg-transparent text-sm text-indigo-600 hover:text-indigo-500 mr-2"
                disabled={flashLoan.loading || !maxAmount}
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">{inputSymbol}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {[25, 50, 75].map((percentage) => (
              <button
                key={percentage}
                type="button"
                onClick={() => handlePercentage(BigInt(percentage))}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                disabled={flashLoan.loading || !maxAmount}
              >
                {percentage}%
              </button>
            ))}
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
          <TransitionLoader isLoading={maxAmountUsd === null}>
            <div className="ml-2">
              ({formatUsdValue(maxAmountUsd)})
            </div>
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

        {!inputValue ? null :
          isInputMoreThanMax && !flashLoan.loading && !isWrapping ?
            (
              <WarningMessage
                text="Entered amount higher than max"
              />
            ) : (isAmountLessThanMin || invalidRebalanceMode || showWarning) && !flashLoan.loading ? (
              <WarningMessage
                text={`Not available to ${actionType} this amount right now, try again later`}
              />
            ) : hasInsufficientBalance && !flashLoan.loading && !isWrapping ? (
              <ErrorMessage
                text={`Insufficient ${userBalanceToken} balance. You have ${userBalance} ${userBalanceToken}.`}
              />
            ) : isErrorLoadingPreview ? (
              <ErrorMessage text="Error loading preview." />
            ) : estimatedShares !== null && estimatedShares > 0n && previewData && !!inputValue ? (
              <PreviewBox
                receive={receive}
                provide={provide}
                isLoading={isLoadingPreview}
                title="Transaction Preview"
              />
            ) : null}

        <button
          type="submit"
          disabled={
            flashLoan.loading ||
            !inputValue ||
            !estimatedShares ||
            estimatedShares <= 0n ||
            flashLoan.isApproving ||
            isWrapping ||
            hasInsufficientBalance ||
            isErrorLoadingPreview ||
            invalidRebalanceMode ||
            isInputMoreThanMax ||
            isMinMoreThanMax ||
            isAmountLessThanMin
          }
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWrapping
            ? 'Wrapping ETH to wstETH...'
            : flashLoan.isApproving
              ? 'Approving Tokens...'
              : flashLoan.loading
                ? 'Processing...'
                : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : `${actionType === 'deposit' ? 'Deposit' : 'Withdraw'}`}
        </button>
        {/*
          Error messages - priority:
          1. flashLoan.approvalError
          2. flashLoan.error
          3. wrapError
        */}
        {(flashLoan.approvalError || flashLoan.error || wrapError) && (
          <ErrorMessage
            text={
              flashLoan.approvalError
                ? flashLoan.approvalError
                : flashLoan.error
                  ? flashLoan.error
                  : wrapError
            }
          />
        )}
        {/*
          Success messages - show only if there are no errors
          Priority:
          1. wrapSuccess
          2. flashLoan.success
        */}
        {!(flashLoan.approvalError || flashLoan.error || wrapError) && (wrapSuccess || flashLoan.success) && (
          <SuccessMessage
            text={flashLoan.success ? flashLoan.success : wrapSuccess}
          />
        )}
      </form>
    </div>
  );
}
