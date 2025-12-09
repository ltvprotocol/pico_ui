import { Vault, FlashLoanMintHelper, FlashLoanRedeemHelper } from '@/typechain-types';
import { previewWrapEthToWstEth } from '@/utils/wrapWstEth'
import { ContractRunner } from 'ethers';

const MAX_ITERATIONS = 6;
const TOLERANCE_BPS = 1n; // 0.01% tolerance
const BPS_DIVIDER = 10000n;

interface FindSharesForEthParams {
  amount: bigint;
  vaultLens: Vault;
}

interface FindSharesForEthDepositParams extends FindSharesForEthParams {
  helper: FlashLoanMintHelper;
  provider: ContractRunner;
}

interface FindSharesForEthWithdrawParams extends FindSharesForEthParams {
  helper: FlashLoanRedeemHelper;
}

export async function findSharesForEthDeposit({
  amount, helper, vaultLens, provider
} : FindSharesForEthDepositParams) : Promise<bigint | undefined> {
  const wstETHForETH = await previewWrapEthToWstEth(provider, amount);

  if (!wstETHForETH) {
    console.error("Failed to get wstETH for ETH");
    return;
  }

  let currentShares = await vaultLens.convertToSharesCollateral(wstETHForETH);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const requiredCollateral = await helper.previewMintSharesWithFlashLoanCollateral(currentShares);

      if (requiredCollateral === 0n) {
        break;
      }

      const diff = requiredCollateral > wstETHForETH
        ? requiredCollateral - wstETHForETH
        : wstETHForETH - requiredCollateral;

      // Check tolerance
      if ((diff * BPS_DIVIDER) / wstETHForETH <= TOLERANCE_BPS) {
        return currentShares;
      }

      currentShares = (currentShares * wstETHForETH) / requiredCollateral;

    } catch (err) {
      console.warn(`Iteration ${i} failed in findSharesForEthDeposit`, err);
      currentShares = currentShares / 2n;
    }
  }

  return;
}

export async function findSharesForEthWithdraw({
  amount, helper, vaultLens
} : FindSharesForEthWithdrawParams) : Promise<bigint | undefined> {
  let currentShares = await vaultLens.convertToShares(amount);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const receivedEth = await helper.previewRedeemSharesWithCurveAndFlashLoanBorrow(currentShares);

      if (receivedEth === 0n) {
        break;
      }

      const diff = receivedEth > amount
        ? receivedEth - amount
        : amount - receivedEth;

      // Check tolerance
      if ((diff * BPS_DIVIDER) / amount <= TOLERANCE_BPS) {
        return currentShares;
      }

      currentShares = (currentShares * amount) / receivedEth;

    } catch (err) {
      console.warn(`Iteration ${i} failed in findSharesForEthDeposit`, err);
      currentShares = currentShares / 2n;
    }
  }

  return;
}
