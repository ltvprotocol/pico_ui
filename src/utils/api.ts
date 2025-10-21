import { CONFIG } from '@/config';

export interface ApyResponse {
  apy: number;
}

export interface PointsRateResponse {
  pointsPerDay: number;
}

export async function fetchApy(vaultAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`${CONFIG.API}/apy/${vaultAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch APY: ${response.status}`);
    }
    const data: ApyResponse = await response.json();
    return data.apy;
  } catch (error) {
    console.error('Error fetching APY:', error);
    return null;
  }
}

export async function fetchPointsRate(vaultAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`${CONFIG.API}/points-rate/${vaultAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch points rate: ${response.status}`);
    }
    const data: PointsRateResponse = await response.json();
    return data.pointsPerDay;
  } catch (error) {
    console.error('Error fetching points rate:', error);
    return null;
  }
}
