import { useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { formatTokenSymbol } from '@/utils';
import { CapacityStat, ProgressBar } from '@/components/ui';

export function CapacityBlock() {
  const {
    totalAssets,
    maxTotalAssetsInUnderlying,
    collateralTokenPrice,
    borrowTokenPrice,
    collateralTokenSymbol,
    borrowTokenSymbol
  } = useVaultContext();

  const { isMainnet } = useAppContext();

  const capacityData = useMemo(() => {
    if (isMainnet && totalAssets && maxTotalAssetsInUnderlying && borrowTokenPrice && collateralTokenPrice) {
      const deposited = parseFloat(totalAssets);
      const maxUsd = parseFloat(maxTotalAssetsInUnderlying);

      if (maxUsd <= 0) {
        return {
          percentage: 0,
          percentageDisplay: "0.00",
          depositedUsd: "0",
          maxUsd: "0",
          depositedBorrow: "0",
          maxBorrow: "0",
          depositedCollateral: "0",
          maxCollateral: "0",
          borrowSymbol: formatTokenSymbol(borrowTokenSymbol || 'ETH'),
          collateralSymbol: formatTokenSymbol(collateralTokenSymbol || 'wstETH'),
          isLoading: false
        };
      }

      const depositedUsd = deposited * borrowTokenPrice;
      const percentage = Math.min((depositedUsd / maxUsd) * 100, 100);
      const depositedCollateral = (deposited * borrowTokenPrice) / collateralTokenPrice;
      const maxCollateral = maxUsd / collateralTokenPrice;
      const maxBorrowAmount = maxUsd / borrowTokenPrice;

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
        maxBorrow: Math.floor(maxBorrowAmount).toLocaleString('en-US'),
        depositedCollateral: Math.floor(depositedCollateral).toLocaleString('en-US'),
        maxCollateral: Math.floor(maxCollateral).toLocaleString('en-US'),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || 'ETH'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || 'wstETH'),
        isLoading: false
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
      isLoading: true
    };
  }, [isMainnet, totalAssets, maxTotalAssetsInUnderlying, borrowTokenPrice, collateralTokenPrice, borrowTokenSymbol, collateralTokenSymbol]);

  return (
    <div className="flex flex-col justify-between">
      <div className='flex flex-col md:flex-row-reverse justify-between md:items-end'>
        <div className="text-lg text-gray-500 font-normal mb-4">
          Capacity: {capacityData.percentageDisplay}%
        </div>
        <CapacityStat data={capacityData} />
      </div>
      <ProgressBar percentage={capacityData.percentage} />
    </div>
  );
}
