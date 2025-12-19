import { useState, useEffect } from 'react';
import { parseUnits, formatUnits } from 'ethers';
import { Vault } from '@/typechain-types';

interface UseMaxAmountUsdOptions {
  maxAmount: string;
  tokenPrice: number | null;
  needConvertFromShares: boolean;
  vaultLens?: Vault | null;
  sharesDecimals?: bigint | null;
  borrowTokenDecimals?: bigint | null;
}

export function useMaxAmountUsd(options: UseMaxAmountUsdOptions): number | null {
  const [maxAmountUsd, setMaxAmountUsd] = useState<number | null>(null);

  useEffect(() => {
    const { maxAmount, tokenPrice, needConvertFromShares, vaultLens, sharesDecimals, borrowTokenDecimals } = options;

    const needToSkip = !maxAmount || !tokenPrice || (needConvertFromShares && (!vaultLens || !sharesDecimals || !borrowTokenDecimals));

    if (needToSkip) {
      setMaxAmountUsd(null);
      return;
    }

    const calculateMaxAmountUsd = async () => {
      try {
        let amount: number;
        if (needConvertFromShares) {
          const shares = parseUnits(maxAmount, Number(sharesDecimals));
          const assets = await vaultLens!.convertToAssets(shares);
          amount = parseFloat(formatUnits(assets, borrowTokenDecimals!));
        } else {
          amount = parseFloat(maxAmount);
        }

        if (isNaN(amount)) {
          setMaxAmountUsd(null);
          return;
        }

        setMaxAmountUsd(amount * tokenPrice);
      }
      catch (e) {
        console.error("Error calculating USD value", e);
        setMaxAmountUsd(null);
      }
    }

    calculateMaxAmountUsd();
  }, [
    options.maxAmount,
    options.tokenPrice,
    options.needConvertFromShares,
    options.vaultLens,
    options.sharesDecimals,
    options.borrowTokenDecimals,
  ]);

  return maxAmountUsd;
}