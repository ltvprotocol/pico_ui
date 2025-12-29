import { POINTS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export interface PointsRateResponse {
  pointsPerDay: number;
}

export async function getPointsRate(
  vaultAddress: string,
  chainId: string | null
) : Promise<number | null> {
  try {
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/points-rate/${vaultAddress}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch points rate: ${response.status}`);
    }

    const data: PointsRateResponse = await response.json();

    if (typeof data.pointsPerDay !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return data.pointsPerDay;
  } catch (err) {
    console.error('Error fetching points rate:', err);
    return null;
  }
}
