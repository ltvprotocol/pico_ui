import { useState, useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { formatApy, ApyPeriod, formatTokenSymbol } from '@/utils';
import { TransitionLoader } from '@/components/ui';

export default function VaultInfoDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    apy,
    apyLoadFailed,
    tvl, // Leveraged TVL
    totalAssets, // Deposited TVL
    maxTotalAssetsInUnderlying, // Max capacity
    collateralTokenPrice,
    borrowTokenPrice: tokenPrice,
    collateralTokenSymbol,
    borrowTokenSymbol
  } = useVaultContext();

  const { isMainnet } = useAppContext();

  // APY
  const apy30d = useMemo(() => {
    if (isMainnet && apy) return formatApy(apy, ApyPeriod.ThirtyDays);
    return "Loading... %";
  }, [isMainnet, apy]);

  const apy7d = useMemo(() => {
    if (isMainnet && apy) return formatApy(apy, ApyPeriod.SevenDays);
    return "Loading... %";
  }, [isMainnet, apy]);

  // Leveraged TVL Calculations
  const leveragedTvlData = useMemo(() => {
    if (isMainnet && tvl && collateralTokenPrice && tokenPrice) {
      const amount = parseFloat(tvl);
      const usd = amount * collateralTokenPrice;
      const collateralAmount = amount;
      const borrowAmount = (amount * collateralTokenPrice) / tokenPrice;

      return {
        usd: Math.floor(usd).toLocaleString('en-US'),
        collateral: Math.floor(collateralAmount).toLocaleString('en-US'),
        borrow: Math.floor(borrowAmount).toLocaleString('en-US'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || ''),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || ''),
        isReal: true
      };
    }

    return {
      usd: "Loading...",
      collateral: "Loading...",
      borrow: "Loading...",
      collateralSymbol: "wstETH",
      borrowSymbol: "ETH",
      isReal: false
    };
  }, [isMainnet, tvl, collateralTokenPrice, tokenPrice, collateralTokenSymbol, borrowTokenSymbol]);

  // Deposited TVL Calculations
  const depositedTvlData = useMemo(() => {
    if (isMainnet && totalAssets && tokenPrice && collateralTokenPrice) {
      const amount = parseFloat(totalAssets);
      const usd = amount * tokenPrice;
      const borrowAmount = amount;
      const collateralAmount = (amount * tokenPrice) / collateralTokenPrice;

      return {
        usd: Math.floor(usd).toLocaleString('en-US'),
        collateral: Math.floor(collateralAmount).toLocaleString('en-US'),
        borrow: Math.floor(borrowAmount).toLocaleString('en-US'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || ''),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || ''),
        isReal: true
      };
    }

    return {
      usd: "Loading...",
      collateral: "Loading...",
      borrow: "Loading...",
      collateralSymbol: "wstETH",
      borrowSymbol: "ETH",
      isReal: false
    };
  }, [isMainnet, totalAssets, tokenPrice, collateralTokenPrice, collateralTokenSymbol, borrowTokenSymbol]);

  // Capacity Calculations
  const capacityData = useMemo(() => {
    if (isMainnet && totalAssets && maxTotalAssetsInUnderlying && tokenPrice && collateralTokenPrice) {
      const deposited = parseFloat(totalAssets);
      const max = parseFloat(maxTotalAssetsInUnderlying);

      if (max <= 0) {
        return {
          percentage: 0,
          depositedUsd: "0",
          maxUsd: "0",
          depositedBorrow: "0",
          maxBorrow: "0",
          depositedCollateral: "0",
          maxCollateral: "0",
          borrowSymbol: formatTokenSymbol(borrowTokenSymbol || 'ETH'),
          collateralSymbol: formatTokenSymbol(collateralTokenSymbol || 'wstETH'),
          isReal: true
        };
      }

      const percentage = Math.min((deposited / max) * 100, 100);
      const depositedUsd = deposited * tokenPrice;
      const maxUsd = max * tokenPrice;
      const depositedCollateral = (deposited * tokenPrice) / collateralTokenPrice;
      const maxCollateral = (max * tokenPrice) / collateralTokenPrice;

      let percentageDisplay: string;
      if (percentage < 0.01 && percentage > 0) {
        percentageDisplay = percentage.toFixed(6).replace(/\.?0+$/, '');
      } else {
        percentageDisplay = percentage.toFixed(2);
      }

      return {
        percentage,
        percentageDisplay,
        depositedUsd: Math.floor(depositedUsd).toLocaleString('en-US'),
        maxUsd: Math.floor(maxUsd).toLocaleString('en-US'),
        depositedBorrow: Math.floor(deposited).toLocaleString('en-US'),
        maxBorrow: Math.floor(max).toLocaleString('en-US'),
        depositedCollateral: Math.floor(depositedCollateral).toLocaleString('en-US'),
        maxCollateral: Math.floor(maxCollateral).toLocaleString('en-US'),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || 'ETH'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || 'wstETH'),
        isReal: true
      };
    }

    return {
      percentage: 0,
      percentageDisplay: "0.00",
      depositedUsd: "Loading...",
      maxUsd: "Loading...",
      depositedBorrow: "Loading...",
      maxBorrow: "Loading...",
      depositedCollateral: "Loading...",
      maxCollateral: "Loading...",
      borrowSymbol: "ETH",
      collateralSymbol: "wstETH",
      isReal: false
    };
  }, [isMainnet, totalAssets, maxTotalAssetsInUnderlying, tokenPrice, collateralTokenPrice, borrowTokenSymbol, collateralTokenSymbol]);

  return (
    <div className="relative rounded-lg bg-white mb-4 shadow-sm border border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">Vault</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={
          `transition-all duration-200 overflow-hidden 
          ${isOpen ?
            'max-h-[2000px] opacity-100 p-4 md:p-6' :
            'max-h-0 opacity-0 pb-0'}`
        }
      >
        {/* APY Stats */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex gap-2 flex-col">
            <div className="text-sm text-gray-500 mb-1 font-normal">30 day APY</div>
            <div className="text-3xl md:text-[2.5rem] font-light text-gray-900 tracking-tight">
              <TransitionLoader isLoading={isMainnet && !apy && !apyLoadFailed}>
                {apy30d}
              </TransitionLoader>
            </div>
          </div>
          <div className="flex gap-2 flex-col">
            <div className="text-sm text-gray-500 mb-1 font-normal">7 day APY</div>
            <div className="text-3xl md:text-[2.5rem] font-light text-gray-900 tracking-tight">
              <TransitionLoader isLoading={isMainnet && !apy && !apyLoadFailed}>
                {apy7d}
              </TransitionLoader>
            </div>
          </div>
        </div>

        <div className='h-[1px] bg-gray-300 w-full my-6 md:my-8'>{/* Divider */}</div>

        {/* TVL Description */}
        <div className="mb-6">
          <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">What are Leveraged and Deposited TVLs?</div>
          <p className="text-sm text-gray-700 block mb-2">
            Leveraged TVL represents the total value of the yield-bearing collateral (wstETH) held in the vault's position, which has been amplified to maximize returns. Deposited TVL shows the actual amount of ETH users have contributed to the vault, reflecting the total net capital.
          </p>
        </div>
        {/* TVL Stats */}
        <div className="grid grid-cols-2 gap-6 [@media(max-width:530px)]:grid-cols-1">
          <div className="flex gap-2 flex-col">
            <div className="text-sm text-gray-500 mb-1 font-normal">Leveraged TVL</div>
            <div className="text-3xl md:text-[2.5rem] font-medium text-gray-900 mb-0.5 flex items-baseline gap-1">
              <TransitionLoader isLoading={isMainnet && !tvl}>
                {leveragedTvlData.usd} <span className="text-2xl text-gray-500 uppercase">$</span>
              </TransitionLoader>
            </div>
            <div>
              <div className="text-sm text-gray-500">
                <TransitionLoader isLoading={isMainnet && !tvl}>
                  ≈ {leveragedTvlData.collateral} {leveragedTvlData.collateralSymbol}
                </TransitionLoader>
              </div>
              <div className="text-sm text-gray-500">
                <TransitionLoader isLoading={isMainnet && !tvl}>
                  ≈ {leveragedTvlData.borrow} {leveragedTvlData.borrowSymbol}
                </TransitionLoader>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col">
            <div className="text-sm text-gray-500 mb-1 font-normal">Deposited TVL</div>
            <div className="text-3xl md:text-[2.5rem] font-medium text-gray-900 mb-0.5 flex items-baseline gap-1">
              <TransitionLoader isLoading={isMainnet && !totalAssets}>
                {depositedTvlData.usd} <span className="text-2xl text-gray-500 uppercase">$</span>
              </TransitionLoader>
            </div>
            <div>
              <div className="text-sm text-gray-500">
                <TransitionLoader isLoading={isMainnet && !totalAssets}>
                  ≈ {depositedTvlData.collateral} {depositedTvlData.collateralSymbol}
                </TransitionLoader>
              </div>
              <div className="text-sm text-gray-500">
                <TransitionLoader isLoading={isMainnet && !totalAssets}>
                  ≈ {depositedTvlData.borrow} {depositedTvlData.borrowSymbol}
                </TransitionLoader>
              </div>
            </div>
          </div>
        </div>

        <div className='h-[1px] bg-gray-300 w-full my-6 md:my-8'>{/* Divider */}</div>

        {/* Capacity Description */}
        <div className="mb-6">
          <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">What is vault capacity and how it works?</div>
          <p className="text-sm text-gray-700 block mb-2">
            Vault capacity is the maximum amount of ETH that can be deposited into a specific vault, measured directly by the Deposited TVL. This limit is set in the underlying asset (ETH) and can be adjusted by the protocol to ensure optimal balance and security for the vault's leveraged position.
          </p>
        </div>
        {/* Capacity Stats */}
        <div className="flex flex-col justify-between mb-8">
          <div className='flex flex-col md:flex-row-reverse justify-between md:items-end'>
            <div className="text-lg text-gray-500 font-normal mb-4">
              <TransitionLoader isLoading={isMainnet && !capacityData.isReal}>
                Capacity: {capacityData.percentageDisplay}%
              </TransitionLoader>
            </div>

            <div className="text-left flex flex-col mb-4">
              <div className="text-2xl md:text-3xl text-gray-900 font-normal">
                <TransitionLoader isLoading={isMainnet && !capacityData.isReal}>
                  {capacityData.depositedUsd} / {capacityData.maxUsd} <span className="text-2xl text-gray-500 uppercase">$</span>
                </TransitionLoader>
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                <TransitionLoader isLoading={isMainnet && !capacityData.isReal}>
                  ≈ {capacityData.depositedBorrow} / {capacityData.maxBorrow} {capacityData.borrowSymbol}
                </TransitionLoader>
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                <TransitionLoader isLoading={isMainnet && !capacityData.isReal}>
                  ≈ {capacityData.depositedCollateral} / {capacityData.maxCollateral} {capacityData.collateralSymbol}
                </TransitionLoader>
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-grow w-full">
            <div className="h-3 bg-gray-200 rounded-full w-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3434E3] transition-all duration-300"
                style={{ width: `${capacityData.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
