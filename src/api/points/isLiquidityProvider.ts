import { POINTS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export async function isLiquidityProvider(
  address: string,
  chainId: string | null
) : Promise<boolean | null> {
  try {
    // Both Mainnet and Sepolia use the same API URL configuration for now
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/is-liquidity-provider/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to check liquidity provider status: ${response.status}`);
    }
    const isLp: boolean = await response.json();
    if (typeof isLp !== 'boolean') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(isLp)}`);
    }
    return isLp;
  } catch (err) {
    console.error('Error checking liquidity provider status:', err);
    return null;
  }
}
