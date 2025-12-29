import { TERMS_API_URLS } from '@/config';
import { fetchApiJson } from "@/api/utils/fetchApiJson";

export interface TermsSignedStatusResponse {
  signed: boolean;
  signed_at: string | null;
}

export async function getTermsSignedStatus(
  address: string,
  chainId: string | null
): Promise<TermsSignedStatusResponse | null> {
  try {
    const data = await fetchApiJson<TermsSignedStatusResponse>({
      apiUrls: TERMS_API_URLS,
      chainId,
      path: `/terms-of-use/${address}`,
    });

    if (!data) return null;

    if (typeof data.signed !== 'boolean' || typeof data.signed_at !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (err) {
    console.error('Error checking terms of use status:', err);
    return null;
  }
}
