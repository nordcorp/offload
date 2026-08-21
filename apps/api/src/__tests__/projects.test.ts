import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;

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
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'proj@test.com', password: 'password123', name: 'Proj User' },
  });
  accessToken = res.json().accessToken;
});

const auth = () => ({ authorization: `Bearer ${accessToken}` });

describe('GET /api/projects', () => {
  it('returns empty list initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/projects', headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('rejects unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/projects', () => {
  it('creates project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: auth(),
      payload: { name: 'Work', color: '#3b82f6' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Work');
    expect(res.json().color).toBe('#3b82f6');
    expect(res.json().sortOrder).toBe(0);
  });
});

describe('PATCH /api/projects/:id', () => {
  it('updates project name', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: auth(),
      payload: { name: 'Old', color: '#000000' },
    });
    const id = created.json().id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/projects/${id}`,
      headers: auth(),
      payload: { name: 'New' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('New');
  });
});

describe('DELETE /api/projects/:id', () => {
  it('deletes project', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: auth(),
      payload: { name: 'Del', color: '#ff0000' },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${created.json().id}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('PATCH /api/projects/reorder', () => {
  it('updates sort order', async () => {
    const p1 = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: auth(),
        payload: { name: 'A', color: '#111111' },
      })
    ).json();
    const p2 = (
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: auth(),
        payload: { name: 'B', color: '#222222' },
      })
    ).json();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/projects/reorder',
      headers: auth(),
      payload: {
        items: [
          { id: p1.id, sortOrder: 1 },
          { id: p2.id, sortOrder: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(204);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: auth(),
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list[0].id).toBe(p2.id);
    expect(list[1].id).toBe(p1.id);
  });
});
