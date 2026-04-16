import { useMemo } from 'react';
import { useVaultContext, useAppContext } from '@/contexts';
import { formatTokenSymbol } from '@/utils';
import { TvlStat } from '@/components/ui';

export function TvlBlock() {
  const {
    tvl,
    totalAssets,
    collateralTokenPrice,
    borrowTokenPrice,
    collateralTokenSymbol,
    borrowTokenSymbol
  } = useVaultContext();

  const { isMainnet } = useAppContext();

  const leveragedTvlData = useMemo(() => {
    if (isMainnet && tvl && collateralTokenPrice && borrowTokenPrice) {
      const amount = parseFloat(tvl);
      const usd = amount * collateralTokenPrice;
      const collateralAmount = amount;
      const borrowAmount = (amount * collateralTokenPrice) / borrowTokenPrice;

      return {
        usd: Math.floor(usd).toLocaleString('en-US'),
        collateral: Math.floor(collateralAmount).toLocaleString('en-US'),
        borrow: Math.floor(borrowAmount).toLocaleString('en-US'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || ''),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || ''),
        isLoading: false
      };
    }

    return {
      usd: "Loading...",
      collateral: "Loading...",
      borrow: "Loading...",
      collateralSymbol: "wstETH",
      borrowSymbol: "ETH",
      isLoading: true
    };
  }, [isMainnet, tvl, collateralTokenPrice, borrowTokenPrice, collateralTokenSymbol, borrowTokenSymbol]);

  const depositedTvlData = useMemo(() => {
    if (isMainnet && totalAssets && borrowTokenPrice && collateralTokenPrice) {
      const amount = parseFloat(totalAssets);
      const usd = amount * borrowTokenPrice;
      const borrowAmount = amount;
      const collateralAmount = (amount * borrowTokenPrice) / collateralTokenPrice;

      return {
        usd: Math.floor(usd).toLocaleString('en-US'),
        collateral: Math.floor(collateralAmount).toLocaleString('en-US'),
        borrow: Math.floor(borrowAmount).toLocaleString('en-US'),
        collateralSymbol: formatTokenSymbol(collateralTokenSymbol || ''),
        borrowSymbol: formatTokenSymbol(borrowTokenSymbol || ''),
        isLoading: false
      };
    }

    return {
      usd: "Loading...",
      collateral: "Loading...",
      borrow: "Loading...",
      collateralSymbol: "wstETH",
      borrowSymbol: "ETH",
      isLoading: true
    };
  }, [isMainnet, totalAssets, borrowTokenPrice, collateralTokenPrice, collateralTokenSymbol, borrowTokenSymbol]);

  return (
    <div className="grid grid-cols-2 gap-6 [@media(max-width:530px)]:grid-cols-1">
      <TvlStat title="Leveraged TVL" data={leveragedTvlData} />
      <TvlStat title="Deposited TVL" data={depositedTvlData} />
    </div>
  );
}
