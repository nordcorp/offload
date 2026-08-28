import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionEvent } from './api-client';

const user = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('API client session lifecycle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('publishes the new access token and user after a successful refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ accessToken: 'new-token', user }));
    vi.stubGlobal('fetch', fetchMock);
    const client = await import('./api-client');
    const events: SessionEvent[] = [];
    client.subscribeSession(event => events.push(event));

    const session = await client.refreshSession();

    expect(session).toEqual({ accessToken: 'new-token', user });
    expect(client.getAccessToken()).toBe('new-token');
    expect(events).toEqual([{ type: 'updated', session }]);
  });

  it.each([401, 403])('clears and publishes session loss when refresh returns %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, status)));
    const client = await import('./api-client');
    const events: SessionEvent[] = [];
    client.setAccessToken('old-token');
    client.subscribeSession(event => events.push(event));

    await expect(client.refreshSession()).resolves.toBeNull();

    expect(client.getAccessToken()).toBeNull();
    expect(events).toEqual([{ type: 'lost' }]);
  });

  it.each([
    ['network failure', () => Promise.reject(new TypeError('offline'))],
    ['server failure', () => Promise.resolve(jsonResponse({ error: 'Unavailable' }, 503))],
  ])('keeps the current session on a temporary %s', async (_name, responseFactory) => {
    vi.stubGlobal('fetch', vi.fn(responseFactory));
    const client = await import('./api-client');
    const events: SessionEvent[] = [];
    client.setAccessToken('old-token');
    client.subscribeSession(event => events.push(event));

    await expect(client.refreshSession()).rejects.toThrow();

    expect(client.getAccessToken()).toBe('old-token');
    expect(events).toEqual([]);
  });

  it('restores a missing access token before a protected request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'restored-token', user }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const client = await import('./api-client');

    await expect(client.apiClient('/api/projects')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(requestHeaders.get('Authorization')).toBe('Bearer restored-token');
  });

  it('publishes session loss after a refreshed request is rejected again', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-token', user }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const client = await import('./api-client');
    const events: SessionEvent[] = [];
    client.setAccessToken('old-token');
    client.subscribeSession(event => events.push(event));

    await expect(client.apiClient('/api/projects')).rejects.toMatchObject({ status: 401 });

    expect(client.getAccessToken()).toBeNull();
    expect(events.map(event => event.type)).toEqual(['updated', 'lost']);
  });
});
