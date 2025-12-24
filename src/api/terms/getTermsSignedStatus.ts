import { TERMS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export interface TermsSignedStatusResponse {
  signed: boolean;
  signed_at: string | null;
}

export async function getTermsSignedStatus(
  address: string,
  chainId: string | null
): Promise<TermsSignedStatusResponse | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING] || TERMS_API_URLS[DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use/${address}`);

    if (!response.ok) {
      throw new Error(`Failed to check terms of use status: ${response.status}`);
    }

    const data: TermsSignedStatusResponse = await response.json();

    if (typeof data.signed !== 'boolean' || typeof data.signed_at !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (err) {
    console.error('Error checking terms of use status:', err);
    return null;
  }
}
