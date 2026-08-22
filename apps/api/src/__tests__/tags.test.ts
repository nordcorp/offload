import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;

beforeAll(async () => { app = await buildApp(); });
afterAll(async () => { await app.close(); });

beforeEach(async () => {
  await app.prisma.taskTag.deleteMany();
  await app.prisma.task.deleteMany();
  await app.prisma.tag.deleteMany();
  await app.prisma.project.deleteMany();
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.user.deleteMany();
  const res = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { email: 'tag@test.com', password: 'password123', name: 'Tag User' },
  });
  accessToken = res.json().accessToken;
});

const auth = () => ({ authorization: `Bearer ${accessToken}` });

describe('Tags CRUD', () => {
  it('creates, lists, updates, deletes a tag', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/tags', headers: auth(),
      payload: { name: 'work', color: '#ef4444' },
    });
    expect(created.statusCode).toBe(201);
    const tagId = created.json().id;

    const list = await app.inject({ method: 'GET', url: '/api/tags', headers: auth() });
    expect(list.json()).toHaveLength(1);

    const updated = await app.inject({
      method: 'PATCH', url: `/api/tags/${tagId}`, headers: auth(),
      payload: { name: 'personal' },
    });
    expect(updated.json().name).toBe('personal');

    const deleted = await app.inject({ method: 'DELETE', url: `/api/tags/${tagId}`, headers: auth() });
    expect(deleted.statusCode).toBe(204);
  });
});

describe('Task-Tag linking', () => {
  it('assigns and unassigns tag to task', async () => {
    const tag = await app.inject({
      method: 'POST', url: '/api/tags', headers: auth(),
      payload: { name: 'urgent', color: '#ff0000' },
    });
    const task = await app.inject({
      method: 'POST', url: '/api/tasks', headers: auth(),
      payload: { title: 'Tagged task' },
    });
    const tagId = tag.json().id;
    const taskId = task.json().id;

    const assign = await app.inject({
      method: 'POST', url: `/api/tasks/${taskId}/tags`, headers: auth(),
      payload: { tagId },
    });
    expect(assign.statusCode).toBe(204);

    const inbox = await app.inject({ method: 'GET', url: '/api/tasks/inbox', headers: auth() });
    expect(inbox.json()[0].tags).toHaveLength(1);
    expect(inbox.json()[0].tags[0].name).toBe('urgent');

    const unassign = await app.inject({
      method: 'DELETE', url: `/api/tasks/${taskId}/tags/${tagId}`, headers: auth(),
    });
    expect(unassign.statusCode).toBe(204);
  });
});
