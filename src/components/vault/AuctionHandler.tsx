import React, { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers } from '@/utils';
import { renderWithTransition } from '@/helpers/renderWithTransition';
import { NumberDisplay } from '@/components/ui';

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

  const getTokenMetadata = (tokenType: 'borrow' | 'collateral') => {
    if (tokenType === 'borrow') {
      return {
        label: 'Borrow Assets',
        symbol: borrowTokenSymbol,
        decimals: Number(borrowTokenDecimals)
      };
    } else {
      return {
        label: 'Collateral Assets',
        symbol: collateralTokenSymbol,
        decimals: Number(collateralTokenDecimals)
      };
    }
  };

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
      return borrowTokenSymbol;
    } else {
      return collateralTokenSymbol;
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
      
      if (token && amount > 0n) {
        const currentAllowance = await token.allowance(address, vaultAddress);
        
        if (currentAllowance < amount) {
          const tx = await token.approve(vaultAddress, amount);
          await tx.wait();
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

    if (!vault || !address || !amount) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setApprovalError(null);

    try {
      await checkAndApproveRequiredAssets();

      let tx;

      if (auctionType === 'provide_borrow') {
        tx = await vault.executeAuctionCollateral(amount);
      } else if (auctionType === 'provide_collateral') {
        tx = await vault.executeAuctionBorrow(-amount);
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
    const cleanedValue = allowOnlyNumbers(value);
    setInputValue(cleanedValue);
    
    if (!cleanedValue || cleanedValue === '' || cleanedValue === '.') {
      setAmount(null);
      return;
    }

    try {
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue) || numValue <= 0) {
        setAmount(null);
        return;
      }

      const parsed = parseUnits(cleanedValue, decimals);
      setAmount(parsed);
    } catch (err) {
      setAmount(null);
    }
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
                className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
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
            Max Available: {renderWithTransition(
              maxValue !== null ? (
                <>
                  <NumberDisplay value={formatUnits(maxValue, decimals)} />
                  {' '}
                  {getSymbolForAuctionType()}
                </>
              ) : null,
              isLoadingMax
            )}
          </div>
        </div>

        {/* Preview Section */}
        {amount !== null && previewData && (
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-900">Auction Preview</h4>
            </div>
            
            {renderWithTransition(
              (() => {
                const { receive, provide } = getReceiveAndProvide();
                
                return (
                  <div className="space-y-4">
                    {receive.length > 0 && (
                      <div className="border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <p className="text-sm font-semibold text-green-800">Will be received</p>
                        </div>
                        <div className="space-y-2">
                          {receive.map((item, idx) => {
                            const metadata = getTokenMetadata(item.tokenType);
                            return (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">{metadata.label}:</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">
                                    <NumberDisplay value={formatUnits(item.amount, metadata.decimals)} />
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {metadata.symbol}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {provide.length > 0 && (
                      <div className="border border-orange-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
                          </svg>
                          <p className="text-sm font-semibold text-orange-800">Need to provide</p>
                        </div>
                        <div className="space-y-2">
                          {provide.map((item, idx) => {
                            const metadata = getTokenMetadata(item.tokenType);
                            return (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">{metadata.label}:</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-sm">
                                    <NumberDisplay value={formatUnits(item.amount, metadata.decimals)} />
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {metadata.symbol}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {receive.length === 0 && provide.length === 0 && (
                      <div className="text-center py-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">No changes required</p>
                      </div>
                    )}
                  </div>
                );
              })(),
              isLoadingPreview
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isApproving || amount === null || (amount !== null && maxValue !== null && amount > maxValue)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isApproving ? 'Approving Tokens...' : loading ? 'Processing...' : 'Execute Auction'}
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