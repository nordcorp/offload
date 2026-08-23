import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;
let projectId: string;

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
  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'task@test.com', password: 'password123', name: 'Task User' },
  });
  accessToken = reg.json().accessToken;
  const proj = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name: 'Work', color: '#3b82f6' },
  });
  projectId = proj.json().id;
});

const auth = () => ({ authorization: `Bearer ${accessToken}` });

describe('POST /api/tasks', () => {
  it('creates task in project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Buy milk', projectId, priority: 2, urgent: true, important: false },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe('Buy milk');
    expect(res.json().priority).toBe(2);
    expect(res.json().urgent).toBe(true);
  });

  it('creates inbox task (no projectId)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Quick thought' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().projectId).toBeNull();
  });
});

describe('GET /api/tasks/inbox', () => {
  it('returns only tasks without project', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'In project', projectId },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'In inbox' },
    });
    const res = await app.inject({ method: 'GET', url: '/api/tasks/inbox', headers: auth() });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].title).toBe('In inbox');
  });
});

describe('GET /api/projects/:id/tasks', () => {
  it('returns project tasks', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'First', projectId },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Second', projectId },
    });
    const res = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/tasks`, headers: auth() });
    expect(res.json()).toHaveLength(2);
  });

  it('returns 400 VALIDATION_ERROR on invalid project UUID', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/projects/not-a-valid-uuid/tasks', headers: auth() });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('completes a task and sets completedAt', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Done', projectId },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.json().id}`,
      headers: auth(),
      payload: { completed: true },
    });
    expect(res.json().completed).toBe(true);
    expect(res.json().completedAt).toBeDefined();
  });

  it('returns 400 VALIDATION_ERROR on invalid task UUID', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/not-a-valid-uuid',
      headers: auth(),
      payload: { completed: true },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/tasks/matrix', () => {
  it('groups tasks by Eisenhower quadrants', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'UrgImp', urgent: true, important: true },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'NotUrgImp', urgent: false, important: true },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'UrgNotImp', urgent: true, important: false },
    });
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Neither' },
    });
    const res = await app.inject({ method: 'GET', url: '/api/tasks/matrix', headers: auth() });
    const body = res.json();
    expect(body.urgent_important).toHaveLength(1);
    expect(body.not_urgent_important).toHaveLength(1);
    expect(body.urgent_not_important).toHaveLength(1);
    expect(body.not_urgent_not_important).toHaveLength(1);
  });

  it('returns 400 VALIDATION_ERROR on invalid projectId query param', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tasks/matrix?projectId=invalid-uuid', headers: auth() });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes task', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: auth(),
      payload: { title: 'Delete me' },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${created.json().id}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(204);
  });

  it('returns 400 VALIDATION_ERROR on invalid task UUID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/tasks/not-a-valid-uuid',
      headers: auth(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/tasks/reorder', () => {
  it('reorders tasks successfully', async () => {
    const t1 = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: auth(),
        payload: { title: 'Task 1', projectId },
      })
    ).json();
    const t2 = (
      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: auth(),
        payload: { title: 'Task 2', projectId },
      })
    ).json();

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/reorder',
      headers: auth(),
      payload: {
        items: [
          { id: t1.id, sortOrder: 1 },
          { id: t2.id, sortOrder: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(204);

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/tasks`,
      headers: auth(),
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list[0].id).toBe(t2.id);
    expect(list[1].id).toBe(t1.id);
  });
});
