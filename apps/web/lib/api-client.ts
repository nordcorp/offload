import type { User } from '@offload/shared';

let accessToken: string | null = null;

export interface RefreshSession {
  accessToken: string;
  user: User;
}

export type SessionEvent =
  | { type: 'updated'; session: RefreshSession }
  | { type: 'lost' };

type SessionListener = (event: SessionEvent) => void;

let refreshPromise: Promise<RefreshSession | null> | null = null;
const sessionListeners = new Set<SessionListener>();

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

export function subscribeSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function publishSessionEvent(event: SessionEvent): void {
  sessionListeners.forEach(listener => listener(event));
}

function loseSession(): void {
  setAccessToken(null);
  publishSessionEvent({ type: 'lost' });
}

async function readResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  return contentType?.includes('application/json')
    ? response.json()
    : response.text();
}

async function toApiError(response: Response): Promise<ApiErrorResponse> {
  const data = await readResponse(response);
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

  return new ApiErrorResponse(response.status, errorMessage, errorCode, errorDetails);
}

async function performRefresh(): Promise<RefreshSession | null> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });

  if (response.status === 401 || response.status === 403) {
    loseSession();
    return null;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const session = (await response.json()) as RefreshSession;
  setAccessToken(session.accessToken);
  publishSessionEvent({ type: 'updated', session });
  return session;
}

export function refreshSession(): Promise<RefreshSession | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
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

  const isPublicAuthPath = url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh');

  if (!accessToken && !isPublicAuthPath) {
    const session = await refreshSession();
    if (!session) {
      throw new ApiErrorResponse(401, 'Session expired', 'UNAUTHORIZED');
    }
  }

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
  if (response.status === 401 && !isPublicAuthPath) {
    const session = await refreshSession();

    if (session) {
      // Retry original request with new token
      headers.set('Authorization', `Bearer ${session.accessToken}`);
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (response.status === 401) {
        loseSession();
      }
    }
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return await readResponse(response) as T;
}
