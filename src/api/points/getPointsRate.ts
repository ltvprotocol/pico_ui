import { POINTS_API_URLS } from '@/config';
import { fetchApiJson } from '@/api/utils/fetchApiJson';

export interface PointsRateResponse {
  pointsPerDay: number;
}

export async function getPointsRate(
  vaultAddress: string,
  chainId: string | null
) : Promise<number | null> {
  try {
    const data = await fetchApiJson<PointsRateResponse>({
      apiUrls: POINTS_API_URLS,
      chainId,
      path: `/points-rate/${vaultAddress}`
    });

    if (!data) return null;
    const pointsPerDay = data.pointsPerDay;

    if (typeof pointsPerDay !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return pointsPerDay;
  } catch (err) {
    console.error('Error fetching points rate:', err);
    return null;
  }
}
