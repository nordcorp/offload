# Offload Task Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-device task tracker with Eisenhower Matrix, projects, tags, priorities, and drag-and-drop — as a PWA.

**Architecture:** Monorepo with pnpm workspaces. `apps/web` (Next.js 16 App Router) serves the frontend as a PWA. `apps/api` (Fastify 5) provides a REST API with JWT auth. `packages/shared` contains Zod 4 schemas and TypeScript types shared between both apps. PostgreSQL via Prisma 7 ORM.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, @dnd-kit, @serwist/next, Fastify 5, Prisma 7, Zod 4, jose (JWT), bcryptjs, Vitest 4, Playwright

## Global Constraints

- Node.js >= 20 (required by Fastify 5)
- pnpm as package manager (workspaces)
- TypeScript strict mode everywhere
- All API request/response bodies validated with Zod schemas from `packages/shared`
- All data endpoints scoped to authenticated user's `userId`
- Tailwind CSS v4: CSS-first config (`@import "tailwindcss"` + `@theme`), no `tailwind.config.js`
- JWT via `jose` library (Web Crypto compatible, not `jsonwebtoken`)
- PWA via `@serwist/next` (not `next-pwa` — abandoned)
- Prisma 7 with `@prisma/adapter-pg` (Wasm engine, no Rust binary)
- TDD: write failing test → verify fail → implement → verify pass → commit
- Frequent small commits with conventional commit messages

---

### Task 1: Monorepo Infrastructure & Database Schema

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/project.ts`
- Create: `packages/shared/src/schemas/task.ts`
- Create: `packages/shared/src/schemas/tag.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/prisma/schema.prisma`
- Test: `packages/shared/src/__tests__/schemas.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `@offload/shared` package exporting all Zod schemas and inferred TS types
  - `z.infer<typeof loginSchema>` → `{ email: string; password: string }`
  - `z.infer<typeof registerSchema>` → `{ email: string; password: string; name: string }`
  - `z.infer<typeof createProjectSchema>` → `{ name: string; color: string }`
  - `z.infer<typeof updateProjectSchema>` → `{ name?: string; color?: string }`
  - `z.infer<typeof createTaskSchema>` → `{ title: string; projectId?: string; priority?: 1|2|3|4; urgent?: boolean; important?: boolean }`
  - `z.infer<typeof updateTaskSchema>` → partial of task fields
  - `z.infer<typeof createTagSchema>` → `{ name: string; color: string }`
  - `z.infer<typeof reorderSchema>` → `{ items: { id: string; sortOrder: number }[] }`
  - Prisma schema with User, Project, Task, Tag, TaskTag, RefreshToken models
  - Docker Compose running PostgreSQL on port 5432
  - Constants: `PRIORITY_COLORS`, `QUADRANT_LABELS`

- [ ] **Step 1: Initialize monorepo root**

