import { APY_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export interface ApyData {
  "30d_apy": number;
  "7d_apy": number;
}

export async function getTimedApy(
  vaultAddress: string,
  chainId: string | null
) : Promise<ApyData | null> {
  try {
    const apiUrl = APY_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];

    if (!apiUrl) {
      throw new Error(`No API URL found for chainId: ${chainId}`);
    }

    const response = await fetchWithTimeout(`${apiUrl}/timed-apy/${vaultAddress}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch APY: ${response.status} ${response.statusText}`);
    }

    let data: ApyData;

    try {
      data = await response.json();
    } catch (err) {
      throw new Error(`Failed to parse APY response as JSON: ${err}`);
    }

    if (!data || typeof data !== 'object') {
      throw new Error(`Server returned non-object response: ${typeof data}`);
    }
    
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
