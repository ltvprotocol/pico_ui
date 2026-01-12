import { useMemo } from 'react';
import { parseUnits } from 'ethers';

interface UseIsMinMoreThanMaxParams {
  maxAmount?: string;
  decimals?: number;
  // deposit / withdraw
  minDeposit?: string;
  minWithdraw?: string;
  // mint / redeem
  minMint?: string;
  minRedeem?: string;
  // discriminators
  actionType?: 'deposit' | 'withdraw';
  helperType?: 'mint' | 'redeem';
}

export function useIsMinMoreThanMax({
  maxAmount,
  decimals,
  // deposit / withdraw
  minDeposit,
  minWithdraw,
  // mint / redeem
  minMint,
  minRedeem,
  // discriminators
  actionType,
  helperType,
}: UseIsMinMoreThanMaxParams): boolean {
  return useMemo(() => {
    if (!maxAmount || decimals == null) return false;

    try {
      const max = parseUnits(maxAmount, decimals);

      // mint / redeem path
      if (minMint !== undefined || minRedeem !== undefined) {
        if (helperType === 'mint') {
          if (!minMint) return false;
          return parseUnits(minMint, decimals) > max;
        }

        if (helperType === 'redeem') {
          if (!minRedeem) return false;
          return parseUnits(minRedeem, decimals) > max;
        }

        return false;
      }

      // deposit / withdraw path
      if (minDeposit !== undefined || minWithdraw !== undefined) {
        if (actionType === 'deposit') {
          if (!minDeposit) return false;
          return parseUnits(minDeposit, decimals) > max;
        }

        if (actionType === 'withdraw') {
          if (!minWithdraw) return false;
          return parseUnits(minWithdraw, decimals) > max;
        }

        return false;
      }

      return false;
    } catch {
      return false;
    }
  }, [
    maxAmount,
    decimals,
    minDeposit,
    minWithdraw,
    minMint,
    minRedeem,
    actionType,
    helperType
  ]);
}
