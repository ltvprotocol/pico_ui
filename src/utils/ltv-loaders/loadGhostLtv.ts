import { JsonRpcProvider } from 'ethers';
import { HodlMyBeer__factory } from '@/typechain-types';
import { truncate } from '../truncate';

export async function loadGhostLtv(
  poolAddress: string,
  userAddress: string,
  provider: JsonRpcProvider
) : Promise<string | undefined> {
  try {
    const lending = HodlMyBeer__factory.connect(poolAddress, provider);
    const borrowAmount = await lending.borrowBalance(userAddress);
    const collateralAmount = await lending.supplyCollateralBalance(userAddress);

    const ltvBigInt = (borrowAmount * 10000n) / collateralAmount;
    const ltv = Number(ltvBigInt) / 10000;

    return truncate(ltv, 4);
  } catch (err) {
    console.error('Error loading Ghost LTV:', err);
    return;
  }
}
