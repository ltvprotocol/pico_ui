import { TERMS_API_URLS } from '@/config';
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

export interface TermsSubmitSignatureResponse {
  success: boolean;
  message: string;
  signed_at: string;
}

export async function submitTermsSignature(
  address: string,
  signature: string,
  chainId: string | null
): Promise<TermsSubmitSignatureResponse | null> {
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
    };

    const data: TermsSubmitSignatureResponse = await response.json();

    if (typeof data.success !== 'boolean' || typeof data.message !== 'string' || typeof data.signed_at !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    };

    return data;
  } catch (err) {
    console.error('Error submitting terms of use signature:', err);
    return null;
  }
}
