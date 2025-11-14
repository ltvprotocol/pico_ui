import React, { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { isUserRejected, allowOnlyNumbers } from '@/utils';
import { renderWithTransition } from '@/helpers/renderWithTransition';
import { NumberDisplay, PreviewBox } from '@/components/ui';
import { TokenType } from '@/types/actions';

type ActionType = 'mint' | 'burn' | 'provide' | 'receive';

interface LowLevelRebalanceHandlerProps {
  rebalanceType: TokenType;
  actionType: ActionType;
}

export default function LowLevelRebalanceHandler({ rebalanceType, actionType }: LowLevelRebalanceHandlerProps) {
  const [inputValue, setInputValue] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isLoadingMax, setIsLoadingMax] = useState(false);

  const [previewData, setPreviewData] = useState<{
    deltaCollateral?: bigint;
    deltaBorrow?: bigint;
    deltaShares?: bigint;
  } | null>(null);

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
    sharesSymbol,
    sharesDecimals,
    borrowTokenSymbol,
    borrowTokenDecimals,
    collateralTokenSymbol,
    collateralTokenDecimals,
    borrowTokenBalance,
    collateralTokenBalance,
    refreshBalances,
    refreshVaultLimits,
  } = useVaultContext();

  useEffect(() => {
    const newDecimals = 
      rebalanceType === 'shares' ? Number(sharesDecimals) : 
      rebalanceType === 'borrow' ? Number(borrowTokenDecimals) : 
      Number(collateralTokenDecimals);
    
    setDecimals(newDecimals || 18);
    setInputValue('');
    setAmount(null);
    setError(null);
    setApprovalError(null);
    setSuccess(null);
    setPreviewData(null);
    setMaxValue(null);
    loadMaxValue();
  }, [rebalanceType, actionType, sharesDecimals, borrowTokenDecimals, collateralTokenDecimals, borrowTokenBalance, collateralTokenBalance]);

  const loadMaxValue = async () => {
    if (!vaultLens) return;

    setIsLoadingMax(true);

    try {
      let max: bigint;
      
      if (rebalanceType === 'shares') {
        max = await vaultLens.maxLowLevelRebalanceShares();
      } else {
        let vaultMax;
        let userBalance;

        if (rebalanceType === 'borrow') {
          vaultMax = await vaultLens.maxLowLevelRebalanceBorrow();
          userBalance = parseUnits(borrowTokenBalance, Number(borrowTokenDecimals));
        } else {
          vaultMax = await vaultLens.maxLowLevelRebalanceCollateral();
          userBalance = parseUnits(collateralTokenBalance, Number(collateralTokenDecimals));
        }

        const isVaultProvideDirection = vaultMax < 0n;
        const isUserProvideAction = actionType === 'provide';
        
        if (isVaultProvideDirection !== isUserProvideAction) {
          max = 0n;
        } else if (vaultMax < 0n) {
          max = vaultMax > -userBalance ? vaultMax : -userBalance;
        } else {
          max = vaultMax < userBalance ? vaultMax : userBalance;
        }
      }

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
      let result: any;

      if (rebalanceType === 'shares') {
        result = await vaultLens.previewLowLevelRebalanceShares(previewAmount);
        setPreviewData({
          deltaCollateral: result[0],
          deltaBorrow: result[1],
        });
      } else if (rebalanceType === 'borrow') {
        result = await vaultLens.previewLowLevelRebalanceBorrow(previewAmount);
        setPreviewData({
          deltaCollateral: result[0],
          deltaShares: result[1],
        });
      } else {
        result = await vaultLens.previewLowLevelRebalanceCollateral(previewAmount);
        setPreviewData({
          deltaBorrow: result[0],
          deltaShares: result[1],
        });
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // TODO: Thinnk what to do with timeout. Should we use adaptive interval?
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPreview(amount);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [amount, rebalanceType]);

  const checkAndApproveRequiredAssets = async () => {
    if (!previewData || !address || !vaultAddress) {
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      const { provide, } = getReceiveAndProvide();

      if (provide.length === 0) {
        return;
      }
      
      let anyApproved = false;
      let allAlreadyApproved = true;
      
      for (const item of provide) {
        if (item.tokenType === 'shares') {
          continue;
        }

        const metadata = getTokenMetadata(item.tokenType);
        const token = metadata.token;

        if (token) {
          const currentAllowance = await token.allowance(address, vaultAddress);
          
          if (currentAllowance < item.amount) {
            const tx = await token.approve(vaultAddress, item.amount);
            await tx.wait();
            anyApproved = true;
            allAlreadyApproved = false;
            setSuccess(`Successfully approved ${metadata.symbol}.`);
          }
        }
      }
      
      if (allAlreadyApproved && !anyApproved) {
        setSuccess('All tokens already approved.');
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

      if (rebalanceType === 'shares') {
        tx = await vault.executeLowLevelRebalanceShares(amount);
      } else if (rebalanceType === 'borrow') {
        const preview = await vaultLens.previewLowLevelRebalanceBorrow(amount);
        const deltaShares = preview?.[1] as bigint | undefined;

        if (!deltaShares) {
          console.error("Failed to preview shares delta");
          setError("Failed to preview shares delta");
          return;
        }

        const isSharesPositiveHint = deltaShares >= 0n;
        tx = await vault.executeLowLevelRebalanceBorrowHint(amount, isSharesPositiveHint);
      } else {
        const preview = await vaultLens.previewLowLevelRebalanceCollateral(amount);
        const deltaShares = preview?.[1] as bigint | undefined;
        
        if (!deltaShares) {
          console.error("Failed to preview shares delta");
          setError("Failed to preview shares delta");
          return;
        }

        const isSharesPositiveHint = deltaShares >= 0n;
        tx = await vault.executeLowLevelRebalanceCollateralHint(amount, isSharesPositiveHint);
      }

      await tx.wait();

      await Promise.all([
        refreshBalances(),
        refreshVaultLimits()
      ]);

      setInputValue('');
      setAmount(null);
      setSuccess('Low level rebalance executed successfully!');
      loadMaxValue();
    } catch (err) {
      if (isUserRejected(err)) {
        setError('Transaction canceled by user.');
      } else {
        setError('Failed to execute low level rebalance.');
        console.error('Failed to execute low level rebalance:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (maxValue !== null) {
      const absValue = maxValue < 0n ? -maxValue : maxValue;
      const formatted = formatUnits(absValue, decimals);
      setInputValue(formatted);
      const sign = getAmountSign();
      setAmount(absValue * sign);
    }
  };

  const getInputLabel = () => {
    if (rebalanceType === 'shares') return 'Shares Amount';
    if (rebalanceType === 'borrow') return 'Borrow Assets Amount';
    return 'Collateral Assets Amount';
  };

  const getInputSymbol = () => {
    if (rebalanceType === 'shares') return sharesSymbol;
    if (rebalanceType === 'borrow') return borrowTokenSymbol;
    return collateralTokenSymbol;
  };

  const getTokenMetadata = (tokenType: TokenType) => {
    if (tokenType === 'collateral') {
      return {
        decimals: Number(collateralTokenDecimals),
        symbol: collateralTokenSymbol,
        label: 'Collateral Assets',
        token: collateralToken
      };
    } else if (tokenType === 'borrow') {
      return {
        decimals: Number(borrowTokenDecimals),
        symbol: borrowTokenSymbol,
        label: 'Borrow Assets',
        token: borrowToken
      };
    } else {
      return {
        decimals: Number(sharesDecimals),
        symbol: sharesSymbol,
        label: 'Shares',
        token: null
      };
    }
  };

  // Convert action type to the correct sign for the amount
  const getAmountSign = (): bigint => {
    if (rebalanceType === 'shares') {
      return actionType === 'mint' ? 1n : -1n;
    } else if (rebalanceType === 'collateral') {
      return actionType === 'provide' ? 1n : -1n;
    } else { // borrow
      return actionType === 'provide' ? -1n : 1n;
    }
  };

  const getReceiveAndProvide = () => {
    if (!previewData) return { receive: [], provide: [] };

    const receive: Array<{ amount: bigint; tokenType: TokenType }> = [];
    const provide: Array<{ amount: bigint; tokenType: TokenType }> = [];

    const addToList = (
      value: bigint | undefined,
      tokenType: TokenType,
      invertSign: boolean = false
    ) => {
      if (!value || value === 0n) return;
      
      const isPositive = invertSign ? value < 0n : value > 0n;
      const absValue = value < 0n ? -value : value;
      
      if (isPositive) {
        provide.push({ amount: absValue, tokenType });
      } else {
        receive.push({ amount: absValue, tokenType });
      }
    };

    if (amount !== null && amount !== 0n) {
      const isInputPositive = 
        rebalanceType === 'shares' ? amount > 0n :
        rebalanceType === 'borrow' ? amount < 0n :
        amount > 0n;
      
      const absAmount = amount < 0n ? -amount : amount;
      
      if (isInputPositive) {
        (rebalanceType === 'shares' ? receive : provide).push({ 
          amount: absAmount, 
          tokenType: rebalanceType 
        });
      } else {
        (rebalanceType === 'shares' ? provide : receive).push({ 
          amount: absAmount, 
          tokenType: rebalanceType 
        });
      }
    }

    const { deltaCollateral, deltaBorrow, deltaShares } = previewData;

    if (rebalanceType === 'shares') {
      addToList(deltaCollateral, 'collateral');
      addToList(deltaBorrow, 'borrow', true);
    } else if (rebalanceType === 'borrow') {
      addToList(deltaCollateral, 'collateral', false);
      addToList(deltaShares, 'shares', true);
    } else { // collateral
      addToList(deltaBorrow, 'borrow', true);
      addToList(deltaShares, 'shares', true);
    }

    return { receive, provide };
  };

  const handleInputChange = (value: string) => {
    const cleanedValue = allowOnlyNumbers(value); // Only allow positive numbers
    setInputValue(cleanedValue);
    
    if (!cleanedValue || cleanedValue === '' || cleanedValue === '.') {
      setAmount(null);
      return;
    }

    try {
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue)) {
        setAmount(null);
        return;
      }

      const parsed = parseUnits(cleanedValue, decimals);
      const sign = getAmountSign();
      setAmount(parsed * sign);
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
              className={`block w-full ${rebalanceType !== 'shares' ? 'pr-24' : 'pr-16'} rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              placeholder="0.0"
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rebalanceType !== 'shares' && maxValue !== null && maxValue !== 0n && (
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-sm text-indigo-600 hover:text-indigo-500 mr-2"
                  disabled={loading}
                >
                  MAX
                </button>
              )}
              <span className="text-gray-500 sm:text-sm">
                {getInputSymbol()}
              </span>
            </div>
          </div>
          {rebalanceType !== 'shares' && maxValue !== null && maxValue !== 0n && (
            <div className="flex gap-1 mt-1 text-sm text-gray-500">
              Max Available: {renderWithTransition(
                <>
                  {maxValue < 0n && <span className="mr-0.5">-</span>}
                  <NumberDisplay value={formatUnits(maxValue < 0n ? -maxValue : maxValue, decimals)} />
                  {' '}
                  {getInputSymbol()}
                </>,
                isLoadingMax
              )}
            </div>
          )}
        </div>

        {/* Preview Section */}
        {amount !== null && (() => {
          const { receive, provide } = getReceiveAndProvide();
          return (
            <PreviewBox
              receive={receive}
              provide={provide}
              isLoading={isLoadingPreview}
              title="Changes Preview"
            />
          );
        })()}

        <button
          type="submit"
          disabled={loading || isApproving || amount === null}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isApproving ? 'Approving Tokens...' : loading ? 'Processing...' : 'Execute Rebalance'}
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
        <h4 className="text-sm font-medium text-blue-900 mb-2">About {actionType === 'mint' ? 'Mint' : actionType === 'burn' ? 'Burn' : actionType === 'provide' ? 'Provide' : 'Receive'} {rebalanceType === 'shares' ? 'Shares' : rebalanceType === 'borrow' ? 'Borrow' : 'Collateral'}</h4>
        <p className="text-xs text-blue-800 mb-2">
          {actionType === 'mint' && 'Enter the amount of shares to mint. The vault will calculate the collateral and borrow changes needed.'}
          {actionType === 'burn' && 'Enter the amount of shares to burn. The vault will calculate the collateral and borrow changes needed.'}
          {actionType === 'provide' && rebalanceType === 'borrow' && 'Enter the amount of borrow assets to provide. The vault will calculate the collateral and shares changes needed.'}
          {actionType === 'provide' && rebalanceType === 'collateral' && 'Enter the amount of collateral assets to provide. The vault will calculate the borrow and shares changes needed.'}
          {actionType === 'receive' && rebalanceType === 'borrow' && 'Enter the amount of borrow assets to receive. The vault will calculate the collateral and shares changes needed.'}
          {actionType === 'receive' && rebalanceType === 'collateral' && 'Enter the amount of collateral assets to receive. The vault will calculate the borrow and shares changes needed.'}
        </p>
        <p className="text-xs text-blue-700">
          💡 Tip: Enter only positive values. The action type determines the direction of the operation.
        </p>
      </div>
    </div>
  );
}
