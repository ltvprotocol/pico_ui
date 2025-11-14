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

export async function fetchTermsOfUseText(chainId: string | null): Promise<string | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetch(`${apiUrl}/terms-of-use-text`);
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
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetch(`${apiUrl}/terms-of-use/${address}`);
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
    const apiUrl = TERMS_API_URLS[chainId || SEPOLIA_CHAIN_ID_STRING] || TERMS_API_URLS[SEPOLIA_CHAIN_ID_STRING];
    const response = await fetch(`${apiUrl}/terms-of-use/${address}`, {
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
