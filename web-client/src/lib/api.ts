const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
    json?: unknown;
}

async function apiFetch<T>(
    path: string,
    options: FetchOptions = {},
): Promise<T> {
    const { json, ...init } = options;

    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        ...(init.headers as Record<string, string>),
    };

    if (json !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(json);
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
            (body as { error?: { message?: string } })?.error?.message ||
            `Request failed: ${res.status}`;
        throw new Error(message);
    }

    return res.json() as Promise<T>;
}

export const api = {
    get: <T>(path: string) => apiFetch<T>(path),
    post: <T>(path: string, json: unknown) =>
        apiFetch<T>(path, { method: 'POST', json }),
};

export function getSSEUrl(path: string): string {
    return `${API_BASE}${path}`;
}
