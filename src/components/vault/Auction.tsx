import { useState, useEffect } from 'react';
import { formatUnits } from 'ethers';
import { NumberDisplay } from '@/components/ui';
import AuctionHandler from './AuctionHandler';
import { useVaultContext, useAppContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';
import { formatTokenSymbol } from '@/utils';

export default function Auction() {
  const [isOpen, setIsOpen] = useState(false);
  const [auctionAvailable, setAuctionAvailable] = useState<boolean | null>(null);
  const [auctionStartBlock, setAuctionStartBlock] = useState<bigint | null>(null);
  const [auctionStartTimestamp, setAuctionStartTimestamp] = useState<number | null>(null);
  const [futureBorrowAssets, setFutureBorrowAssets] = useState<bigint | null>(null);
  const [futureCollateralAssets, setFutureCollateralAssets] = useState<bigint | null>(null);
  const [isLoadingAuction, setIsLoadingAuction] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState<bigint | null>(null);
  const [currentBlock, setCurrentBlock] = useState<bigint | null>(null);

  const { vaultLens, borrowTokenDecimals, collateralTokenDecimals, borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();
  const { publicProvider } = useAppContext();

  const loadAuctionData = async () => {
    if (!vaultLens || !publicProvider) return;

    setIsLoadingAuction(true);
    try {
      const [startBlock, futureBorrow, futureCollateral, duration] = await Promise.all([
        vaultLens.startAuction(),
        vaultLens.futureBorrowAssets(),
        vaultLens.futureCollateralAssets(),
        vaultLens.auctionDuration()
      ]);

      console.log('Auction Data:', { startBlock, futureBorrow, futureCollateral, duration });

      setAuctionStartBlock(startBlock);
      setFutureBorrowAssets(futureBorrow);
      setFutureCollateralAssets(futureCollateral);
      setAuctionDuration(duration);

      const hasActiveAuction = startBlock > 0n && (futureBorrow !== 0n || futureCollateral !== 0n);
      setAuctionAvailable(hasActiveAuction);

      if (publicProvider) {
        try {
          const block = await publicProvider.getBlock('latest');
          if (block) {
            setCurrentBlock(BigInt(block.number));
            setAuctionStartTimestamp(block.timestamp);
          }
        } catch (blockErr) {
          console.error('Error fetching current block:', blockErr);
        }
      }

      if (startBlock > 0n && publicProvider) {
        try {
          const block = await publicProvider.getBlock(Number(startBlock));
          if (block) {
            setAuctionStartTimestamp(block.timestamp);
          } else {
            setAuctionStartTimestamp(null);
          }
        } catch (blockErr) {
          console.error('Error fetching block timestamp:', blockErr);
          setAuctionStartTimestamp(null);
        }
      } else {
        setAuctionStartTimestamp(null);
      }
    } catch (err) {
      console.error('Error loading auction data:', err);
      setAuctionAvailable(false);
    } finally {
      setIsLoadingAuction(false);
    }
  };

  const refetchAuctionData = async () => {
    if (!vaultLens || !publicProvider) return;

    try {
      const [startBlock, futureBorrow, futureCollateral] = await Promise.all([
        vaultLens.startAuction(),
        vaultLens.futureBorrowAssets(),
        vaultLens.futureCollateralAssets()
      ]);

      console.log('Auction Data Refetch:', { startBlock, futureBorrow, futureCollateral });

      setAuctionStartBlock(startBlock);
      setFutureBorrowAssets(futureBorrow);
      setFutureCollateralAssets(futureCollateral);

      const hasActiveAuction = startBlock > 0n && (futureBorrow !== 0n || futureCollateral !== 0n);
      setAuctionAvailable(hasActiveAuction);

      try {
        const block = await publicProvider.getBlock('latest');
        if (block) {
          setCurrentBlock(BigInt(block.number));
        }
      } catch (blockErr) {
        console.error('Error fetching current block:', blockErr);
      }
    } catch (err) {
      console.error('Error refetching auction data:', err);
    }
  };

  useEffect(() => {
    loadAuctionData();
  }, [vaultLens, publicProvider]);

  useAdaptiveInterval(refetchAuctionData, {
    initialDelay: 12000,
    maxDelay: 60000,
    multiplier: 2,
    enabled: !!vaultLens && !!publicProvider
  });

  const renderAuctionAmount = (amount: bigint | null, decimals: bigint, symbol: string | null) => {
    const value = amount === null ? '0' : formatUnits(amount, Number(decimals));
    return (
      <span className="flex">
        <NumberDisplay className="mr-2" value={value} />
        <span className="font-medium text-gray-700">{formatTokenSymbol(symbol || '')}</span>
      </span>
    );
  };

  // Calculate auction progress
  const calculateAuctionProgress = () => {
    if (!auctionStartBlock || !currentBlock || !auctionDuration || auctionStartBlock === 0n) {
      return { progress: 0, currentStep: 0, isComplete: false };
    }

    const auctionStep = currentBlock - auctionStartBlock;
    const isComplete = auctionStep >= auctionDuration;
    const progress = isComplete ? 100 : Number((auctionStep * 100n) / auctionDuration);
    
    return {
      progress: Math.min(progress, 100),
      currentStep: Number(auctionStep),
      isComplete
    };
  };

  const auctionProgress = calculateAuctionProgress();

  return (
    <div className="relative rounded-lg bg-gray-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-medium text-gray-900">Auction</span>
          {auctionAvailable && (
            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
              Active
            </span>
          )}
        </div>
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
        {isLoadingAuction ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading auction data...</span>
          </div>
        ) : !auctionAvailable ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No auction available right now</h3>
            <p className="text-sm text-gray-500">
              {auctionStartBlock === 0n ? (
                'No auction has been started yet.'
              ) : futureBorrowAssets === 0n && futureCollateralAssets === 0n ? (
                'Auction has been completed - all future assets are zero.'
              ) : (
                'Check back later for auction opportunities to participate in vault rebalancing.'
              )}
            </p>
          </div>
        ) : (
          <div>
            {/* Auction Info */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-blue-900">Auction Information</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Auction Started:</span>
                  <span className="font-medium text-blue-900">
                    {auctionStartBlock && auctionStartBlock > 0n ? (
                      auctionStartTimestamp ? 
                        new Date(auctionStartTimestamp * 1000).toLocaleString() :
                        `Block ${auctionStartBlock.toString()}`
                    ) : 'Not Started'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Borrow Assets:</span>
                  {renderAuctionAmount(futureBorrowAssets, borrowTokenDecimals, borrowTokenSymbol)}
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Collateral Assets:</span>
                  {renderAuctionAmount(futureCollateralAssets, collateralTokenDecimals, collateralTokenSymbol)}
                </div>
                
                {/* Auction Progress Bar */}
                {auctionStartBlock && auctionStartBlock > 0n && auctionDuration && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-700 text-sm">Auction Progress:</span>
                      <span className="text-blue-900 font-medium text-sm">
                        {auctionProgress.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          auctionProgress.isComplete 
                            ? 'bg-green-500' 
                            : auctionProgress.progress > 80 
                              ? 'bg-yellow-500' 
                              : 'bg-blue-500'
                        }`}
                        style={{ width: `${auctionProgress.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-blue-600 mt-1">
                      <span>Step: {auctionProgress.currentStep}</span>
                      <span>Duration: {auctionDuration.toString()} blocks</span>
                    </div>
                    {auctionProgress.isComplete && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        ⚠️ Auction duration exceeded - rewards may be reduced
                      </div>
                    )}
                  </div>
                )}
                
                {/* Auction Type Info */}
                {futureBorrowAssets && futureCollateralAssets && (
                  <div className="mt-3 p-2 bg-white rounded border">
                    <div className="text-xs font-medium text-blue-800">
                      {futureBorrowAssets > 0n ? (
                        <span>Vault needs collateral to increase position. You can provide collateral to receive borrow assets.</span>
                      ) : futureBorrowAssets < 0n ? (
                        <span>Vault needs borrow assets to repay debt and decrease position. You can provide borrow assets to receive collateral.</span>
                      ) : (
                        <span>Vault is balanced - no auction needed.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <AuctionHandler 
              futureBorrowAssets={futureBorrowAssets}
              futureCollateralAssets={futureCollateralAssets}
            />
          </div>
        )}
      </div>
    </div>
  );
}
