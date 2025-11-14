import React, { useState, useEffect } from 'react';
import { parseUnits, parseEther, formatUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers, isWstETHAddress, wrapEthToWstEth, calculateEthWrapForFlashLoan } from '@/utils';
import { PreviewBox, NumberDisplay } from '@/components/ui';
import { useFlashLoanPreview } from '@/hooks';
import { GAS_RESERVE_WEI } from '@/constants';
import { renderWithTransition } from '@/helpers/renderWithTransition';

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
const MINT_SLIPPAGE_DIVIDER =  1000000;

export default function FlashLoanHelperHandler({ helperType }: FlashLoanHelperHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [sharesToProcess, setSharesToProcess] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
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


  const { address, provider, signer } = useAppContext();

  const {
    vault,
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
    maxLowLevelRebalanceShares,
    refreshBalances,
    refreshVaultLimits,
  } = useVaultContext();

  const helper = helperType === 'mint' ? flashLoanMintHelper : flashLoanRedeemHelper;
  const helperAddress = helperType === 'mint' ? flashLoanMintHelperAddress : flashLoanRedeemHelperAddress;

  // Check if this is a wstETH vault that supports ETH input
  const isWstETHVault = helperType === 'mint' && collateralToken && isWstETHAddress(collateralTokenAddress || '');

  const { isLoadingPreview, previewData, receive, provide } = useFlashLoanPreview({
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


  useEffect(() => {
    if (helperType === 'mint') {
      const maxLowLevelRebalanceSharesUnits = parseUnits(maxLowLevelRebalanceShares, sharesDecimals);
      const maxMint = applyMaxMintSlippage(maxLowLevelRebalanceSharesUnits);
      setMaxAmount(formatUnits(maxMint, sharesDecimals));
    } else {
      setMaxAmount(sharesBalance);
    }
    setIsDisabled(loading || !sharesToProcess || sharesToProcess > parseUnits(maxAmount, sharesDecimals));
  }, [maxLowLevelRebalanceShares, sharesBalance, helperType, sharesToProcess]);

  useEffect(() => {
    const determineRequiredWrapAmount = async () => {
      if (!useEthWrapToWSTETH || !isWstETHVault) {
        setPreviewedWstEthAmount(null);
        setEthToWrapValue('');
        return;
      }

      if (!sharesToProcess || sharesToProcess <= 0n) {
        setPreviewedWstEthAmount(null);
        setEthToWrapValue('');
        return;
      }

      setSuccess(null);
      setError(null);

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

        setHasInsufficientBalance(parseUnits(collateralTokenBalance, Number(collateralTokenDecimals)) < previewData?.amount!);
      }
    };

    if (helperType === 'redeem') {
      const userSharesBalance = parseUnits(sharesBalance, Number(sharesDecimals));
      setHasInsufficientBalance(userSharesBalance < sharesToProcess!);
      if (sharesToProcess && sharesToProcess > 0n) {
        setSuccess(null);
        setError(null)
      }
      return;
    } else {
      determineRequiredWrapAmount();
    }
  }, [previewData]);

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
          setSuccess(`Successfully approved ${collateralTokenSymbol}.`);
        } else {
          setSuccess(`Already approved ${collateralTokenSymbol}.`);
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
        const tokenName = helperType === 'mint' ? 'collateral token' : 'shares';
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
      setSuccess(`Successfully ${helperType === 'mint' ? 'minted' : 'redeemed'} shares with flash loan!`);
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
          setError(`Failed to ${helperType} shares with flash loan`);
        }
        console.error(`Failed to ${helperType} shares with flash loan:`, err);
      }
    } finally {
      setLoading(false);
      setIsWrapping(false);
    }
  };

  const handleInputChange = (value: string) => {
    const cleanedValue = allowOnlyNumbers(value);
    setInputValue(cleanedValue);

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

  const userBalance = helperType === 'mint' ? effectiveCollateralBalance : sharesBalance;
  const userBalanceToken = helperType === 'mint' ? collateralTokenSymbol : sharesSymbol;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-2">
            Shares to {helperType === 'mint' ? 'Mint' : 'Redeem'}
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              name="shares"
              id="shares"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete="off"
              className="block w-full pr-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="0.0"
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-500 sm:text-sm">{sharesSymbol}</span>
            </div>
          </div>
        </div>


        <div className="flex gap-1 mt-1 text-sm text-gray-500">
          Max Available: {renderWithTransition(
            <>
              <NumberDisplay value={maxAmount} />
              {' '}
              {sharesSymbol}
            </>,
            !maxAmount
          )}
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
        {sharesToProcess !== null && sharesToProcess > 0n && previewData && (
          <PreviewBox
            receive={receive}
            provide={provide}
            isLoading={isLoadingPreview}
            title="Transaction Preview"
          />
        )}

        {/* Balance warning */}
        {hasInsufficientBalance && sharesToProcess !== null && sharesToProcess > 0n && (
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
          disabled={isDisabled || isApproving || isWrapping || sharesToProcess === null || sharesToProcess <= 0n || hasInsufficientBalance}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWrapping
            ? 'Wrapping ETH to wstETH...'
            : isApproving
              ? `Approving ${helperType === 'mint' ? 'Collateral' : 'Shares'}...`
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
            ? `Use a flash loan to mint vault shares. You only need to provide the net collateral required. The flash loan covers the borrow amount temporarily during the transaction.${isWstETHVault ? ' For wstETH vaults, you can also use ETH which will be automatically wrapped to wstETH.' : ''}`
            : 'Use a flash loan to redeem vault shares and swap them for borrow tokens via Curve. You only need to provide the net borrow tokens required. The flash loan helps unwind your leveraged position efficiently.'}
        </p>
        <p className="text-xs text-blue-700">
          💡 Tip: This is a more capital-efficient way to {helperType} shares compared to the
          standard method.
        </p>
      </div>
    </div>
  );
}
