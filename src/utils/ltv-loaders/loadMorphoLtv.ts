import { JsonRpcProvider, formatUnits } from 'ethers';
import { Morpho__factory, MorphoOracle__factory } from '@/typechain-types';
import { truncate } from '../truncate';

export async function loadMorphoLtv(
  poolAddress: string,
  userAddress: string,
  marketId: string,
  borrowTokenDecimals: bigint,
  provider: JsonRpcProvider
): Promise<string | undefined> {
  try {
    const morpho = Morpho__factory.connect(poolAddress, provider);

    const position = await morpho.position(marketId, userAddress);
    const borrowShares = position[1];
    const collateralAmount = position[2];

    const market = await morpho.market(marketId);
    const totalBorrowAssets = market.totalBorrowAssets;
    const totalBorrowShares = market.totalBorrowShares;

    const borrowedAmount = borrowShares * totalBorrowAssets / totalBorrowShares;

    const marketParams = await morpho.idToMarketParams(marketId);
    const oracleAddress = marketParams.oracle;
    const oracle = MorphoOracle__factory.connect(oracleAddress, provider);
    const oraclePrice = await oracle.price();
    const ORACLE_PRICE_SCALE = await oracle.SCALE_FACTOR(); // 1e27
    const collateralValueInLoanToken = collateralAmount * oraclePrice / ORACLE_PRICE_SCALE;

    const WAD = 1000000000000000000n; // 1e18

    const ltvScaled = borrowedAmount * WAD / collateralValueInLoanToken
    const ltvParsed = formatUnits(ltvScaled, borrowTokenDecimals);
    return truncate(parseFloat(ltvParsed), 2);
  } catch (err) {
    console.error('Error computing Morpho LTV:', err);
    return;
  }
}
