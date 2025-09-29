import { useState, useEffect, useCallback } from 'react';
import { formatUnits } from 'ethers';
import { useVaultContext } from '@/contexts';
import { truncate } from '@/utils';
import { renderWithTransition } from '@/helpers/renderWithTransition';

// Custom Tooltip Component
const Tooltip = ({ children, content, isVisible }: { children: React.ReactNode, content: string, isVisible: boolean }) => {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white text-black text-sm rounded-lg shadow-lg border border-gray-200 whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
        </div>
      )}
    </div>
  );
};

interface LoadingState {
  isLoadingTargetLtv: boolean;
  isLoadingMaxSafeLtv: boolean;
  isLoadingMinProfitLtv: boolean;
}

export default function Information() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoadingTargetLtv: true,
    isLoadingMaxSafeLtv: true,
    isLoadingMinProfitLtv: true,
  });

  const [targetLtv, setTargetLtv] = useState<string | null>(null);
  const [maxSafeLtv, setMaxSafeLtv] = useState<string | null>(null);
  const [minProfitLtv, setMinProfitLtv] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const { 
    vaultLens, 
    sharesSymbol, 
    borrowTokenSymbol, 
    collateralTokenSymbol, 
    vaultConfig,
    vaultMaxDeposit,
    vaultMaxWithdraw,
    vaultMaxMint,
    vaultMaxRedeem,
    vaultMaxDepositCollateral,
    vaultMaxWithdrawCollateral,
    vaultMaxMintCollateral,
    vaultMaxRedeemCollateral,
    totalAssets
  } = useVaultContext();

  // Helper function to get display symbol with tooltip
  const getDisplaySymbol = (symbol: string | null, isShares: boolean = false, elementId: string) => {
    if (!symbol) return null;
    
    if (isShares && symbol.length > 6) {
      return (
        <Tooltip content={symbol} isVisible={hoveredElement === elementId}>
          <span 
            className="cursor-pointer" 
            onMouseEnter={() => setHoveredElement(elementId)}
            onMouseLeave={() => setHoveredElement(null)}
          >
            Shares
          </span>
        </Tooltip>
      );
    }
    
    return symbol;
  };

  useEffect(() => {
    if (vaultConfig) {
      if (vaultConfig.targetLTV) {
        setTargetLtv(vaultConfig.targetLTV);
        setLoadingState(prev => ({ ...prev, isLoadingTargetLtv: false }));
      }
      if (vaultConfig.maxSafeLTV) {
        setMaxSafeLtv(vaultConfig.maxSafeLTV);
        setLoadingState(prev => ({ ...prev, isLoadingMaxSafeLtv: false }));
      }
      if (vaultConfig.minProfitLTV) {
        setMinProfitLtv(vaultConfig.minProfitLTV);
        setLoadingState(prev => ({ ...prev, isLoadingMinProfitLtv: false }));
      }
    }
  }, [vaultConfig]);

  const loadTargetLtv = useCallback(async () => {
    if (!vaultLens || !loadingState.isLoadingTargetLtv || vaultConfig?.targetLTV) return;

    try {
      const dividend = await vaultLens.targetLtvDividend();
      const divider = await vaultLens.targetLtvDivider();
      const rawTargetLtv = (BigInt(dividend) * (10n ** 18n)) / BigInt(divider);
      const newTargetLtv = truncate(parseFloat(formatUnits(rawTargetLtv, 18)), 2);
      setTargetLtv(newTargetLtv);
      setLoadingState(prev => ({ ...prev, isLoadingTargetLtv: false }));
    } catch (err) {
      console.error('Error loading target LTV:', err);
    }
  }, [vaultLens, loadingState.isLoadingTargetLtv, vaultConfig]);

  const loadMaxSafeLtv = useCallback(async () => {
    if (!vaultLens || !loadingState.isLoadingMaxSafeLtv || vaultConfig?.maxSafeLTV) return;

    try {
      const dividend = await vaultLens.maxSafeLtvDividend();
      const divider = await vaultLens.maxSafeLtvDivider();
      const rawMaxSafeLtv = (BigInt(dividend) * (10n ** 18n)) / BigInt(divider);
      const newMaxSafeLtv = truncate(parseFloat(formatUnits(rawMaxSafeLtv, 18)), 2);
      setMaxSafeLtv(newMaxSafeLtv);
      setLoadingState(prev => ({ ...prev, isLoadingMaxSafeLtv: false }));
    } catch (err) {
      console.error('Error loading max safe LTV:', err);
    }
  }, [vaultLens, loadingState.isLoadingMaxSafeLtv, vaultConfig]);

  const loadMinProfitLtv = useCallback(async () => {
    if (!vaultLens || !loadingState.isLoadingMinProfitLtv || vaultConfig?.minProfitLTV) return;

    try {
      const dividend = await vaultLens.minProfitLtvDividend();
      const divider = await vaultLens.minProfitLtvDivider();
      const rawMinProfitLtv = (BigInt(dividend) * (10n ** 18n)) / BigInt(divider);
      const newMinProfitLtv = truncate(parseFloat(formatUnits(rawMinProfitLtv, 18)), 2);
      setMinProfitLtv(newMinProfitLtv);
      setLoadingState(prev => ({ ...prev, isLoadingMinProfitLtv: false }));
    } catch (err) {
      console.error('Error loading min profit LTV:', err);
    }
  }, [vaultLens, loadingState.isLoadingMinProfitLtv, vaultConfig]);

  useEffect(() => {
    if (vaultLens && loadingState.isLoadingTargetLtv && !vaultConfig?.targetLTV) {
      loadTargetLtv();
    }
  }, [vaultLens, loadingState.isLoadingTargetLtv, vaultConfig, loadTargetLtv]);

  useEffect(() => {
    if (vaultLens && loadingState.isLoadingMaxSafeLtv && !vaultConfig?.maxSafeLTV) {
      loadMaxSafeLtv();
    }
  }, [vaultLens, loadingState.isLoadingMaxSafeLtv, vaultConfig, loadMaxSafeLtv]);

  useEffect(() => {
    if (vaultLens && loadingState.isLoadingMinProfitLtv && !vaultConfig?.minProfitLTV) {
      loadMinProfitLtv();
    }
  }, [vaultLens, loadingState.isLoadingMinProfitLtv, vaultConfig, loadMinProfitLtv]);


  return (
    <div className="relative rounded-lg bg-gray-50 p-3">
      <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
      <div className="w-full hidden sm:flex items-end justify-between text-sm text-gray-600 mb-2">
        <div>
          <div>Max Deposit:</div>
          <div>Max Withdraw:</div>
          <div>Max Mint:</div>
          <div>Max Redeem:</div>
        </div>
        <div className="flex">
          <div className="flex flex-col items-end mr-2">
            <div className="mb-2">Collateral: </div>
            {[
              [vaultMaxDepositCollateral, collateralTokenSymbol],
              [vaultMaxWithdrawCollateral, collateralTokenSymbol],
              [vaultMaxMintCollateral, getDisplaySymbol(sharesSymbol, true, 'mint-collateral')],
              [vaultMaxRedeemCollateral, getDisplaySymbol(sharesSymbol, true, 'redeem-collateral')]
            ].map((info, index) => (
              <div key={index} className='flex'>
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    info[0],
                    !info[0] || info[0] === '0'
                  )}
                </div>
                <div className="font-medium text-gray-700">
                  {renderWithTransition(
                    info[1],
                    !info[1]
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end">
            <div className="mb-2">Borrow: </div>
            {[
              [vaultMaxDeposit, borrowTokenSymbol],
              [vaultMaxWithdraw, borrowTokenSymbol],
              [vaultMaxMint, getDisplaySymbol(sharesSymbol, true, 'mint-borrow')],
              [vaultMaxRedeem, getDisplaySymbol(sharesSymbol, true, 'redeem-borrow')]
            ].map((info, index) => (
              <div key={index} className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    info[0],
                    !info[0] || info[0] === '0'
                  )}
                </div>
                <div className="font-medium text-gray-700">
                  {renderWithTransition(
                    info[1],
                    !info[1]
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full sm:hidden text-sm text-gray-600 mt-2 mb-2">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="font-medium text-gray-700">Action</div>
            <div>Deposit:</div>
            <div>Withdraw:</div>
            <div>Mint:</div>
            <div>Redeem:</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-medium text-gray-700">Max for Collateral</div>
            {[
              [vaultMaxDepositCollateral, collateralTokenSymbol],
              [vaultMaxWithdrawCollateral, collateralTokenSymbol],
              [vaultMaxMintCollateral, getDisplaySymbol(sharesSymbol, true, 'mobile-mint-collateral')],
              [vaultMaxRedeemCollateral, getDisplaySymbol(sharesSymbol, true, 'mobile-redeem-collateral')]
            ].map((info, index) => (
              <div key={index} className='flex'>
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    info[0],
                    !info[0] || info[0] === '0'
                  )}
                </div>
                <div className="font-medium text-gray-700">
                  {renderWithTransition(
                    info[1],
                    !info[1]
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="font-medium text-gray-700">Action</div>
            <div>Deposit:</div>
            <div>Withdraw:</div>
            <div>Mint:</div>
            <div>Redeem:</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-medium text-gray-700">Max for Borrow</div>
            {[
              [vaultMaxDeposit, borrowTokenSymbol],
              [vaultMaxWithdraw, borrowTokenSymbol],
              [vaultMaxMint, getDisplaySymbol(sharesSymbol, true, 'mobile-mint-borrow')],
              [vaultMaxRedeem, getDisplaySymbol(sharesSymbol, true, 'mobile-redeem-borrow')]
            ].map((info, index) => (
              <div key={index} className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    info[0],
                    !info[0] || info[0] === '0'
                  )}
                </div>
                <div className="font-medium text-gray-700">
                  {renderWithTransition(
                    info[1],
                    !info[1]
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div>TVL:</div>
        <div className='flex min-w-[100px] justify-end'>
          <div className="mr-2">
            {renderWithTransition(
              totalAssets,
              !totalAssets || totalAssets === '0'
            )}
          </div>
          <div className="font-medium text-gray-700">
            {renderWithTransition(
              borrowTokenSymbol,
              !borrowTokenSymbol
            )}
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Target LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            targetLtv,
            loadingState.isLoadingTargetLtv
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Max Safe LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            maxSafeLtv,
            loadingState.isLoadingMaxSafeLtv
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Min Profit LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            minProfitLtv,
            loadingState.isLoadingMinProfitLtv
          )}
        </div>
      </div>
    </div>
  );
}