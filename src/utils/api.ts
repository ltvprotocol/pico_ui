import { API_URLS } from '@/config';
import { SEPOLIA_CHAIN_ID_STRING } from '@/constants';

export interface ApyResponse {
  apy: number;
}

export interface PointsRateResponse {
  pointsPerDay: number;
}

export async function fetchApy(vaultAddress: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING];
    const response = await fetch(`${apiUrl}/apy/${vaultAddress}`);
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

export async function fetchPointsRate(vaultAddress: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetch(`${apiUrl}/points-rate/${vaultAddress}`);
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
