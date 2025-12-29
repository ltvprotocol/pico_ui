import { APY_API_URLS } from '@/config';
import { fetchApiJson } from '@/api/utils/fetchApiJson';

export interface ApyData {
  "30d_apy": number;
  "7d_apy": number;
}

export async function getTimedApy(
  vaultAddress: string,
  chainId: string | null
) : Promise<ApyData | null> {
  try {
    const data = await fetchApiJson<ApyData>({
      apiUrls: APY_API_URLS,
      chainId,
      path: `/timed-apy/${vaultAddress}`,
    });

    if (!data) return null;
    
    const rawApy30d = data['30d_apy'];
    const rawApy7d = data['7d_apy'];

    if (typeof rawApy30d !== 'number' || typeof rawApy7d !== 'number') {
      throw new Error(`Server returned invalid data types: ${JSON.stringify(data)}`);
    }

    /* 
      API returns values as decimals (e.g. 0.1042 for 10.42%)
      We multiply by 100 to receive human-readable values for the UI.
      If one value is missing APY show that failed to load every value
    */
    const MULTIPLIER = 100;
    const formattedApy30 = rawApy30d * MULTIPLIER;
    const formattedApy7 = rawApy7d * MULTIPLIER;

    return {
      "30d_apy": formattedApy30,
      "7d_apy": formattedApy7
    };

  } catch (err) {
    console.error('Error fetching APY:', err);
    return null;
  }
}
