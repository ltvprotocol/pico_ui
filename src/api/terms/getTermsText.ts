import { TERMS_API_URLS } from '@/config';
import { fetchApiJson } from "@/api/utils/fetchApiJson";

export interface TermsTextResponse {
  text: string;
}

export async function getTermsText(
  chainId: string | null
) : Promise<string | null> {
  try {
    const data = await fetchApiJson<TermsTextResponse>({
      apiUrls: TERMS_API_URLS,
      chainId,
      path: `/terms-of-use-text`,
    });

    if (!data) return null;
    const text = data.text;

    if (typeof text !== 'string') {
      throw new Error(`Server returned invalid data: ${JSON.stringify(data)}`);
    }

    return text;
  } catch (err) {
    console.error('Error fetching terms of use text:', err);
    return null;
  }
}
