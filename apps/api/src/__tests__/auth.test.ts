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
