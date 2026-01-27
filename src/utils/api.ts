import { POINTS_API_URLS, APY_API_URLS, TERMS_API_URLS, NFT_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';

export interface ApyData {
  "30d_apy": number;
  "7d_apy": number;
}

export interface PointsRateResponse {
  pointsPerDay: number;
}

export interface TermsOfUseTextResponse {
  text: string;
}

export interface TermsOfUseStatusResponse {
  signed: boolean;
  signed_at: string | null;
}

export interface TermsOfUseSignResponse {
  success: boolean;
  message: string;
  signed_at: string;
}

export interface IsWhitelistedResponse {
  detail?: string;
  isWhitelisted?: boolean;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function fetchApy(
  vaultAddress: string,
  chainId: string | null
): Promise<ApyData | null> {
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

  } catch (error) {
    console.error('Error fetching APY:', error);
    return null;
  }
}

export async function fetchPointsRate(vaultAddress: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/points-rate/${vaultAddress}`);
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

export async function fetchTermsOfUseText(chainId: string | null): Promise<string | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING] || TERMS_API_URLS[DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use-text`);
    if (!response.ok) {
      throw new Error(`Failed to fetch terms of use text: ${response.status}`);
    }
    const data: TermsOfUseTextResponse = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error fetching terms of use text:', error);
    return null;
  }
}

export async function checkTermsOfUseStatus(address: string, chainId: string | null): Promise<TermsOfUseStatusResponse | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING] || TERMS_API_URLS[DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to check terms of use status: ${response.status}`);
    }
    const data: TermsOfUseStatusResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking terms of use status:', error);
    return null;
  }
}

export async function submitTermsOfUseSignature(
  address: string,
  signature: string,
  chainId: string | null
): Promise<TermsOfUseSignResponse | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING] || TERMS_API_URLS[DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use/${address}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signature }),
    });
    if (!response.ok) {
      throw new Error(`Failed to submit terms of use signature: ${response.status}`);
    }
    const data: TermsOfUseSignResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting terms of use signature:', error);
    return null;
  }
}

export async function fetchIsLiquidityProvider(address: string, chainId: string | null): Promise<boolean | null> {
  try {
    // Both Mainnet and Sepolia use the same API URL configuration for now
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/is-liquidity-provider/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to check liquidity provider status: ${response.status}`);
    }
    const isLp: boolean = await response.json();
    return isLp;
  } catch (error) {
    console.error('Error checking liquidity provider status:', error);
    return null;
  }
}

export async function fetchUserPoints(address: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = POINTS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/points/${address}`);
    if (!response.ok) {
      if (response.status === 404) {
        return 0;
      }
      throw new Error(`Failed to fetch user points: ${response.status}`);
    }
    const data = await response.json();
    // Handle both object {points: number} and raw number formats
    if (typeof data === 'number') {
      return data;
    }
    return data && typeof data.points === 'number' ? data.points : 0;
  } catch (error) {
    console.error('Error fetching user points:', error);
    return null;
  }
}

export async function isAddressWhitelistedToMint(
  addressToCheck: string,
  chainId: string | null
): Promise<boolean | null> {
  try {
    const apiUrl = NFT_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];

    if (!apiUrl) {
      throw new Error(`No API URL found for chainId: ${chainId}`);
    }

    const response = await fetchWithTimeout(
      `${apiUrl}/whitelist/${addressToCheck}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      throw new Error(`Failed to fetch whitelist status: ${response.status}`);
    }

    const data: IsWhitelistedResponse = await response.json();

    if (typeof data.isWhitelisted === 'boolean') {
      return data.isWhitelisted;
    }

    if (data.detail === 'Address not found') {
      return false;
    }

    throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('Error fetching whitelist status:', err);
    return null;
  }
}

export function refreshTokenHolders(chainId: string | null): void {
  try {
    const apiUrl = NFT_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING];
    if (!apiUrl) return;

    fetch(`${apiUrl}/refresh-token-holders`, { method: 'POST' })
      .catch(() => { }); // Silently ignore errors
  } catch {
    // Silently ignore errors
  }
}

interface BlockscoutNftItem {
  id: string;
  token: {
    address_hash: string;
  };
}

interface BlockscoutNftResponse {
  items: BlockscoutNftItem[];
  next_page_params: any;
}

export async function getUser42Nfts(address: string): Promise<string[]> {
  const BLOCKSCOUT_API_URL = `https://eth.blockscout.com/api/v2/addresses/${address}/nft?type=ERC-721`;
  const CONTRACT_ADDRESS = '0xf478f017cfe92aaf83b2963a073fabf5a5cd0244'; // Lowercase for explicit check

  try {
    const response = await fetchWithTimeout(BLOCKSCOUT_API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Blockscout API error: ${response.status}`);
    }

    const result: BlockscoutNftResponse = await response.json();

    if (!result.items || !Array.isArray(result.items)) {
      return [];
    }

    return result.items
      .filter((item) => item.token && item.token.address_hash && item.token.address_hash.toLowerCase() === CONTRACT_ADDRESS)
      .map((item) => item.id);
  } catch (error) {
    console.error('Error fetching user NFTs from Blockscout:', error);
    return [];
  }
}
