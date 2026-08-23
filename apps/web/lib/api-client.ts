import type { User } from '@offload/shared';

let accessToken: string | null = null;

export interface RefreshSession {
  accessToken: string;
  user: User;
}

let refreshPromise: Promise<RefreshSession | null> | null = null;

export class ApiErrorResponse extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function performRefresh(): Promise<RefreshSession | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('offload_user');
      }
      return null;
    }

    const data = (await res.json()) as RefreshSession;
    setAccessToken(data.accessToken);
    return data;
  } catch {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offload_user');
    }
    return null;
  } finally {
    refreshPromise = null;
  }
}

export function refreshSession(): Promise<RefreshSession | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh();
  }

  return refreshPromise;
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : path.startsWith('/')
      ? path
      : `/api/${path}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials ?? 'include',
  };

  let response = await fetch(url, fetchOptions);

  // Auto silent refresh on 401
  const isAuthPath = url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh');

  if (response.status === 401 && !isAuthPath) {
    const session = await refreshSession();

    if (session) {
      // Retry original request with new token
      headers.set('Authorization', `Bearer ${session.accessToken}`);
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === 'object' && data !== null && 'error' in data
      ? (data as { error: string }).error
      : typeof data === 'string' && data.length > 0
        ? data
        : `Request failed with status ${response.status}`;

    const errorCode = typeof data === 'object' && data !== null && 'code' in data
      ? (data as { code?: string }).code
      : undefined;

    const errorDetails = typeof data === 'object' && data !== null && 'details' in data
      ? (data as { details?: Record<string, unknown> }).details
      : undefined;

    throw new ApiErrorResponse(response.status, errorMessage, errorCode, errorDetails);
  }

  return data as T;
}
