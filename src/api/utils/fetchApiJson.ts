// api/utils/fetchApiJson.ts
import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

interface FetchApiJsonParams {
  apiUrls: Record<string, string>;
  chainId: string | null;
  path: string;
  on404?: () => any;
}

export async function fetchApiJson<T>({
  apiUrls,
  chainId,
  path,
  on404,
}: FetchApiJsonParams): Promise<T | null> {
  try {
    const apiUrl = apiUrls[chainId || DEFAULT_CHAIN_ID_STRING];

    if (!apiUrl) {
      throw new Error(`No API URL found for chainId: ${chainId}`);
    }

    const response = await fetchWithTimeout(`${apiUrl}${path}`);

    if (!response.ok) {
      if (response.status === 404 && on404) {
        return on404();
      }
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch (err) {
      throw new Error(`Failed to parse JSON: ${err}`);
    }

    if (!data || typeof data !== 'object') {
      throw new Error(`Server returned non-object response`);
    }

    return data as T;
  } catch (err) {
    console.error('API fetch error:', err);
    return null;
  }
}
