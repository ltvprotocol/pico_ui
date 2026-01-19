import { parseEther } from 'ethers';
import { MIN_ETH_FOR_GAS_ACTION } from '@/constants';

export const useHasEnoughEthForGas = (ethBalance: string | undefined | null, minAmount: bigint = MIN_ETH_FOR_GAS_ACTION): boolean => {
  if (!ethBalance) return false;

  try {
    const balance = parseEther(ethBalance);
    return balance >= minAmount;
  } catch {
    return false;
  }
};
