// Simple API request helper for fetch calls
export async function apiRequest(method: string, url: string, body?: any, headers: Record<string, string> = {}) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response;
}
