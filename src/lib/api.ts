/**
 * Resilient API client for Agent Zero
 * Safely handles server reboots, network glitches, and JSON parsing
 * without unhandled promise rejections or console errors.
 */

export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 8000
): Promise<{ ok: boolean; data: T | null; error?: string; status?: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Append timestamp query parameter to bust any browser or proxy cache on GET requests
  const separator = url.includes('?') ? '&' : '?';
  const noCacheUrl = (options?.method === 'POST' || options?.method === 'PUT' || options?.method === 'DELETE') 
    ? url 
    : `${url}${separator}_t=${Date.now()}`;

  try {
    const res = await fetch(noCacheUrl, {
      ...options,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(options?.headers || {})
      }
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        data: null,
        status: res.status,
        error: `Invalid response format from ${url}`
      };
    }

    const data = (await res.json()) as T;
    return {
      ok: res.ok,
      data,
      status: res.status,
      error: res.ok ? undefined : (data as any)?.error || `HTTP ${res.status}`
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      data: null,
      error: err.name === 'AbortError' ? 'Request timed out' : err.message
    };
  }
}

export async function safePostJson<T>(
  url: string,
  body?: any,
  timeoutMs: number = 10000
): Promise<{ ok: boolean; data: T | null; error?: string; status?: number }> {
  return safeFetchJson<T>(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    },
    timeoutMs
  );
}
