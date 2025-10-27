import { JsonRpcProvider } from 'ethers';

export async function isVaultExists(address: string, provider: JsonRpcProvider): Promise<boolean> {
  try {
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return false;
    }

    const code = await provider.getCode(address);
    
    return code !== '0x' && code !== '';
  } catch (error) {
    console.error('Error checking if vault exists:', error);
    return false;
  }
}

