import React, { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, formatTokenSymbol, processInput, applyGasSlippage } from '@/utils';
import { NumberDisplay, PreviewBox, TransitionLoader, ErrorMessage, SuccessMessage } from '@/components/ui';

interface AuctionHandlerProps {
  futureBorrowAssets: bigint | null;
  futureCollateralAssets: bigint | null;
}

export default function AuctionHandler({ futureBorrowAssets, futureCollateralAssets }: AuctionHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingMax, setIsLoadingMax] = useState(false);

  const [previewData, setPreviewData] = useState<{
    deltaBorrow?: bigint;
    deltaCollateral?: bigint;
  } | null>(null);

  const getReceiveAndProvide = () => {
    const receive: { amount: bigint; tokenType: 'borrow' | 'collateral' }[] = [];
    const provide: { amount: bigint; tokenType: 'borrow' | 'collateral' }[] = [];

    if (!amount || !previewData) {
      return { receive, provide };
    }

    const inputTokenType = auctionType === 'provide_borrow' ? 'borrow' : 'collateral';
    provide.push({ amount, tokenType: inputTokenType });

    const { deltaBorrow, deltaCollateral } = previewData;

    if (auctionType === 'provide_borrow') {
      if (deltaCollateral && deltaCollateral !== 0n) {
        const absAmount = deltaCollateral < 0n ? -deltaCollateral : deltaCollateral;
        receive.push({ amount: absAmount, tokenType: 'collateral' });
      }
    } else if (auctionType === 'provide_collateral') {
      if (deltaBorrow && deltaBorrow !== 0n) {
        const absAmount = deltaBorrow < 0n ? -deltaBorrow : deltaBorrow;
        receive.push({ amount: absAmount, tokenType: 'borrow' });
      }
    }

    return { receive, provide };
  };

  const [maxValue, setMaxValue] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState<number>(18);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const { address } = useAppContext();

  const {
    vault,
    vaultLens,
    borrowToken,
    collateralToken,
    vaultAddress,
    borrowTokenSymbol,
    borrowTokenDecimals,
    collateralTokenSymbol,
    collateralTokenDecimals,
    borrowTokenBalance,
    collateralTokenBalance,
    refreshBalances,
    refreshVaultLimits,
  } = useVaultContext();

  const auctionType =
    futureBorrowAssets && futureBorrowAssets > 0n
      ? 'provide_collateral'
      : 'provide_borrow';

  useEffect(() => {
    const newDecimals = getDecimalsForAuctionType();
    setDecimals(newDecimals);
    setInputValue('');
    setAmount(null);
    setError(null);
    setApprovalError(null);
    setSuccess(null);
    setPreviewData(null);
    setMaxValue(null);
    loadMaxValue();
  }, [auctionType, borrowTokenDecimals, collateralTokenDecimals, borrowTokenBalance, collateralTokenBalance, futureBorrowAssets, futureCollateralAssets]);

  const getDecimalsForAuctionType = () => {
    if (auctionType === 'provide_borrow') {
      return Number(borrowTokenDecimals);
    } else {
      return Number(collateralTokenDecimals);
    }
  };

  const getSymbolForAuctionType = () => {
    if (auctionType === 'provide_borrow') {
      return formatTokenSymbol(borrowTokenSymbol);
    } else {
      return formatTokenSymbol(collateralTokenSymbol);
    }
  };

  const getBalanceForAuctionType = () => {
    if (auctionType === 'provide_borrow') {
      return borrowTokenBalance;
    } else {
      return collateralTokenBalance;
    }
  };

  const loadMaxValue = async () => {
    if (!vaultLens || !futureBorrowAssets || !futureCollateralAssets) return;

    setIsLoadingMax(true);
    try {
      const userBalance = parseUnits(getBalanceForAuctionType(), decimals);

      let vaultNeeds: bigint;

      if (auctionType === 'provide_borrow') {
        vaultNeeds = futureBorrowAssets < 0n ? -futureBorrowAssets : 0n;
      } else if (auctionType === 'provide_collateral') {
        vaultNeeds = futureCollateralAssets > 0n ? futureCollateralAssets : 0n;
      } else {
        vaultNeeds = userBalance;
      }

      const max = userBalance < vaultNeeds ? userBalance : vaultNeeds;
      setMaxValue(max);
    } catch (err) {
      console.error('Error loading max value:', err);
    } finally {
      setIsLoadingMax(false);
    }
  };

  const loadPreview = async (previewAmount: bigint | null) => {
    if (!vaultLens || previewAmount === null) {
      setPreviewData(null);
      return;
    }

    setIsLoadingPreview(true);

    try {
      let result: bigint;

      console.log('Preview call:', { auctionType, previewAmount: previewAmount.toString() });

      if (auctionType === 'provide_borrow') {
        result = await vaultLens.previewExecuteAuctionCollateral(previewAmount);
        setPreviewData({
          deltaCollateral: result,
        });
      } else if (auctionType === 'provide_collateral') {
        result = await vaultLens.previewExecuteAuctionBorrow(-previewAmount);
        setPreviewData({
          deltaBorrow: result,
        });
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPreview(amount);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, auctionType]);

  const checkAndApproveRequiredAssets = async () => {
    if (!address || !vaultAddress || !amount) {
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      const token = auctionType === 'provide_borrow' ? borrowToken : collateralToken;
      const tokenSymbol = auctionType === 'provide_borrow' ? borrowTokenSymbol : collateralTokenSymbol;

      if (token && amount > 0n) {
        const currentAllowance = await token.allowance(address, vaultAddress);

        if (currentAllowance < amount) {
          const tx = await token.approve(vaultAddress, amount);
          await tx.wait();
          setSuccess(`Successfully approved ${formatTokenSymbol(tokenSymbol)}.`);
        } else {
          setSuccess(`Already approved ${formatTokenSymbol(tokenSymbol)}.`);
        }
      }
    } catch (err) {
      if (isUserRejected(err)) {
        setApprovalError('Approval canceled by user.');
      } else {
        setApprovalError('Failed to approve required tokens.');
        console.error('Failed to approve required tokens:', err);
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vault || !vaultLens || !address || !amount) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setApprovalError(null);

    try {
      await checkAndApproveRequiredAssets();

      let tx;

      if (auctionType === 'provide_borrow') {
        const estimatedGas = await vaultLens.executeAuctionCollateral.estimateGas(amount);
        tx = await vault.executeAuctionCollateral(amount, { gasLimit: applyGasSlippage(estimatedGas) });
      } else if (auctionType === 'provide_collateral') {
        const estimatedGas = await vaultLens.executeAuctionBorrow.estimateGas(-amount);
        tx = await vault.executeAuctionBorrow(-amount, { gasLimit: applyGasSlippage(estimatedGas) });
      } else {
        throw new Error('Invalid auction type');
      }

      await tx.wait();

      await Promise.all([
        refreshBalances(),
        refreshVaultLimits()
      ]);

      setInputValue('');
      setAmount(null);
      setSuccess('Auction executed successfully!');
      loadMaxValue();
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to execute auction.');
        console.error('Failed to execute auction:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (maxValue !== null) {
      const formatted = formatUnits(maxValue, decimals);
      setInputValue(formatted);
      setAmount(maxValue);
    }
  };

  const getInputLabel = () => {
    if (auctionType === 'provide_borrow') {
      return 'Borrow Assets to Provide';
    } else {
      return 'Collateral Assets to Provide';
    }
  };

  const handleInputChange = (value: string) => {
    const { formattedValue, parsedValue } = processInput(value, decimals);

    setInputValue(formattedValue);
    setAmount(parsedValue);

    setError(null);
    setSuccess(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            {getInputLabel()}
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              name="amount"
              id="amount"
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
                onClick={handleMaxClick}
                className="bg-transparent text-sm text-indigo-600 hover:text-indigo-500 mr-2"
                disabled={loading || !maxValue}
              >
                MAX
              </button>
              <span className="text-gray-500 sm:text-sm">
                {getSymbolForAuctionType()}
              </span>
            </div>
          </div>
          <div className="flex gap-1 mt-1 text-sm text-gray-500">
            <span>Max Available:</span>
            <TransitionLoader isLoading={isLoadingMax}>
              {maxValue !== null ? (
                <>
                  <NumberDisplay value={formatUnits(maxValue, decimals)} />
                  {' '}
                  {getSymbolForAuctionType()}
                </>
              ) : null}
            </TransitionLoader>
          </div>
        </div>

        {/* Preview Section */}
        {amount !== null && previewData && (() => {
          const { receive, provide } = getReceiveAndProvide();
          return (
            <PreviewBox
              receive={receive}
              provide={provide}
              isLoading={isLoadingPreview}
              title="Auction Preview"
            />
          );
        })()}

        <button
          type="submit"
          disabled={loading || isApproving || amount === null || (amount !== null && maxValue !== null && amount > maxValue)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isApproving ? 'Approving Tokens...' : loading ? 'Processing...' : 'Execute Auction'}
        </button>

        {approvalError && (
          <ErrorMessage text={approvalError} />
        )}

        {error && (
          <ErrorMessage text={error} />
        )}

        {success && (
          <SuccessMessage text={success} />
        )}
      </form>
    </div>
  );
}