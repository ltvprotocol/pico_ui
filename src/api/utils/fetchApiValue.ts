import { DEFAULT_CHAIN_ID_STRING } from '@/constants';
import { fetchWithTimeout } from '@/api/client/request';

interface FetchApiValueParams {
  apiUrls: Record<string, string>;
  chainId: string | null;
  path: string;
}

export async function fetchApiValue<T>({
  apiUrls,
  chainId,
  path,
}: FetchApiValueParams): Promise<T | null> {
  try {
    const apiUrl = apiUrls[chainId || DEFAULT_CHAIN_ID_STRING];

    if (!apiUrl) {
      throw new Error(`No API URL found for chainId: ${chainId}`);
    }

    const response = await fetchWithTimeout(`${apiUrl}${path}`);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (err) {
    console.error('API fetch error:', err);
    return null;
  }
}
