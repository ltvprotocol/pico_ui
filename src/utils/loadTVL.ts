import { JsonRpcProvider, ZeroAddress } from 'ethers';
import { AaveV3__factory, ERC20__factory, LendingConnector__factory } from '@/typechain-types';
import { MAINNET_CHAIN_ID_STRING, CONNECTOR_ADDRESSES } from '@/constants';

export async function loadTVL(
  vaultAddress: string,
  collateralTokenAddress: string,
  lendingConnectorAddress: string,
  lendingName: string | null,
  provider: JsonRpcProvider,
  network: string | null
): Promise<bigint | null> {
  if (network !== MAINNET_CHAIN_ID_STRING) {
    return null;
  }

  if (!lendingName || lendingName.toUpperCase() !== 'AAVE V3') {
    return null;
  }

  try {
    const networkConnectors = CONNECTOR_ADDRESSES[network];
    if (!networkConnectors?.AAVE) {
      return null;
    }

    if (lendingConnectorAddress.toLowerCase() !== networkConnectors.AAVE.toLowerCase()) {
      return null;
    }

    const lendingConnector = LendingConnector__factory.connect(lendingConnectorAddress, provider);
    const poolAddress = await lendingConnector.POOL();

    if (poolAddress === ZeroAddress) {
      console.error('POOL address is zero address');
      return null;
    }

    const aavePool = AaveV3__factory.connect(poolAddress, provider);
    const aTokenAddress = await aavePool.getReserveAToken(collateralTokenAddress);

    if (aTokenAddress === ZeroAddress) {
      console.error('aToken address is zero address');
      return null;
    }

    const aToken = ERC20__factory.connect(aTokenAddress, provider);
    const balance = await aToken.balanceOf(vaultAddress);

    return balance;
  } catch (err) {
    console.error('Error loading TVL:', err);
    return null;
  }
}
