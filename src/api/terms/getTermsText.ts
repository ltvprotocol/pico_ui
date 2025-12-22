import { TERMS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export interface TermsTextResponse {
  text: string;
}

export async function getTermsText(
  chainId: string | null
) : Promise<string | null> {
  try {
    const apiUrl = TERMS_API_URLS[chainId || DEFAULT_CHAIN_ID_STRING] || TERMS_API_URLS[DEFAULT_CHAIN_ID_STRING];
    const response = await fetchWithTimeout(`${apiUrl}/terms-of-use-text`);

    if (!response.ok) {
      throw new Error(`Failed to fetch terms of use text: ${response.status}`);
    }

    const data: TermsTextResponse = await response.json();

    if (typeof data.text !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return data.text;
  } catch (err) {
    console.error('Error fetching terms of use text:', err);
    return null;
  }
}
