import { JsonRpcProvider } from 'ethers';
import { AaveV3__factory } from '@/typechain-types';
import { truncate } from '../truncate';

export async function loadAaveLtv(
  poolAddress: string,
  userAddress: string,
  provider: JsonRpcProvider
) : Promise<string | undefined> {
  try {
    const aavePool = AaveV3__factory.connect(poolAddress, provider);
    const accountData = await aavePool.getUserAccountData(userAddress);

    const totalCollateralBase = accountData.totalCollateralBase;
    const totalDebtBase = accountData.totalDebtBase;

    // Multiply by 10000 to prevent zero result
    const ltvBigInt = (totalDebtBase * 10000n) / totalCollateralBase;
    const ltv = Number(ltvBigInt) / 10000;

    return truncate(ltv, 4);
  } catch (err) {
    console.error('Error loading Aave LTV:', err);
    return;
  }
}
