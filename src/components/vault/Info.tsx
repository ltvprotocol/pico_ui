import { useEffect, useState, useMemo, useRef } from 'react';
import { formatUnits, parseUnits } from 'ethers';
import { useVaultContext } from '@/contexts';
import { useAppContext } from '@/contexts';
import { NumberDisplay, TransitionLoader, SymbolWithTooltip } from '@/components/ui';
import { fetchTokenPrice } from '@/utils';

export default function Info() {
  const {
    apy,
    apyLoadFailed,
    totalAssets,
    tvl,
    sharesBalance,
    sharesSymbol,
    borrowTokenSymbol,
    collateralTokenSymbol,
    description,
    vaultLens,
    borrowTokenDecimals,
    sharesDecimals,
  } = useVaultContext();

  const { isMainnet } = useAppContext();
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [priceLoadFailed, setPriceLoadFailed] = useState<boolean>(false);
  const hasLoadedPriceOnce = useRef<boolean>(false);
  
  const [collateralTokenPrice, setCollateralTokenPrice] = useState<number | null>(null);
  const [isLoadingCollateralPrice, setIsLoadingCollateralPrice] = useState<boolean>(false);
  const [collateralPriceLoadFailed, setCollateralPriceLoadFailed] = useState<boolean>(false);
  const hasLoadedCollateralPriceOnce = useRef<boolean>(false);
  
  const [positionInBorrowTokens, setPositionInBorrowTokens] = useState<string | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState<boolean>(false);

  const formatApy = (value: number | null) => {
    if (value === null) return null;
    return `${value.toFixed(2)}%`;
  };

  // Fetch token price only on mainnet
  useEffect(() => {
    if (!isMainnet || !borrowTokenSymbol) {
      setTokenPrice(null);
      setIsLoadingPrice(false);
      setPriceLoadFailed(false);
      hasLoadedPriceOnce.current = false;
      return;
    }

    const loadPrice = async () => {
      // Only show loader on first load
      if (!hasLoadedPriceOnce.current) {
        setIsLoadingPrice(true);
      }
      setPriceLoadFailed(false);
      try {
        const price = await fetchTokenPrice(borrowTokenSymbol);
        setTokenPrice(price);
        if (price === null) {
          setPriceLoadFailed(true);
        }
        hasLoadedPriceOnce.current = true;
      } catch (error) {
        console.error('Error loading token price:', error);
        setPriceLoadFailed(true);
        setTokenPrice(null);
        hasLoadedPriceOnce.current = true;
      } finally {
        setIsLoadingPrice(false);
      }
    };

    loadPrice();
  }, [isMainnet, borrowTokenSymbol]);

  // Fetch collateral token price only on mainnet (for TVL)
  useEffect(() => {
    if (!isMainnet || !collateralTokenSymbol || !tvl) {
      setCollateralTokenPrice(null);
      setIsLoadingCollateralPrice(false);
      setCollateralPriceLoadFailed(false);
      hasLoadedCollateralPriceOnce.current = false;
      return;
    }

    const loadCollateralPrice = async () => {
      // Only show loader on first load
      if (!hasLoadedCollateralPriceOnce.current) {
        setIsLoadingCollateralPrice(true);
      }
      setCollateralPriceLoadFailed(false);
      try {
        const price = await fetchTokenPrice(collateralTokenSymbol);
        setCollateralTokenPrice(price);
        if (price === null) {
          setCollateralPriceLoadFailed(true);
        }
        hasLoadedCollateralPriceOnce.current = true;
      } catch (error) {
        console.error('Error loading collateral token price:', error);
        setCollateralPriceLoadFailed(true);
        setCollateralTokenPrice(null);
        hasLoadedCollateralPriceOnce.current = true;
      } finally {
        setIsLoadingCollateralPrice(false);
      }
    };

    loadCollateralPrice();
  }, [isMainnet, collateralTokenSymbol, tvl]);

  // Calculate USD value
  const usdValue = useMemo(() => {
    if (!isMainnet || !tokenPrice || !totalAssets || totalAssets === '0') {
      return null;
    }
    const totalAssetsNum = parseFloat(totalAssets);
    if (isNaN(totalAssetsNum)) {
      return null;
    }
    return totalAssetsNum * tokenPrice;
  }, [isMainnet, tokenPrice, totalAssets]);

  const formatUsdValue = (value: number | null) => {
    if (value === null) return null;
    // Format with thousands separator
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate TVL USD value
  const tvlUsdValue = useMemo(() => {
    if (!isMainnet || !collateralTokenPrice || !tvl || tvl === '0') {
      return null;
    }
    const tvlNum = parseFloat(tvl);
    if (isNaN(tvlNum)) {
      return null;
    }
    return tvlNum * collateralTokenPrice;
  }, [isMainnet, collateralTokenPrice, tvl]);

  // Load position in borrow tokens (mainnet only)
  useEffect(() => {
    if (!isMainnet || !vaultLens || !sharesBalance || sharesBalance === '0' || !borrowTokenDecimals || !sharesDecimals) {
      setPositionInBorrowTokens(null);
      setIsLoadingPosition(false);
      return;
    }

    const loadPosition = async () => {
      setIsLoadingPosition(true);
      try {
        const sharesBigInt = parseUnits(sharesBalance, Number(sharesDecimals));
        const assetsBigInt = await vaultLens.convertToAssets(sharesBigInt);
        const formatted = formatUnits(assetsBigInt, borrowTokenDecimals);
        setPositionInBorrowTokens(formatted);
      } catch (error) {
        console.error('Error loading position in borrow tokens:', error);
        setPositionInBorrowTokens(null);
      } finally {
        setIsLoadingPosition(false);
      }
    };

    loadPosition();
  }, [isMainnet, vaultLens, sharesBalance, borrowTokenDecimals, sharesDecimals]);

  // Calculate position USD value
  const positionUsdValue = useMemo(() => {
    if (!isMainnet || !tokenPrice || !positionInBorrowTokens || positionInBorrowTokens === '0') {
      return null;
    }
    const positionNum = parseFloat(positionInBorrowTokens);
    if (isNaN(positionNum)) {
      return null;
    }
    return positionNum * tokenPrice;
  }, [isMainnet, tokenPrice, positionInBorrowTokens]);

  return (
    <div className="relative rounded-lg bg-gray-50 p-3">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Overview</h3>
      <div className="w-full flex justify-between items-center text-sm mb-3">
        <div className="font-medium text-gray-700">Your Position:</div>
        <div className="min-w-[60px] text-right">
          {isMainnet ? (
            <div className="flex flex-col items-end">
              <div className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  <TransitionLoader isLoading={isLoadingPosition || !positionInBorrowTokens}>
                    {positionInBorrowTokens ?
                      <NumberDisplay value={positionInBorrowTokens} /> : 
                      null
                    }
                  </TransitionLoader>
                </div>
                <div className="font-medium text-gray-700">
                  <TransitionLoader isLoading={!borrowTokenSymbol}>
                    {borrowTokenSymbol}
                  </TransitionLoader>
                </div>
              </div>
              {positionInBorrowTokens && (
                <div className="text-gray-700 text-xs mt-0.5">
                  {!hasLoadedPriceOnce.current ? (
                    <TransitionLoader isLoading={isLoadingPrice} isFailedToLoad={priceLoadFailed}>
                      {formatUsdValue(positionUsdValue)}
                    </TransitionLoader>
                  ) : 
                    formatUsdValue(positionUsdValue)
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="flex">
              <div className="mr-2 min-w-[60px] text-right">
                <TransitionLoader isLoading={!sharesBalance || sharesBalance === '0'}>
                  <NumberDisplay value={sharesBalance} />
                </TransitionLoader>
              </div>
              <div className="font-medium text-gray-700">
                <SymbolWithTooltip
                  symbol={sharesSymbol}
                  placeholder='Shares'
                  elementId='info-shares'
                  isLoading={!sharesSymbol}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="font-medium text-gray-700">APY:</div>
        <div className="min-w-[60px] min-h-[16px] text-right">
          <TransitionLoader isLoading={!apy} isFailedToLoad={apyLoadFailed}>
            {formatApy(apy)}
          </TransitionLoader>
        </div>
      </div>
      {tvl && (
        <div className="w-full flex justify-between items-center text-sm mb-2">
          <div className="font-medium text-gray-700">Leveraged TVL:</div>
          <div className="min-w-[60px] text-right">
            <div className="flex flex-col items-end">
              <div className="flex">
                <div className="mr-2 min-w-[60px] text-right">
                  <TransitionLoader isLoading={!tvl || tvl === '0'}>
                    <NumberDisplay value={tvl} />
                  </TransitionLoader>
                </div>
                <div className="font-medium text-gray-700">
                  <TransitionLoader isLoading={!collateralTokenSymbol}>
                    {collateralTokenSymbol}
                  </TransitionLoader>
                </div>
              </div>
              {isMainnet && (
                <div className="text-gray-700 text-xs mt-0.5">
                  {!hasLoadedCollateralPriceOnce.current ? (
                    <TransitionLoader isLoading={isLoadingCollateralPrice} isFailedToLoad={collateralPriceLoadFailed}>
                      {formatUsdValue(tvlUsdValue)}
                    </TransitionLoader>
                  ) : 
                    formatUsdValue(tvlUsdValue)
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div className="font-medium text-gray-700">Deposited TVL:</div>
        <div className="min-w-[60px] text-right">
          <div className="flex flex-col items-end">
            <div className="flex">
              <div className="mr-2 min-w-[60px] text-right">
                <TransitionLoader isLoading={!totalAssets || totalAssets === '0'}>
                  <NumberDisplay value={totalAssets} />
                </TransitionLoader>
              </div>
              <div className="font-medium text-gray-700">
                <TransitionLoader isLoading={!borrowTokenSymbol}>
                  {borrowTokenSymbol}
                </TransitionLoader>
              </div>
            </div>
            {isMainnet && (
              <div className="text-gray-700 text-xs mt-0.5">
                {!hasLoadedPriceOnce.current ? (
                  <TransitionLoader isLoading={isLoadingPrice} isFailedToLoad={priceLoadFailed}>
                    {formatUsdValue(usdValue)}
                  </TransitionLoader>
                ) :
                  formatUsdValue(usdValue)
                }
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="w-full text-sm mt-6">
        <div className="font-medium text-gray-700 mb-2">Description</div>
        <p className="text-gray-700 max-w-[380px]">
          {description || "No description available for this vault."}
        </p>
      </div>
    </div>
  );
}
