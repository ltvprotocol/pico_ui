import { API_URLS, TERMS_API_URLS } from '@/config';
import { SEPOLIA_CHAIN_ID_STRING } from '@/constants';

export interface ApyResponse {
  apy: number;
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

export async function fetchApy(vaultAddress: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/apy/${vaultAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch APY: ${response.status}`);
    }
    const data: ApyResponse = await response.json();
    if (typeof data.apy !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }
    return data.apy;
  } catch (error) {
    console.error('Error fetching APY:', error);
    return null;
  }
}

export async function fetchPointsRate(vaultAddress: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/points-rate/${vaultAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch points rate: ${response.status}`);
    }
    const data: PointsRateResponse = await response.json();
    if (typeof data.pointsPerDay !== 'number') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }
    return data.pointsPerDay;
  } catch (error) {
    console.error('Error fetching points rate:', error);
    return null;
  }
}

export async function fetchTermsOfUseText(chainId: string | null): Promise<string | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use-text`);
    if (!response.ok) {
      throw new Error(`Failed to fetch terms of use text: ${response.status}`);
    }
    const data: TermsOfUseTextResponse = await response.json();
    if (typeof data.text !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }
    return data.text;
  } catch (error) {
    console.error('Error fetching terms of use text:', error);
    return null;
  }
}

export async function checkTermsOfUseStatus(address: string, chainId: string | null): Promise<TermsOfUseStatusResponse | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to check terms of use status: ${response.status}`);
    }
    const data: TermsOfUseStatusResponse = await response.json();
    if (typeof data.signed !== 'boolean' || typeof data.signed_at !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }
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
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
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
    if (typeof data.success !== 'boolean' || typeof data.message !== 'string' || typeof data.signed_at !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error('Error submitting terms of use signature:', error);
    return null;
  }
}

export async function fetchIsLiquidityProvider(address: string, chainId: string | null): Promise<boolean | null> {
  try {
    // Both Mainnet and Sepolia use the same API URL configuration for now
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/is-liquidity-provider/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to check liquidity provider status: ${response.status}`);
    }
    const isLp: boolean = await response.json();
    if (typeof isLp !== 'boolean') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(isLp)}`);
    }
    return isLp;
  } catch (error) {
    console.error('Error checking liquidity provider status:', error);
    return null;
  }
}

export async function fetchUserPoints(address: string, chainId: string | null): Promise<number | null> {
  try {
    const apiUrl = API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || API_URLS[SEPOLIA_CHAIN_ID_STRING];
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
  } catch (error) {
    console.error('Error fetching user points:', error);
    return null;
  }
}
