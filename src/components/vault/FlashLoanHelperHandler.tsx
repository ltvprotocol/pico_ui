import React, { useState, useEffect } from 'react';
import { parseUnits, parseEther, formatUnits } from 'ethers';
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
  WarningMessage,
  SuccessMessage
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
import { maxBigInt } from '@/utils';
import { ERC20__factory } from '@/typechain-types';

type HelperType = 'mint' | 'redeem';

interface FlashLoanHelperHandlerProps {
  helperType: HelperType;
}

const GAS_RESERVE_MULTIPLIER = 3n;
const GAS_RESERVE = GAS_RESERVE_WEI * GAS_RESERVE_MULTIPLIER;

const MINT_MAX_SLIPPAGE_DIVIDEND = 999999;
const MINT_MAX_SLIPPAGE_DIVIDER = 1000000;

const MINT_SLIPPAGE_DIVIDEND = 1000001;
const MINT_SLIPPAGE_DIVIDER = 1000000;

export default function FlashLoanHelperHandler({ helperType }: FlashLoanHelperHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [sharesToProcess, setSharesToProcess] = useState<bigint | null>(null);
  const [wrapError, setWrapError] = useState<string>('');
  const [wrapSuccess, setWrapSuccess] = useState<string>('');
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const [useEthWrapToWSTETH, setUseEthWrapToWSTETH] = useState(true);
  const [ethToWrapValue, setEthToWrapValue] = useState('');
  const [isWrapping, setIsWrapping] = useState(false);
  const [previewedWstEthAmount, setPreviewedWstEthAmount] = useState<bigint | null>(null);
  const [effectiveCollateralBalance, setEffectiveCollateralBalance] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minMint, setMinMint] = useState('');
  const [minRedeem, setMinRedeem] = useState('');

  const { address, provider, signer, publicProvider, currentNetwork } = useAppContext();

  const {
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
    borrowTokenDecimals,
    borrowTokenPrice: tokenPrice
  } = useVaultContext();

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
    mintHelper: flashLoanMintHelper,
    redeemHelper: flashLoanRedeemHelper,
    collateralTokenDecimals,
    sharesBalance,
    sharesDecimals,
  });

  const maxAmountUsd = useMaxAmountUsd({
    needConvertFromShares: true,
    maxAmount,
    tokenPrice,
    vaultLens,
    sharesDecimals,
    borrowTokenDecimals,
  });

  useEffect(() => {
    setInputValue('');
    setSharesToProcess(null);
    setMaxAmount('');

    setPreviewedWstEthAmount(null);
    setEthToWrapValue('');
    setEffectiveCollateralBalance('');
    setUseEthWrapToWSTETH(true);

    setHasInsufficientBalance(false);

    setWrapError('');
    setWrapSuccess('');
  }, [helperType]);

  const isInputMoreThanMax = useIsAmountMoreThanMax({
    amount: inputValue,
    max: maxAmount,
    decimals: Number(sharesDecimals)
  });

  const isMinMoreThanMax = useIsMinMoreThanMax({
    maxAmount,
    minMint,
    minRedeem,
    helperType,
    decimals: Number(sharesDecimals)
  });

  const isAmountLessThanMin = useIsAmountLessThanMin({
    amount: inputValue,
    decimals: Number(sharesDecimals),
    minMint,
    minRedeem,
    helperType,
  });

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

      const userMaxMint = clampToPositive(sharesFromCollateral + sharesFromEth - GAS_RESERVE);
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
      if (flashLoan.loading) return; // not calculate when processing to prevent wrong warnings

      const userSharesBalance = parseUnits(sharesBalance, Number(sharesDecimals));
      setHasInsufficientBalance(userSharesBalance < sharesToProcess);
      return;
    }

    let isEffectAborted = false;

    // Helper type is mint
    const determineRequiredWrapAmount = async () => {
      if (!useEthWrapToWSTETH || !isWstETHVault) {
        if (isEffectAborted) return;
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
        if (isEffectAborted) return;
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

      if (isEffectAborted) return;

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

    return () => {
      isEffectAborted = true;
    };
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

  const flashLoan = useFlashLoanAction({
    mode: helperType,
    currentNetwork: currentNetwork ?? '',
    userAddress: address ?? undefined,
    helperAddress: helperAddress ?? undefined,
    previewAmount: previewData?.amount,
    sharesAmount: sharesToProcess ?? undefined,
    refreshMins: loadMinAvailable
  });

  useEffect(() => {
    if (flashLoan.success) {
      setWrapSuccess('');
    }
  }, [flashLoan.success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !sharesToProcess || sharesToProcess <= 0n) return;

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
      setSharesToProcess(null);
      setEthToWrapValue('');
    }
  };

  const handleInputChange = (value: string) => {
    const { formattedValue, parsedValue } = processInput(value, Number(sharesDecimals));

    setInputValue(formattedValue);
    flashLoan.reset();

    setWrapError('');
    setWrapSuccess('');

    setSharesToProcess(parsedValue);
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
          <TransitionLoader isLoading={maxAmountUsd === null}>
            <div className="ml-2">
              ({formatUsdValue(maxAmountUsd)})
            </div>
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

        {!inputValue ? null : isInputMoreThanMax && !flashLoan.loading ? (
          <WarningMessage
            text="Entered amount higher than max"
          />
        ) : (isAmountLessThanMin || invalidRebalanceMode) && !flashLoan.loading ? (
          <WarningMessage
            text={`Not available to ${helperType} this amount right now, try again later`}
          />
        ) : hasInsufficientBalance && !flashLoan.loading && !isWrapping ? (
          <ErrorMessage
            text={`Insufficient ${userBalanceToken} balance. You have ${userBalance} ${userBalanceToken}.`}
          />
        ) : isErrorLoadingPreview ? (
          <ErrorMessage text="Error loading preview." />
        ) : sharesToProcess !== null && sharesToProcess > 0n && previewData ? (
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
            flashLoan.isApproving ||
            isWrapping ||
            !inputValue ||
            !sharesToProcess ||
            hasInsufficientBalance ||
            isErrorLoadingPreview ||
            invalidRebalanceMode ||
            isMinMoreThanMax ||
            isInputMoreThanMax ||
            isAmountLessThanMin
          }
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWrapping
            ? 'Wrapping ETH to wstETH...'
            : flashLoan.isApproving
              ? `Approving ${helperType === 'mint' ? 'Collateral' : 'Leveraged Tokens'}...`
              : flashLoan.loading
                ? 'Processing...'
                : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : `${helperType === 'mint' ? 'Mint' : 'Redeem'} with Flash Loan`}
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
