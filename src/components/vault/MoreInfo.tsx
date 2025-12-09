import { useState, useEffect, useCallback } from 'react';
import { useVaultContext } from '@/contexts';
import { formatLtv, formatTokenSymbol } from '@/utils';
import { NumberDisplay, SymbolWithTooltip, TransitionLoader } from '@/components/ui';


interface LoadingState {
  isLoadingTargetLtv: boolean;
  isLoadingMaxSafeLtv: boolean;
  isLoadingMinProfitLtv: boolean;
}

export default function MoreInfo() {
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="relative rounded-lg bg-gray-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">More Info</span>
        <svg 
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-200 overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100 p-3' : 'max-h-0 opacity-0 pb-0'}`}>
        <div className="w-full hidden sm:flex items-end justify-between text-sm text-gray-600 mb-2">
          <div className="font-medium text-gray-700">
            <div>Max Deposit:</div>
            <div>Max Withdraw:</div>
            <div>Max Mint:</div>
            <div>Max Redeem:</div>
          </div>
          <div className="flex">
            <div className="flex flex-col items-end mr-2">
              <div className="font-medium text-gray-700 mb-2">Collateral: </div>
              {[
                [vaultMaxDepositCollateral, formatTokenSymbol(collateralTokenSymbol)],
                [vaultMaxWithdrawCollateral, formatTokenSymbol(collateralTokenSymbol)],
                [vaultMaxMintCollateral, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mint-collateral'} isLoading={!sharesSymbol} /> ],
                [vaultMaxRedeemCollateral, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'redeem-collateral'} isLoading={!sharesSymbol} />]
              ].map((info, index) => (
                <div key={index} className='flex'>
                  <div className="mr-2 min-w-[60px] text-right">
                    <TransitionLoader isLoading={!info[0] || info[0] === '0'}>
                      <NumberDisplay value={info[0] as string} />
                    </TransitionLoader>
                  </div>
                  <div className="font-medium text-gray-700">
                    <TransitionLoader isLoading={!info[1]}>
                      {info[1]}
                    </TransitionLoader>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end">
              <div className="font-medium text-gray-700 mb-2">Borrow: </div>
              {[
                [vaultMaxDeposit, formatTokenSymbol(borrowTokenSymbol)],
                [vaultMaxWithdraw, formatTokenSymbol(borrowTokenSymbol)],
                [vaultMaxMint, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mint-borrow'} isLoading={!sharesSymbol} />],
                [vaultMaxRedeem, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'redeem-borrow'} isLoading={!sharesSymbol} />]
              ].map((info, index) => (
                <div key={index} className='flex'>
                  <div className="mr-2 min-w-[60px] text-right">
                    <TransitionLoader isLoading={!info[0] || info[0] === '0'}>
                      <NumberDisplay value={info[0] as string} />
                    </TransitionLoader>
                  </div>
                  <div className="font-medium text-gray-700">
                    <TransitionLoader isLoading={!info[1]}>
                      {info[1]}
                    </TransitionLoader>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full sm:hidden text-sm text-gray-600 mt-2 mb-2">
          <div className="flex items-end justify-between mb-2">
            <div className="font-medium text-gray-700">
              <div>Action</div>
              <div>Deposit:</div>
              <div>Withdraw:</div>
              <div>Mint:</div>
              <div>Redeem:</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="font-medium text-gray-700">Max for Collateral</div>
              {[
                [vaultMaxDepositCollateral, formatTokenSymbol(collateralTokenSymbol)],
                [vaultMaxWithdrawCollateral, formatTokenSymbol(collateralTokenSymbol)],
                [vaultMaxMintCollateral, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mobile-mint-collateral'} isLoading={!sharesSymbol} />],
                [vaultMaxRedeemCollateral, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mobile-redeem-collateral'} isLoading={!sharesSymbol} />]
              ].map((info, index) => (
                <div key={index} className='flex'>
                  <div className="mr-2 min-w-[60px] text-right">
                    <TransitionLoader isLoading={!info[0] || info[0] === '0'}>
                      <NumberDisplay value={info[0] as string} />
                    </TransitionLoader>
                  </div>
                  <div className="font-medium text-gray-700">
                    <TransitionLoader isLoading={!info[1]}>
                      {info[1]}
                    </TransitionLoader>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="font-medium text-gray-700">
              <div>Action</div>
              <div>Deposit:</div>
              <div>Withdraw:</div>
              <div>Mint:</div>
              <div>Redeem:</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="font-medium text-gray-700">Max for Borrow</div>
              {[
                [vaultMaxDeposit, formatTokenSymbol(borrowTokenSymbol)],
                [vaultMaxWithdraw, formatTokenSymbol(borrowTokenSymbol)],
                [vaultMaxMint, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mobile-mint-borrow'} isLoading={!sharesSymbol} />],
                [vaultMaxRedeem, <SymbolWithTooltip symbol={sharesSymbol} placeholder={'Shares'} elementId={'mobile-redeem-borrow'} isLoading={!sharesSymbol} />]
              ].map((info, index) => (
                <div key={index} className='flex'>
                  <div className="mr-2 min-w-[60px] text-right">
                    <TransitionLoader isLoading={!info[0] || info[0] === '0'}>
                      <NumberDisplay value={info[0] as string} />
                    </TransitionLoader>
                  </div>
                  <div className="font-medium text-gray-700">
                    <TransitionLoader isLoading={!info[1]}>
                      {info[1]}
                    </TransitionLoader>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm mb-2">
          <div className="font-medium text-gray-700">Current LTV:</div>
          <div className="min-w-[60px] text-right">
            <TransitionLoader isLoading={!currentLtv}>
              {currentLtv ? (
                currentLtv === 'UNKNOWN_CONNECTOR' ? (
                  <span className="text-gray-500 italic">Unable to fetch LTV</span>
                ) : currentLtv === 'LOAD_FAILED' ? (
                  <span className="text-red-500 italic">Failed to load</span>
                ) : (
                  formatLtv(currentLtv)
                )
              ) : null}
            </TransitionLoader>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div className="font-medium text-gray-700">Target LTV:</div>
          <div className="min-w-[60px] text-right">
            <TransitionLoader isLoading={loadingState.isLoadingTargetLtv}>
              {targetLtv ? formatLtv(targetLtv) : null}
            </TransitionLoader>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div className="font-medium text-gray-700">Max Safe LTV:</div>
          <div className="min-w-[60px] text-right">
            <TransitionLoader isLoading={loadingState.isLoadingMaxSafeLtv}>
              {maxSafeLtv ? formatLtv(maxSafeLtv) : null}
            </TransitionLoader>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div className="font-medium text-gray-700">Min Profit LTV:</div>
          <div className="min-w-[60px] text-right">
            <TransitionLoader isLoading={loadingState.isLoadingMinProfitLtv}>
              {minProfitLtv ? formatLtv(minProfitLtv) : null}
            </TransitionLoader>
          </div>
        </div>
      </div>
    </div>
  );
}
