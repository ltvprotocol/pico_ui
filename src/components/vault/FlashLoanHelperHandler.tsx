import React, { useState, useEffect } from 'react';
import { parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers } from '@/utils';
import { PreviewBox, NumberDisplay } from '@/components/ui';
import { useFlashLoanPreview } from '@/hooks';

type HelperType = 'mint' | 'redeem';

interface FlashLoanHelperHandlerProps {
  helperType: HelperType;
}

// fixed slippage for redeem, 0.1%
const SLIPPAGE_DIVIDEND = 999;
const SLIPPAGE_DIVIDER=1000;

export default function FlashLoanHelperHandler({ helperType }: FlashLoanHelperHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [sharesToProcess, setSharesToProcess] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const { address } = useAppContext();

  const {
    vault,
    flashLoanMintHelper,
    flashLoanRedeemHelper,
    flashLoanMintHelperAddress,
    flashLoanRedeemHelperAddress,
    collateralToken,
    sharesSymbol,
    sharesDecimals,
    sharesBalance,
    collateralTokenSymbol,
    collateralTokenDecimals,
    collateralTokenBalance,
    refreshBalances,
    refreshVaultLimits,
  } = useVaultContext();

  const helper = helperType === 'mint' ? flashLoanMintHelper : flashLoanRedeemHelper;
  const helperAddress = helperType === 'mint' ? flashLoanMintHelperAddress : flashLoanRedeemHelperAddress;

  const { isLoadingPreview, previewData, hasInsufficientBalance, receive, provide } = useFlashLoanPreview({
    sharesToProcess,
    helperType,
    helper,
    collateralTokenBalance,
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
  }, [helperType]);

  const applySlippage = (amount: bigint) => {
    return amount * BigInt(SLIPPAGE_DIVIDEND) / BigInt(SLIPPAGE_DIVIDER);
  }

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
      await checkAndApproveToken();

      let tx;
      if (helperType === 'mint') {
        // @ts-expect-error - helper is FlashLoanMintHelper when helperType is 'mint'
        tx = await helper.mintSharesWithFlashLoanCollateral(sharesToProcess);
      } else {
        // @ts-expect-error - helper is FlashLoanRedeemHelper when helperType is 'redeem'
        tx = await helper.redeemSharesWithCurveAndFlashLoanBorrow(sharesToProcess, applySlippage(previewData.amount));
      }

      await tx.wait();

      await Promise.all([refreshBalances(), refreshVaultLimits()]);

      setInputValue('');
      setSharesToProcess(null);
      setSuccess(`Successfully ${helperType === 'mint' ? 'minted' : 'redeemed'} shares with flash loan!`);
    } catch (err: any) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        // Check if it's a contract revert without error data
        const isGenericRevert = err?.data === '0x' || err?.data === null || err?.reason === 'require(false)';
        
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
    } catch (err) {
      setSharesToProcess(null);
    }
  };

  const userBalance = helperType === 'mint' ? collateralTokenBalance : sharesBalance;
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
          disabled={loading || isApproving || sharesToProcess === null || sharesToProcess <= 0n || hasInsufficientBalance}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApproving
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
            ? 'Use a flash loan to mint vault shares. You only need to provide the net collateral required. The flash loan covers the borrow amount temporarily during the transaction.'
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
