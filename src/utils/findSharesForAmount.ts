import { Vault, FlashLoanRedeemHelper } from '@/typechain-types';
import { abs } from '@/utils/abs';


const MAX_ITERATIONS = 6;

const TOLERANCE_BPS = 1n; // 1e-6% = 0.000001% tolerance
const BPS_DIVIDER = 10_000_000n;
interface FindSharesForEthParams {
  amount: bigint;
  vaultLens: Vault;
}

interface FindSharesForEthWithdrawParams extends FindSharesForEthParams {
  helper: FlashLoanRedeemHelper;
}

export async function findSharesForEthWithdraw({
  amount, helper, vaultLens
}: FindSharesForEthWithdrawParams): Promise<bigint | undefined> {
  let currentEth = amount;
  let currentShares = await vaultLens.convertToShares(currentEth);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const receivedEth = await helper.previewRedeemSharesWithCurveAndFlashLoanBorrow(currentShares);

      if (receivedEth === 0n) {
        break;
      }

      const diff = amount - receivedEth;

      if (abs(diff) * BPS_DIVIDER / amount <= TOLERANCE_BPS) {
        return currentShares;
      }

      // Stupid and simple approximation solution. It doesn't account for the dex slippage for the
      // additional amount of eth, but it converges quickly enough for our purposes. This level of simplicity
      // lets us to not depend from the dex price direction, dynamic changes of the dex price, slippage etc.
      currentEth += diff;
      currentShares = await vaultLens.convertToShares(currentEth);
    } catch (err) {
      console.warn(`Iteration ${i} failed in findSharesForEthWithdraw`, err);
    }
  }

  return undefined;
}
