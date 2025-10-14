import { useState, useEffect, useCallback } from 'react';
import { useVaultContext } from '@/contexts';
import { renderWithTransition } from '@/helpers/renderWithTransition';
import { renderSymbolWithPlaceholder } from '@/helpers/renderSymbolWithPlaceholder';
import { NumberDisplay } from '@/components/ui';
import { formatLtv } from '@/utils';

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
    totalAssets,
    currentLtv
  } = useVaultContext();


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
      const newTargetLtv = (Number(dividend) / Number(divider)).toString();
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
      const newMaxSafeLtv = (Number(dividend) / Number(divider)).toString();
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
      const newMinProfitLtv = (Number(dividend) / Number(divider)).toString();
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
              [vaultMaxMintCollateral, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mint-collateral', isLoading: !sharesSymbol })],
              [vaultMaxRedeemCollateral, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'redeem-collateral', isLoading: !sharesSymbol })]
            ].map((info, index) => (
              <div key={index} className='flex'>
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    <NumberDisplay value={info[0] as string} />,
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
              [vaultMaxMint, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mint-borrow', isLoading: !sharesSymbol })],
              [vaultMaxRedeem, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'redeem-borrow', isLoading: !sharesSymbol })]
            ].map((info, index) => (
              <div key={index} className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    <NumberDisplay value={info[0] as string} />,
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
              [vaultMaxMintCollateral, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mobile-mint-collateral', isLoading: !sharesSymbol })],
              [vaultMaxRedeemCollateral, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mobile-redeem-collateral', isLoading: !sharesSymbol })]
            ].map((info, index) => (
              <div key={index} className='flex'>
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    <NumberDisplay value={info[0] as string} />,
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
              [vaultMaxMint, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mobile-mint-borrow', isLoading: !sharesSymbol })],
              [vaultMaxRedeem, renderSymbolWithPlaceholder({ symbol: sharesSymbol, placeholder: 'Shares', elementId: 'mobile-redeem-borrow', isLoading: !sharesSymbol })]
            ].map((info, index) => (
              <div key={index} className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  {renderWithTransition(
                    <NumberDisplay value={info[0] as string} />,
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
              <NumberDisplay value={totalAssets} />,
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
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div>Current LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            currentLtv ? formatLtv(currentLtv) : null,
            !currentLtv
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Target LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            targetLtv ? formatLtv(targetLtv) : null,
            loadingState.isLoadingTargetLtv
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Max Safe LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            maxSafeLtv ? formatLtv(maxSafeLtv) : null,
            loadingState.isLoadingMaxSafeLtv
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Min Profit LTV:</div>
        <div className="min-w-[60px] text-right">
          {renderWithTransition(
            minProfitLtv ? formatLtv(minProfitLtv) : null,
            loadingState.isLoadingMinProfitLtv
          )}
        </div>
      </div>
    </div>
  );
}
