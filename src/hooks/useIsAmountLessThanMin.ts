import { useMemo } from 'react';
import { parseUnits } from 'ethers';

interface UseIsAmountLessThanMinParams {
  amount?: string;
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

export function useIsAmountLessThanMin({
  amount,
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
}: UseIsAmountLessThanMinParams): boolean {
  return useMemo(() => {
    if (!amount || decimals == null) return false;

    try {
      const parsedAmount = parseUnits(amount, decimals);

      if (parsedAmount === 0n) return false;

      // mint / redeem
      if (minMint !== undefined || minRedeem !== undefined) {
        if (helperType === 'mint') {
          if (!minMint || minMint === '0') return false;
          return parsedAmount < parseUnits(minMint, decimals);
        }

        if (helperType === 'redeem') {
          if (!minRedeem || minRedeem === '0') return false;
          return parsedAmount < parseUnits(minRedeem, decimals);
        }

        return false;
      }

      // deposit / withdraw
      if (minDeposit !== undefined || minWithdraw !== undefined) {
        if (actionType === 'deposit') {
          if (!minDeposit || minDeposit === '0') return false;
          return parsedAmount < parseUnits(minDeposit, decimals);
        }

        if (actionType === 'withdraw') {
          if (!minWithdraw || minWithdraw === '0') return false;
          return parsedAmount < parseUnits(minWithdraw, decimals);
        }

        return false;
      }

      return false;
    } catch {
      return false;
    }
  }, [
    amount,
    decimals,
    minDeposit,
    minWithdraw,
    minMint,
    minRedeem,
    actionType,
    helperType
  ]);
}
