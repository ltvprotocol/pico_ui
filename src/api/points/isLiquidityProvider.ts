import { POINTS_API_URLS } from '@/config';
import { fetchApiValue } from '@/api/utils/fetchApiValue';

export async function isLiquidityProvider(
  address: string,
  chainId: string | null
) : Promise<boolean | null> {
  try {
    const isLp = await fetchApiValue<boolean>({
      apiUrls: POINTS_API_URLS,
      chainId,
      path: `/is-liquidity-provider/${address}`,
    });

    if (typeof isLp !== 'boolean') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(isLp)}`);
    }
    
    return isLp;
  } catch (err) {
    console.error('Error checking liquidity provider status:', err);
    return null;
  }
}