Create root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `.gitignore`:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (root)
{
  "name": "offload",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter @offload/api prisma migrate dev",
    "db:generate": "pnpm --filter @offload/api prisma generate",
    "db:push": "pnpm --filter @offload/api prisma db push"
  },
  "engines": { "node": ">=20" }
}
```

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```
# .nvmrc
20
```

`.gitignore`: `node_modules`, `dist`, `.env`, `.next`, `prisma/*.db`

- [ ] **Step 2: Create Docker Compose for PostgreSQL**

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: offload
      POSTGRES_PASSWORD: offload
      POSTGRES_DB: offload
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
# .env.example
DATABASE_URL="postgresql://offload:offload@localhost:5432/offload"
JWT_SECRET="change-me-in-production-at-least-32-chars-long"
COOKIE_SECRET="change-me-in-production-at-least-32-chars-long"
```

Run: `docker compose up -d` — verify PostgreSQL starts.

- [ ] **Step 3: Create `packages/shared` with Zod schemas**

```json
// packages/shared/package.json
{
  "name": "@offload/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.1.0",
    "typescript": "^5.8.0"
  },
  "dependencies": {
    "zod": "^4.4.0"
  }
}
```

```ts
// packages/shared/src/constants.ts
export const PRIORITY_COLORS = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#3b82f6', // blue
  4: '#9ca3af', // gray
} as const;

export const QUADRANT_LABELS = {
  urgent_important: 'Do First',
  not_urgent_important: 'Schedule',
  urgent_not_important: 'Delegate',
  not_urgent_not_important: 'Eliminate',
} as const;

export type Priority = 1 | 2 | 3 | 4;
export type QuadrantKey = keyof typeof QUADRANT_LABELS;
```

```ts
// packages/shared/src/schemas/auth.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

```ts
// packages/shared/src/schemas/project.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
```

```ts
// packages/shared/src/schemas/task.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  priority: z.number().int().min(1).max(4).optional().default(4),
  urgent: z.boolean().optional().default(false),
  important: z.boolean().optional().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

```ts
// packages/shared/src/schemas/tag.ts
import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateTagSchema = createTagSchema.partial();

export const tagAssignSchema = z.object({
  tagId: z.string().uuid(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
```

```ts
// packages/shared/src/schemas/index.ts
import { z } from 'zod';

export * from './auth.js';
export * from './project.js';
export * from './task.js';
export * from './tag.js';

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
```

```ts
// packages/shared/src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  userId: string;
  createdAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: 1 | 2 | 3 | 4;
  urgent: boolean;
  important: boolean;
  projectId: string | null;
  userId: string;
  sortOrder: number;
  createdAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface MatrixResponse {
  urgent_important: Task[];
  not_urgent_important: Task[];
  urgent_not_important: Task[];
  not_urgent_not_important: Task[];
}
```

```ts
// packages/shared/src/index.ts
export * from './schemas/index.js';
export * from './types/index.js';
export * from './constants.js';
```

- [ ] **Step 4: Write and run schema tests**

```ts
// packages/shared/src/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  registerSchema, loginSchema,
  createProjectSchema, updateProjectSchema,
  createTaskSchema, updateTaskSchema,
  createTagSchema, reorderSchema,
} from '../schemas/index.js';

describe('auth schemas', () => {
  it('validates register input', () => {
    const valid = { email: 'a@b.com', password: '12345678', name: 'Test' };
    expect(registerSchema.parse(valid)).toEqual(valid);
  });

  it('rejects short password', () => {
    expect(() => registerSchema.parse({ email: 'a@b.com', password: '123', name: 'T' }))
      .toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email: 'not-email', password: '12345678' }))
      .toThrow();
  });
});

describe('project schemas', () => {
  it('validates create project', () => {
    const input = { name: 'Work', color: '#ff5733' };
    expect(createProjectSchema.parse(input)).toEqual(input);
  });

  it('rejects invalid hex color', () => {
    expect(() => createProjectSchema.parse({ name: 'X', color: 'red' })).toThrow();
  });

  it('allows partial update', () => {
    expect(updateProjectSchema.parse({ name: 'New' })).toEqual({ name: 'New' });
    expect(updateProjectSchema.parse({})).toEqual({});
  });
});

describe('task schemas', () => {
  it('validates create task with defaults', () => {
    const result = createTaskSchema.parse({ title: 'Buy milk' });
    expect(result).toEqual({
      title: 'Buy milk',
      priority: 4,
      urgent: false,
      important: false,
    });
  });

  it('validates full task create', () => {
    const input = {
      title: 'Deploy', projectId: '550e8400-e29b-41d4-a716-446655440000',
      priority: 1, urgent: true, important: true,
    };
    expect(createTaskSchema.parse(input)).toMatchObject(input);
  });

  it('rejects empty title', () => {
    expect(() => createTaskSchema.parse({ title: '' })).toThrow();
  });
});

describe('reorder schema', () => {
  it('validates reorder items', () => {
    const input = { items: [
      { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 0 },
      { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 1 },
    ]};
    expect(reorderSchema.parse(input)).toEqual(input);
  });

  it('rejects empty items', () => {
    expect(() => reorderSchema.parse({ items: [] })).toThrow();
  });
});
```

Run: `cd packages/shared && pnpm install && pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Create Prisma schema and API package scaffold**

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String         @id @default(uuid()) @db.Uuid
  email        String         @unique
  passwordHash String
  name         String
  createdAt    DateTime       @default(now())
  projects     Project[]
  tasks        Task[]
  tags         Tag[]
  refreshTokens RefreshToken[]
}

model Project {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  color     String
  sortOrder Int      @default(0)
  userId    String   @db.Uuid
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks     Task[]

  @@index([userId, sortOrder])
}

model Task {
  id          String    @id @default(uuid()) @db.Uuid
  title       String
  description String?
  completed   Boolean   @default(false)
  completedAt DateTime?
  priority    Int       @default(4)
  urgent      Boolean   @default(false)
  important   Boolean   @default(false)
  projectId   String?   @db.Uuid
  userId      String    @db.Uuid
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  project     Project?  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tags        TaskTag[]

  @@index([userId, projectId, sortOrder])
  @@index([userId, urgent, important])
}

model Tag {
  id     String    @id @default(uuid()) @db.Uuid
  name   String
  color  String
  userId String    @db.Uuid
  user   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  TaskTag[]
}

model TaskTag {
  taskId String @db.Uuid
  tagId  String @db.Uuid
  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([taskId, tagId])
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  token     String   @unique
  userId    String   @db.Uuid
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}
```

```json
// apps/api/package.json
{
  "name": "@offload/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@offload/shared": "workspace:*",
    "@prisma/client": "^7.9.0",
    "@fastify/cookie": "^11.1.0",
    "@fastify/cors": "^11.3.0",
    "@fastify/rate-limit": "^11.2.0",
    "bcryptjs": "^3.0.0",
    "fastify": "^5.12.0",
    "fastify-plugin": "^5.0.0",
    "jose": "^6.2.0",
    "zod": "^4.4.0"
  },
  "devDependencies": {
    "prisma": "^7.9.0",
    "tsx": "^4.0.0",
    "typescript": "^5.8.0",
    "vitest": "^4.1.0",
    "@types/bcryptjs": "^2.4.0"
  }
}
```

- [ ] **Step 6: Run pnpm install, Prisma generate, and initial migration**

```bash
cp .env.example .env
cp .env.example apps/api/.env
pnpm install
docker compose up -d
cd apps/api && pnpm prisma migrate dev --name init
```

Expected: Migration creates all tables. `pnpm prisma generate` produces typed client.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize monorepo with shared schemas, Prisma, and Docker"
```

---

### Task 2: API — Authentication (Register, Login, Refresh, Logout)

**Files:**
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/plugins/prisma.ts`
- Create: `apps/api/src/plugins/error-handler.ts`
- Create: `apps/api/src/services/auth.service.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/middleware/authenticate.ts`
- Test: `apps/api/src/__tests__/auth.test.ts`

**Interfaces:**
- Consumes: `@offload/shared` — `registerSchema`, `loginSchema`, `User` type
- Produces:
  - Fastify server on port 3001 with CORS, cookies, rate limit
  - `POST /api/auth/register` → `{ accessToken: string, user: User }`
  - `POST /api/auth/login` → `{ accessToken: string, user: User }`
  - `POST /api/auth/refresh` → `{ accessToken: string }`
  - `POST /api/auth/logout` → 204
  - `authenticate` preHandler hook that extracts `userId` from JWT and adds to `request.userId`
  - `AuthService` class: `register(input)`, `login(input)`, `refresh(token)`, `logout(token)`, `generateTokens(userId)`
  - `buildApp()` function exported for test injection

- [ ] **Step 1: Write auth integration tests**

```ts
// apps/api/src/__tests__/auth.test.ts
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
      method: 'POST', url: '/api/auth/register',
      payload: { email: 'login@test.com', password: 'password123', name: 'Login' },
    });
  });

  it('returns tokens for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'login@test.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'login@test.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token with valid refresh cookie', async () => {
    const reg = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { email: 'ref@test.com', password: 'password123', name: 'Ref' },
    });
    const cookie = reg.cookies.find(c => c.name === 'refreshToken');
    const res = await app.inject({
      method: 'POST', url: '/api/auth/refresh',
      cookies: { refreshToken: cookie!.value },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears refresh token', async () => {
    const reg = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { email: 'out@test.com', password: 'password123', name: 'Out' },
    });
    const cookie = reg.cookies.find(c => c.name === 'refreshToken');
    const accessToken = reg.json().accessToken;
    const res = await app.inject({
      method: 'POST', url: '/api/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      cookies: { refreshToken: cookie!.value },
    });
    expect(res.statusCode).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd apps/api && pnpm test`
Expected: FAIL — `buildApp` not found.

- [ ] **Step 3: Implement Prisma plugin**

```ts
// apps/api/src/plugins/prisma.ts
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 4: Implement error handler plugin**

```ts
// apps/api/src/plugins/error-handler.ts
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.flatten(),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Resource already exists', code: 'CONFLICT' });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Resource not found', code: 'NOT_FOUND' });
      }
    }
    const statusCode = (error as any).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: error.message, code: 'CLIENT_ERROR' });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });
});
```

- [ ] **Step 5: Implement auth service**

```ts
// apps/api/src/services/auth.service.ts
import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { RegisterInput, LoginInput } from '@offload/shared';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwtSecret: Uint8Array,
  ) {}

  async register(input: RegisterInput) {
    const passwordHash = await hash(input.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name },
    });
    const tokens = await this.generateTokens(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    const tokens = await this.generateTokens(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateTokens(stored.userId);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async generateTokens(userId: string) {
    const accessToken = await new SignJWT({ userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .setIssuedAt()
      .sign(this.jwtSecret);
    const refreshToken = randomBytes(64).toString('hex');
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    });
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string }> {
    const { payload } = await jwtVerify(token, this.jwtSecret);
    return { userId: payload.userId as string };
  }

  private sanitizeUser(user: { id: string; email: string; name: string; createdAt: Date }) {
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() };
  }
}
```

- [ ] **Step 6: Implement authenticate middleware**

```ts
// apps/api/src/middleware/authenticate.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing token', code: 'UNAUTHORIZED' });
  }
  try {
    const token = authHeader.slice(7);
    const { userId } = await request.server.authService.verifyAccessToken(token);
    request.userId = userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
}
```

- [ ] **Step 7: Implement auth routes**

```ts
// apps/api/src/routes/auth.ts
import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await fastify.authService.register(input);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(201).send({ accessToken, user });
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await fastify.authService.login(input);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(200).send({ accessToken, user });
  });

  fastify.post('/api/auth/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) return reply.status(401).send({ error: 'No refresh token', code: 'UNAUTHORIZED' });
    const { accessToken, refreshToken } = await fastify.authService.refresh(token);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(200).send({ accessToken });
  });

  fastify.post('/api/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (token) await fastify.authService.logout(token);
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.status(204).send();
  });
}
```

- [ ] **Step 8: Implement buildApp entry point**

```ts
// apps/api/src/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from './plugins/prisma.js';
import errorHandler from './plugins/error-handler.js';
import { AuthService } from './services/auth.service.js';
import authRoutes from './routes/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  await app.register(cookie, { secret: process.env.COOKIE_SECRET || 'dev-secret' });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(prismaPlugin);
  await app.register(errorHandler);

  const jwtSecret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-at-least-32-characters-long!!'
  );
  app.decorate('authService', new AuthService(app.prisma, jwtSecret));

  await app.register(authRoutes);

  return app;
}

// Start server if run directly
if (process.env.START_SERVER === 'true') {
  const app = await buildApp();
  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
}
```

- [ ] **Step 9: Run tests — verify they pass**

Run: `cd apps/api && pnpm test`
Expected: All auth tests PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(api): add auth — register, login, refresh, logout with JWT"
```

---

### Task 3: API — Projects CRUD

**Files:**
- Create: `apps/api/src/services/project.service.ts`
- Create: `apps/api/src/routes/projects.ts`
- Modify: `apps/api/src/index.ts` (register project routes)
- Test: `apps/api/src/__tests__/projects.test.ts`

**Interfaces:**
- Consumes: `authenticate` middleware, `app.prisma`, `@offload/shared` schemas
- Produces:
  - `GET /api/projects` → `Project[]` (with `_count.tasks`)
  - `POST /api/projects` → `Project`
  - `PATCH /api/projects/:id` → `Project`
  - `DELETE /api/projects/:id` → 204
  - `PATCH /api/projects/reorder` → 204
  - `ProjectService` class: `list(userId)`, `create(userId, input)`, `update(userId, id, input)`, `delete(userId, id)`, `reorder(userId, input)`

- [ ] **Step 1: Write project integration tests**

```ts
// apps/api/src/__tests__/projects.test.ts
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
      method: 'POST', url: '/api/projects', headers: auth(),
      payload: { name: 'Work', color: '#3b82f6' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Work');
    expect(res.json().color).toBe('#3b82f6');
  });
});

describe('PATCH /api/projects/:id', () => {
  it('updates project name', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/projects', headers: auth(),
      payload: { name: 'Old', color: '#000000' },
    });
    const id = created.json().id;
    const res = await app.inject({
      method: 'PATCH', url: `/api/projects/${id}`, headers: auth(),
      payload: { name: 'New' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('New');
  });
});

describe('DELETE /api/projects/:id', () => {
  it('deletes project', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/projects', headers: auth(),
      payload: { name: 'Del', color: '#ff0000' },
    });
    const res = await app.inject({
      method: 'DELETE', url: `/api/projects/${created.json().id}`, headers: auth(),
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('PATCH /api/projects/reorder', () => {
  it('updates sort order', async () => {
    const p1 = (await app.inject({ method: 'POST', url: '/api/projects', headers: auth(), payload: { name: 'A', color: '#111111' } })).json();
    const p2 = (await app.inject({ method: 'POST', url: '/api/projects', headers: auth(), payload: { name: 'B', color: '#222222' } })).json();
    const res = await app.inject({
      method: 'PATCH', url: '/api/projects/reorder', headers: auth(),
      payload: { items: [{ id: p1.id, sortOrder: 1 }, { id: p2.id, sortOrder: 0 }] },
    });
    expect(res.statusCode).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd apps/api && pnpm test -- src/__tests__/projects.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement project service and routes**

```ts
// apps/api/src/services/project.service.ts
import type { PrismaClient } from '@prisma/client';
import type { CreateProjectInput, UpdateProjectInput, ReorderInput } from '@offload/shared';

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async create(userId: string, input: CreateProjectInput) {
    const maxOrder = await this.prisma.project.aggregate({
      where: { userId }, _max: { sortOrder: true },
    });
    return this.prisma.project.create({
      data: { ...input, userId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
  }

  async update(userId: string, id: string, input: UpdateProjectInput) {
    return this.prisma.project.update({ where: { id, userId }, data: input });
  }

  async delete(userId: string, id: string) {
    await this.prisma.project.delete({ where: { id, userId } });
  }

  async reorder(userId: string, input: ReorderInput) {
    await this.prisma.$transaction(
      input.items.map(item =>
        this.prisma.project.update({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }
}
```

```ts
// apps/api/src/routes/projects.ts
import type { FastifyInstance } from 'fastify';
import { createProjectSchema, updateProjectSchema, reorderSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { ProjectService } from '../services/project.service.js';

export default async function projectRoutes(fastify: FastifyInstance) {
  const service = new ProjectService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/projects', async (request) => service.list(request.userId));

  fastify.post('/api/projects', async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });

  fastify.patch('/api/projects/reorder', async (request, reply) => {
    const input = reorderSchema.parse(request.body);
    await service.reorder(request.userId, input);
    return reply.status(204).send();
  });

  fastify.patch('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateProjectSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });

  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
}
```

Add to `apps/api/src/index.ts`: `import projectRoutes from './routes/projects.js';` and `await app.register(projectRoutes);` after authRoutes.

- [ ] **Step 4: Run tests — verify all pass**

Run: `cd apps/api && pnpm test`
Expected: All auth + project tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): add projects CRUD with reorder"
```

---

### Task 4: API — Tasks CRUD + Matrix Endpoint

**Files:**
- Create: `apps/api/src/services/task.service.ts`
- Create: `apps/api/src/routes/tasks.ts`
- Modify: `apps/api/src/index.ts` (register task routes)
- Test: `apps/api/src/__tests__/tasks.test.ts`

**Interfaces:**
- Consumes: `authenticate`, `app.prisma`, `@offload/shared` task schemas
- Produces:
  - `GET /api/projects/:id/tasks` → `Task[]` (with tags)
  - `GET /api/tasks/inbox` → `Task[]` (projectId = null)
  - `GET /api/tasks/matrix?projectId=` → `MatrixResponse`
  - `POST /api/tasks` → `Task`
  - `PATCH /api/tasks/:id` → `Task`
  - `DELETE /api/tasks/:id` → 204
  - `PATCH /api/tasks/reorder` → 204
  - `TaskService` class with methods matching endpoints above

- [ ] **Step 1: Write task integration tests**

```ts
// apps/api/src/__tests__/tasks.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;
let projectId: string;

beforeAll(async () => { app = await buildApp(); });
afterAll(async () => { await app.close(); });

beforeEach(async () => {
  await app.prisma.taskTag.deleteMany();
  await app.prisma.task.deleteMany();
  await app.prisma.tag.deleteMany();
  await app.prisma.project.deleteMany();
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.user.deleteMany();
  const reg = await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { email: 'task@test.com', password: 'password123', name: 'Task User' },
  });
  accessToken = reg.json().accessToken;
  const proj = await app.inject({
    method: 'POST', url: '/api/projects',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name: 'Work', color: '#3b82f6' },
  });
  projectId = proj.json().id;
});

const auth = () => ({ authorization: `Bearer ${accessToken}` });

describe('POST /api/tasks', () => {
  it('creates task in project', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/tasks', headers: auth(),
      payload: { title: 'Buy milk', projectId, priority: 2, urgent: true, important: false },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe('Buy milk');
    expect(res.json().priority).toBe(2);
    expect(res.json().urgent).toBe(true);
  });

  it('creates inbox task (no projectId)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/tasks', headers: auth(),
      payload: { title: 'Quick thought' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().projectId).toBeNull();
  });
});

describe('GET /api/tasks/inbox', () => {
  it('returns only tasks without project', async () => {
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'In project', projectId } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'In inbox' } });
    const res = await app.inject({ method: 'GET', url: '/api/tasks/inbox', headers: auth() });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].title).toBe('In inbox');
  });
});

describe('GET /api/projects/:id/tasks', () => {
  it('returns project tasks', async () => {
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'First', projectId } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'Second', projectId } });
    const res = await app.inject({ method: 'GET', url: `/api/projects/${projectId}/tasks`, headers: auth() });
    expect(res.json()).toHaveLength(2);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('completes a task and sets completedAt', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'Done', projectId },
    });
    const res = await app.inject({
      method: 'PATCH', url: `/api/tasks/${created.json().id}`, headers: auth(),
      payload: { completed: true },
    });
    expect(res.json().completed).toBe(true);
    expect(res.json().completedAt).toBeDefined();
  });
});

describe('GET /api/tasks/matrix', () => {
  it('groups tasks by Eisenhower quadrants', async () => {
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'UrgImp', urgent: true, important: true } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'NotUrgImp', urgent: false, important: true } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'UrgNotImp', urgent: true, important: false } });
    await app.inject({ method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'Neither' } });
    const res = await app.inject({ method: 'GET', url: '/api/tasks/matrix', headers: auth() });
    const body = res.json();
    expect(body.urgent_important).toHaveLength(1);
    expect(body.not_urgent_important).toHaveLength(1);
    expect(body.urgent_not_important).toHaveLength(1);
    expect(body.not_urgent_not_important).toHaveLength(1);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes task', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/tasks', headers: auth(), payload: { title: 'Delete me' },
    });
    const res = await app.inject({
      method: 'DELETE', url: `/api/tasks/${created.json().id}`, headers: auth(),
    });
    expect(res.statusCode).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd apps/api && pnpm test -- src/__tests__/tasks.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement task service**

```ts
// apps/api/src/services/task.service.ts
import type { PrismaClient } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput, ReorderInput } from '@offload/shared';

const taskInclude = { tags: { include: { tag: true } } } as const;

function formatTask(task: any) {
  return { ...task, tags: task.tags?.map((tt: any) => tt.tag) ?? [] };
}

export class TaskService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(userId: string, projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, projectId }, orderBy: { sortOrder: 'asc' }, include: taskInclude,
    });
    return tasks.map(formatTask);
  }

  async listInbox(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, projectId: null }, orderBy: { sortOrder: 'asc' }, include: taskInclude,
    });
    return tasks.map(formatTask);
  }

  async matrix(userId: string, projectId?: string) {
    const where = { userId, completed: false, ...(projectId ? { projectId } : {}) };
    const tasks = await this.prisma.task.findMany({
      where, orderBy: { sortOrder: 'asc' }, include: taskInclude,
    });
    const formatted = tasks.map(formatTask);
    return {
      urgent_important: formatted.filter(t => t.urgent && t.important),
      not_urgent_important: formatted.filter(t => !t.urgent && t.important),
      urgent_not_important: formatted.filter(t => t.urgent && !t.important),
      not_urgent_not_important: formatted.filter(t => !t.urgent && !t.important),
    };
  }

  async create(userId: string, input: CreateTaskInput) {
    const maxOrder = await this.prisma.task.aggregate({
      where: { userId, projectId: input.projectId ?? null }, _max: { sortOrder: true },
    });
    const task = await this.prisma.task.create({
      data: {
        title: input.title, description: input.description,
        projectId: input.projectId, priority: input.priority ?? 4,
        urgent: input.urgent ?? false, important: input.important ?? false,
        userId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: taskInclude,
    });
    return formatTask(task);
  }

  async update(userId: string, id: string, input: UpdateTaskInput) {
    const data: any = { ...input };
    if (input.completed === true) data.completedAt = new Date();
    else if (input.completed === false) data.completedAt = null;
    const task = await this.prisma.task.update({
      where: { id, userId }, data, include: taskInclude,
    });
    return formatTask(task);
  }

  async delete(userId: string, id: string) {
    await this.prisma.task.delete({ where: { id, userId } });
  }

  async reorder(userId: string, input: ReorderInput) {
    await this.prisma.$transaction(
      input.items.map(item =>
        this.prisma.task.update({ where: { id: item.id, userId }, data: { sortOrder: item.sortOrder } })
      )
    );
  }
}
```

- [ ] **Step 4: Implement task routes**

```ts
// apps/api/src/routes/tasks.ts
import type { FastifyInstance } from 'fastify';
import { createTaskSchema, updateTaskSchema, reorderSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { TaskService } from '../services/task.service.js';

export default async function taskRoutes(fastify: FastifyInstance) {
  const service = new TaskService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/projects/:id/tasks', async (request) => {
    const { id } = request.params as { id: string };
    return service.listByProject(request.userId, id);
  });

  fastify.get('/api/tasks/inbox', async (request) => service.listInbox(request.userId));

  fastify.get('/api/tasks/matrix', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    return service.matrix(request.userId, projectId);
  });

  fastify.post('/api/tasks', async (request, reply) => {
    const input = createTaskSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });

  fastify.patch('/api/tasks/reorder', async (request, reply) => {
    const input = reorderSchema.parse(request.body);
    await service.reorder(request.userId, input);
    return reply.status(204).send();
  });

  fastify.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });

  fastify.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
}
```

Add to `apps/api/src/index.ts`: `import taskRoutes from './routes/tasks.js';` and `await app.register(taskRoutes);`.

- [ ] **Step 5: Run tests — verify all pass**

Run: `cd apps/api && pnpm test`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): add tasks CRUD, inbox, and Eisenhower matrix endpoint"
```

---

### Task 5: API — Tags CRUD + Task-Tag Linking

**Files:**
- Create: `apps/api/src/services/tag.service.ts`
- Create: `apps/api/src/routes/tags.ts`
- Modify: `apps/api/src/index.ts` (register tag routes)
- Test: `apps/api/src/__tests__/tags.test.ts`

**Interfaces:**
- Consumes: `authenticate`, `app.prisma`, `@offload/shared` tag schemas
- Produces:
  - `GET /api/tags` → `Tag[]`
  - `POST /api/tags` → `Tag`
  - `PATCH /api/tags/:id` → `Tag`
  - `DELETE /api/tags/:id` → 204
  - `POST /api/tasks/:id/tags` → 204
  - `DELETE /api/tasks/:id/tags/:tagId` → 204

- [ ] **Step 1: Write tag integration tests**

```ts
// apps/api/src/__tests__/tags.test.ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd apps/api && pnpm test -- src/__tests__/tags.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement tag service and routes**

```ts
// apps/api/src/services/tag.service.ts
import type { PrismaClient } from '@prisma/client';
import type { CreateTagInput, UpdateTagInput } from '@offload/shared';

export class TagService {
  constructor(private prisma: PrismaClient) {}

  async list(userId: string) {
    return this.prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }
  async create(userId: string, input: CreateTagInput) {
    return this.prisma.tag.create({ data: { ...input, userId } });
  }
  async update(userId: string, id: string, input: UpdateTagInput) {
    return this.prisma.tag.update({ where: { id, userId }, data: input });
  }
  async delete(userId: string, id: string) {
    await this.prisma.tag.delete({ where: { id, userId } });
  }
  async assignToTask(userId: string, taskId: string, tagId: string) {
    await this.prisma.task.findUniqueOrThrow({ where: { id: taskId, userId } });
    await this.prisma.tag.findUniqueOrThrow({ where: { id: tagId, userId } });
    await this.prisma.taskTag.create({ data: { taskId, tagId } });
  }
  async unassignFromTask(userId: string, taskId: string, tagId: string) {
    await this.prisma.task.findUniqueOrThrow({ where: { id: taskId, userId } });
    await this.prisma.taskTag.delete({ where: { taskId_tagId: { taskId, tagId } } });
  }
}
```

```ts
// apps/api/src/routes/tags.ts
import type { FastifyInstance } from 'fastify';
import { createTagSchema, updateTagSchema, tagAssignSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { TagService } from '../services/tag.service.js';

export default async function tagRoutes(fastify: FastifyInstance) {
  const service = new TagService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/tags', async (request) => service.list(request.userId));
  fastify.post('/api/tags', async (request, reply) => {
    const input = createTagSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });
  fastify.patch('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTagSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });
  fastify.delete('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
  fastify.post('/api/tasks/:id/tags', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tagId } = tagAssignSchema.parse(request.body);
    await service.assignToTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
  fastify.delete('/api/tasks/:id/tags/:tagId', async (request, reply) => {
    const { id, tagId } = request.params as { id: string; tagId: string };
    await service.unassignFromTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
}
```

Add to `apps/api/src/index.ts`: `import tagRoutes from './routes/tags.js';` and `await app.register(tagRoutes);`.

- [ ] **Step 4: Run all API tests**

Run: `cd apps/api && pnpm test`
Expected: All tests PASS (auth + projects + tasks + tags).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): add tags CRUD and task-tag linking"
```

---

### Task 6: Frontend — Next.js Setup, Auth Pages, Auth Context

**Files:**
- Create: `apps/web/` via `create-next-app`
- Create: `apps/web/app/globals.css` (Tailwind v4)
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/app/(app)/inbox/page.tsx` (placeholder)
- Create: `apps/web/lib/api-client.ts`
- Create: `apps/web/lib/auth-context.tsx`
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/input.tsx`

**Interfaces:**
- Consumes: API auth endpoints, `@offload/shared` schemas
- Produces:
  - `apiClient<T>(path, options)` — fetch wrapper with auto-refresh on 401
  - `setAccessToken(token)`, `getAccessToken()` — in-memory token store
  - `AuthProvider` / `useAuth()` — `{ user, login, register, logout, isLoading }`
  - `Button` component: variants `primary | secondary | danger | ghost`, sizes `sm | md | lg`
  - `Input` component: with `label` and `error` props
  - Login/register pages with Zod validation
  - Protected `(app)` layout redirecting to `/login`

- [ ] **Step 1: Initialize Next.js app and configure**

```bash
cd apps && pnpm create next-app@latest web --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint
```

Update `apps/web/package.json`: set `"name": "@offload/web"`, add `"@offload/shared": "workspace:*"` and `"zod"` dependencies.

- [ ] **Step 2: Set up Tailwind CSS v4 globals and root layout**

Replace `apps/web/app/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-danger: #ef4444;
  --color-success: #22c55e;
  --color-p1: #ef4444;
  --color-p2: #f97316;
  --color-p3: #3b82f6;
  --color-p4: #9ca3af;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 3: Implement API client, auth context, UI primitives, auth pages**

Implement all files as specified in Interfaces section. Key implementation details:

- `api-client.ts`: `apiClient<T>(path, options)` with auto-refresh on 401. Access token stored in module-scoped variable (not localStorage).
- `auth-context.tsx`: `AuthProvider` wrapping app, attempts refresh on mount, provides `login`/`register`/`logout`.
- `button.tsx`: `variant` and `size` props mapped to Tailwind classes.
- `input.tsx`: `label` and `error` props with styled feedback.
- `(auth)/login/page.tsx`: form with `loginSchema.safeParse`, calls `useAuth().login`, redirects to `/inbox`.
- `(auth)/register/page.tsx`: form with `registerSchema.safeParse`, calls `useAuth().register`, redirects to `/inbox`.
- `(app)/layout.tsx`: checks `useAuth().user`, redirects to `/login` if null after loading.

- [ ] **Step 4: Verify manually — register → login → redirect to inbox → logout**

```bash
# Terminal 1: cd apps/api && pnpm dev
# Terminal 2: cd apps/web && pnpm dev
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add Next.js app with auth pages, auth context, API client"
```

---

### Task 7: Frontend — Responsive Layout (Sidebar, Header, Bottom Nav)

**Files:**
- Create: `apps/web/components/layout/sidebar.tsx`
- Create: `apps/web/components/layout/header.tsx`
- Create: `apps/web/components/layout/bottom-nav.tsx`
- Create: `apps/web/hooks/use-projects.ts`
- Modify: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/app/(app)/projects/[id]/page.tsx` (placeholder)
- Create: `apps/web/app/(app)/matrix/page.tsx` (placeholder)
- Create: `apps/web/app/(app)/tags/page.tsx` (placeholder)

**Interfaces:**
- Consumes: `apiClient`, `useAuth`, `@offload/shared` types
- Produces:
  - `useProjects()`: `{ projects, createProject, deleteProject, refetch, isLoading }`
  - `Sidebar`: project list with colored dots, Inbox/Matrix/Tags nav, inline project creation
  - `Header`: hamburger menu toggle (mobile), app title, user name, sign out
  - `BottomNav`: Inbox/Matrix/Tags (mobile only, hidden on `lg:`)
  - Responsive shell: sidebar visible on `lg:`, drawer on mobile, bottom nav on mobile

- [ ] **Step 1: Implement useProjects hook, Sidebar, Header, BottomNav**

Implement as described in Interfaces. Key layout: `flex h-screen flex-col` → Header → `flex flex-1 overflow-hidden` → [hidden lg:block Sidebar | main content]. Mobile: overlay drawer + BottomNav fixed at bottom.

- [ ] **Step 2: Update (app) layout to include responsive shell**

- [ ] **Step 3: Add placeholder pages for projects/[id], matrix, tags**

- [ ] **Step 4: Verify — sidebar on desktop, drawer on mobile, bottom nav, navigation works**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add responsive layout — sidebar, header, bottom nav"
```

---

### Task 8: Frontend — Task List, Inbox, Task CRUD

**Files:**
- Create: `apps/web/hooks/use-tasks.ts`
- Create: `apps/web/components/tasks/task-list.tsx`
- Create: `apps/web/components/tasks/task-item.tsx`
- Create: `apps/web/components/tasks/add-task-input.tsx`
- Modify: `apps/web/app/(app)/inbox/page.tsx`
- Modify: `apps/web/app/(app)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `@offload/shared` types/schemas
- Produces:
  - `useTasks(projectId?: string | null)`: `{ tasks, addTask, updateTask, deleteTask, refetch, isLoading }`
  - `TaskItem`: checkbox, title, priority colored dot, tag chips, click handler
  - `TaskList`: renders active tasks, AddTaskInput at bottom, collapsed completed section
  - `AddTaskInput`: inline form with title input, submits on Enter

- [ ] **Step 1: Implement useTasks hook**

- [ ] **Step 2: Implement TaskItem, AddTaskInput, TaskList components**

- [ ] **Step 3: Wire up Inbox and Project pages**

- [ ] **Step 4: Verify — create tasks, toggle completion, view in inbox and project**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add task list, inbox, project tasks, task CRUD"
```

---

### Task 9: Frontend — Task Detail Panel

**Files:**
- Create: `apps/web/components/tasks/task-detail.tsx`
- Create: `apps/web/hooks/use-tags.ts`
- Modify: `apps/web/app/(app)/inbox/page.tsx` (wire detail panel)
- Modify: `apps/web/app/(app)/projects/[id]/page.tsx` (wire detail panel)

**Interfaces:**
- Consumes: `useTasks`, `useTags`, `apiClient`
- Produces:
  - `useTags()`: `{ tags, createTag, deleteTag, refetch, isLoading }`
  - `TaskDetail`: slide-in panel (fixed right, w-96 on desktop). Fields: editable title, description textarea, priority 1-4 selector, urgent/important checkboxes, tag toggles, delete button, created date. Calls `onUpdate`, `onDelete`, `onClose`.

- [ ] **Step 1: Implement useTags hook**

- [ ] **Step 2: Implement TaskDetail component**

- [ ] **Step 3: Wire into Inbox and Project pages (selectedTask state, TaskDetail render)**

- [ ] **Step 4: Verify — click task, edit fields, change priority, toggle urgent/important, assign tags**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add task detail panel with priority, eisenhower, and tags"
```

---

### Task 10: Frontend — Drag and Drop

**Files:**
- Modify: `apps/web/components/tasks/task-list.tsx` (DndContext + SortableContext)
- Modify: `apps/web/components/tasks/task-item.tsx` (useSortable)
- Modify: `apps/web/components/layout/sidebar.tsx` (sortable project list)
- Modify: `apps/web/hooks/use-tasks.ts` (add `reorderTasks`)
- Modify: `apps/web/hooks/use-projects.ts` (add `reorderProjects`)

**Interfaces:**
- Consumes: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Produces:
  - Tasks draggable within list, optimistic reorder, API sync
  - Projects draggable in sidebar
  - PointerSensor with `activationConstraint: { distance: 8 }` to avoid accidental drag

- [ ] **Step 1: Install @dnd-kit packages**

```bash
cd apps/web && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Add reorder functions to hooks**

- [ ] **Step 3: Wrap TaskList with DndContext/SortableContext, TaskItem with useSortable**

- [ ] **Step 4: Wrap sidebar project list with DndContext/SortableContext**

- [ ] **Step 5: Verify — drag tasks to reorder, drag projects in sidebar**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add drag-and-drop reorder for tasks and projects"
```

---

### Task 11: Frontend — Eisenhower Matrix View

**Files:**
- Create: `apps/web/hooks/use-matrix.ts`
- Create: `apps/web/components/matrix/quadrant.tsx`
- Create: `apps/web/components/matrix/eisenhower-matrix.tsx`
- Modify: `apps/web/app/(app)/matrix/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `@offload/shared` types, `@dnd-kit`
- Produces:
  - `useMatrix(projectId?)`: `{ matrix: MatrixResponse, isLoading, refetch }`
  - `Quadrant`: droppable zone with `useDroppable`, renders task cards with `useSortable`
  - `EisenhowerMatrix`: 2×2 grid, DndContext wrapping all quadrants. On `DragEnd`: if task dropped on different quadrant, PATCH task with new `urgent`/`important` flags
  - Matrix page with optional project filter dropdown

- [ ] **Step 1: Implement useMatrix hook**

- [ ] **Step 2: Implement Quadrant component (droppable + sortable task cards)**

- [ ] **Step 3: Implement EisenhowerMatrix with cross-quadrant drag**

`QUADRANT_FLAGS` map: `urgent_important → {urgent:true, important:true}`, etc.
On `DragEnd`: extract `active.id` (taskId) and `over.id` (quadrantKey), PATCH task, call `onRefresh`.

- [ ] **Step 4: Wire up Matrix page with project filter**

- [ ] **Step 5: Verify — view matrix, drag between quadrants, filter by project**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add Eisenhower Matrix view with drag-and-drop between quadrants"
```

---

### Task 12: Tags Management UI + PWA + Final Polish

**Files:**
- Create: `apps/web/components/tags/tag-manager.tsx`
- Modify: `apps/web/app/(app)/tags/page.tsx`
- Create: `apps/web/app/manifest.ts`
- Create: `apps/web/app/sw.ts`
- Modify: `apps/web/next.config.ts` (add @serwist/next)
- Create: `apps/web/public/icons/icon-192.png`
- Create: `apps/web/public/icons/icon-512.png`

**Interfaces:**
- Consumes: `useTags`, `@serwist/next`
- Produces:
  - Tag management page: create tags with name + color picker, list with delete
  - PWA manifest via Next.js `manifest.ts` metadata API
  - Service worker via `@serwist/next`
  - Installable PWA with icons

- [ ] **Step 1: Implement TagManager component and tags page**

- [ ] **Step 2: Install and configure @serwist/next**

```bash
cd apps/web && pnpm add @serwist/next && pnpm add -D serwist
```

Configure `next.config.ts` with `withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js', disable: process.env.NODE_ENV === 'development' })`.

- [ ] **Step 3: Create manifest.ts and sw.ts**

`manifest.ts`: name "Offload", display "standalone", theme color `#2563eb`, icons 192+512.
`sw.ts`: import `defaultCache` from `@serwist/next/worker`, create `Serwist` instance with precache + runtime caching.

- [ ] **Step 4: Create placeholder PWA icons (192×192, 512×512)**

- [ ] **Step 5: Build and verify PWA**

```bash
cd apps/web && pnpm build && pnpm start
```

Verify service worker registers, manifest loads, install prompt available in Chrome.

- [ ] **Step 6: Run full API test suite**

```bash
cd apps/api && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 7: Final smoke test**

Full flow: register → create project → add tasks → set priorities → set urgent/important → view matrix → drag between quadrants → manage tags → assign tags → test mobile viewport → verify PWA install.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: finalize MVP — tags UI, PWA, smoke test passed"
```
