import { JsonRpcProvider } from 'ethers';
import { HodlMyBeer__factory } from '@/typechain-types';
import { truncate } from '../truncate';

// TODO: Include decimals and prices from oracle
export async function loadGhostLtv(
  poolAddress: string,
  userAddress: string,
  provider: JsonRpcProvider
) : Promise<string | undefined> {
  try {
    const lending = HodlMyBeer__factory.connect(poolAddress, provider);
    const borrowAmount = await lending.borrowBalance(userAddress);
    const collateralAmount = await lending.supplyCollateralBalance(userAddress);

    // Multiply by 10000 to prevent zero result
    const ltvBigInt = (borrowAmount * 10000n) / collateralAmount;
    const ltv = Number(ltvBigInt) / 10000;

    return truncate(ltv, 4);
  } catch (err) {
    console.error('Error loading Ghost LTV:', err);
    return;
  }
}
