import { POINTS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export async function getPointsBalance(
  address: string,
  chainId: string | null
) : Promise<number | null> {
  try {
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/points/${address}`);

    if (!response.ok) {
      if (response.status === 404) {
        return 0;
      }
      throw new Error(`Failed to fetch user points: ${response.status}`);
    }

    const data: { points: number } = await response.json();

    if (typeof data.points !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return data.points;
  } catch (err) {
    console.error('Error fetching user points:', err);
    return null;
  }
}
