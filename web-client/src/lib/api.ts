const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_BASE}/api/csrf-token`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.token as string;
  return csrfToken;
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { json, ...init } = options;
  const method = init.method ?? 'GET';

  for (let attempt = 0; attempt < 2; attempt++) {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      ...(init.headers as Record<string, string>),
    };

    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(json);
    }

    if (STATE_CHANGING_METHODS.has(method)) {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 403) {
        csrfToken = null;
        if (attempt === 0) continue;
      }
      const body = await res.json().catch(() => ({}));
      const message =
        (body as { message?: string })?.message ||
        (body as { error?: { message?: string } })?.error?.message ||
        `Request failed: ${res.status}`;
      throw new Error(message);
    }

    if (res.status === 204 || res.headers.get('Content-Length') === '0') {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  }
  throw new Error('CSRF validation failed');
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, json: unknown) =>
    apiFetch<T>(path, { method: 'POST', json }),
  patch: <T>(path: string, json: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', json }),
  del: (path: string) => apiFetch(path, { method: 'DELETE' }),
};

export function getSSEUrl(path: string): string {
  return `${API_BASE}${path}`;
}
