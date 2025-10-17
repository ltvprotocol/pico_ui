import { Provider, ZeroAddress } from 'ethers';
import { LendingConnector__factory } from '@/typechain-types';

export async function getLendingProtocolAddress(
  lendingConnectorAddress: string,
  provider: Provider
): Promise<string | undefined> {
  const lendingConnector = LendingConnector__factory.connect(lendingConnectorAddress, provider);

  const functionsToTry = ['POOL', 'MORPHO', 'LENDING_PROTOCOL'] as const;

  for (const functionName of functionsToTry) {
    try {
      const address = await lendingConnector[functionName]();

      if (address === ZeroAddress) {
        continue;
      }
      
      if (address) {
        return address;
      }
    } catch (err) {
      continue;
    }
  }

  console.error('All lending protocol function calls failed');
  return;
}

