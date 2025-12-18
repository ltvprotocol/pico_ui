import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'ethers';
import { Vault } from '@/typechain-types';

interface UseMaxAmountUsdBaseOptions {
  maxAmount: string;
  tokenPrice: number | null;
}

interface UseMaxAmountUsdWithConversionOptions extends UseMaxAmountUsdBaseOptions {
  mode: 'shares';
  vaultLens: Vault | null;
  sharesDecimals: bigint | null;
  borrowTokenDecimals: bigint | null;
}

interface UseMaxAmountUsdDirectOptions extends UseMaxAmountUsdBaseOptions {
  mode: 'direct';
}

type UseMaxAmountUsdOptions = UseMaxAmountUsdWithConversionOptions | UseMaxAmountUsdDirectOptions;

export function useMaxAmountUsd(options: UseMaxAmountUsdOptions): number | null {
  const [maxAmountUsd, setMaxAmountUsd] = useState<number | null>(null);

  useEffect(() => {
    const { maxAmount, tokenPrice, mode } = options;

    if (!maxAmount || !tokenPrice) {
      setMaxAmountUsd(null);
      return;
    }

    if (mode === 'direct') {
      try {
        const amount = parseFloat(maxAmount);
        if (isNaN(amount)) {
          setMaxAmountUsd(null);
        } else {
          setMaxAmountUsd(amount * tokenPrice);
        }
      } catch (e) {
        console.error("Error calculating USD value", e);
        setMaxAmountUsd(null);
      }
      return;
    }

    // mode === 'shares'
    const { vaultLens, sharesDecimals, borrowTokenDecimals } = options;

    if (!vaultLens || !sharesDecimals || !borrowTokenDecimals) {
      setMaxAmountUsd(null);
      return;
    }

    const calcUsdMaxFromShares = async () => {
      try {
        const shares = parseUnits(maxAmount, Number(sharesDecimals));
        const assets = await vaultLens.convertToAssets(shares);
        const assetsFormatted = parseFloat(formatUnits(assets, borrowTokenDecimals));
        setMaxAmountUsd(assetsFormatted * tokenPrice);
      } catch (e) {
        console.error("Error calculating USD value", e);
        setMaxAmountUsd(null);
      }
    };

    calcUsdMaxFromShares();
  }, [
    options.maxAmount,
    options.tokenPrice,
    options.mode,
    options.mode === 'shares' ? options.vaultLens : null,
    options.mode === 'shares' ? options.sharesDecimals : null,
    options.mode === 'shares' ? options.borrowTokenDecimals : null,
  ]);

  return maxAmountUsd;
}
