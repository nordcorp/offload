import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await app.prisma.taskTag.deleteMany();
  await app.prisma.task.deleteMany();
  await app.prisma.tag.deleteMany();
  await app.prisma.project.deleteMany();
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.user.deleteMany();
});

describe('POST /api/auth/register', () => {
  it('creates user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@test.com', password: 'password123', name: 'Test User' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe('test@test.com');
    expect(body.user.name).toBe('Test User');
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(res.cookies.find(c => c.name === 'refreshToken')).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    const payload = { email: 'dup@test.com', password: 'password123', name: 'Dup' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(res.statusCode).toBe(409);
  });

  it('rejects invalid input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'bad', password: '123', name: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'login@test.com', password: 'password123', name: 'Login' },
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token with valid refresh cookie', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ref@test.com', password: 'password123', name: 'Ref' },
    });
    const cookie = reg.cookies.find(c => c.name === 'refreshToken');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      cookies: { refreshToken: cookie!.value },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
    expect(body.user).toEqual(expect.objectContaining({
      email: 'ref@test.com',
      name: 'Ref',
    }));
    expect(body.user).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/auth/session', () => {
  async function register(email: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'password123', name: 'Session User' },
    });

    return {
      accessToken: response.json().accessToken as string,
      refreshToken: response.cookies.find(cookie => cookie.name === 'refreshToken')!.value,
    };
  }

  function checkSession(accessToken: string, refreshToken?: string) {
    return app.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { authorization: `Bearer ${accessToken}` },
      cookies: refreshToken ? { refreshToken } : undefined,
    });
  }

  it('returns 204 for a valid access and refresh token pair without rotating it', async () => {
    const session = await register('session-valid@test.com');
    const tokensBefore = await app.prisma.refreshToken.findMany();

    const first = await checkSession(session.accessToken, session.refreshToken);
    const second = await checkSession(session.accessToken, session.refreshToken);
    const tokensAfter = await app.prisma.refreshToken.findMany();

    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(204);
    expect(first.cookies).toEqual([]);
    expect(tokensAfter).toEqual(tokensBefore);
  });

  it('returns 401 UNAUTHORIZED when the refresh cookie is missing', async () => {
    const session = await register('session-missing@test.com');

    const response = await checkSession(session.accessToken);

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for an expired refresh token', async () => {
    const session = await register('session-expired@test.com');
    await app.prisma.refreshToken.update({
      where: { token: session.refreshToken },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const response = await checkSession(session.accessToken, session.refreshToken);

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for a deleted refresh token', async () => {
    const session = await register('session-deleted@test.com');
    await app.prisma.refreshToken.delete({ where: { token: session.refreshToken } });

    const response = await checkSession(session.accessToken, session.refreshToken);

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED when the tokens belong to different users', async () => {
    const first = await register('session-first@test.com');
    const second = await register('session-second@test.com');

    const response = await checkSession(first.accessToken, second.refreshToken);

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('returns 401 UNAUTHORIZED for an invalid access token', async () => {
    const session = await register('session-access@test.com');

    const response = await checkSession('invalid-access-token', session.refreshToken);

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears refresh token', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'out@test.com', password: 'password123', name: 'Out' },
    });
    const cookie = reg.cookies.find(c => c.name === 'refreshToken');
    const accessToken = reg.json().accessToken;
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      cookies: { refreshToken: cookie!.value },
    });
    expect(res.statusCode).toBe(204);
  });
});
