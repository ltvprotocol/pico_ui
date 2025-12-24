import { useMemo } from 'react';
import { parseUnits } from 'ethers';

interface UseIsAmountMoreThanMaxParams {
  amount?: string;
  max?: string;
  decimals?: number;
}

export function useIsAmountMoreThanMax({
  amount,
  max,
  decimals,
} : UseIsAmountMoreThanMaxParams) : boolean {
  return useMemo(() => {
    if (!amount || !max || decimals === null) return false;

    try {
      const parsedAmount = parseUnits(amount, decimals);
      const parsedMax = parseUnits(max, decimals);

      return parsedAmount > parsedMax;
    } catch {
      return false;
    }
  }, [amount, max, decimals]);
}
