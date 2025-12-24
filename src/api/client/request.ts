export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 5000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);
    
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
