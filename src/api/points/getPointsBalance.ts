import { POINTS_API_URLS } from '@/config';
import { fetchApiJson } from '@/api/utils/fetchApiJson';

export interface PointsBalanceResponse {
  points: number;
}

export async function getPointsBalance(
  address: string,
  chainId: string | null
) : Promise<number | null> {
  try {
    const data = await fetchApiJson<PointsBalanceResponse>({
      apiUrls: POINTS_API_URLS,
      chainId,
      path: `/points/${address}`,
      on404: () => ({ points: 0 }),
    });

    if (!data) return null;
    const points = data.points;

    if (typeof points !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return points;
  } catch (err) {
    console.error('Error fetching user points:', err);
    return null;
  }
}
