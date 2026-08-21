# Offload — Task Tracker with Eisenhower Matrix

## Overview

Offload is a multi-device task tracking web application inspired by Todoist, Things, and Microsoft Todo. Its distinguishing feature is a built-in Eisenhower Matrix view that helps users prioritize tasks by urgency and importance. The app targets a clean, minimalist aesthetic (Things-like) and works as a PWA on phone, tablet, and desktop.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS |
| Drag & Drop | @dnd-kit |
| PWA | next-pwa (service worker, manifest) |
| Backend | Fastify, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod (shared between frontend and backend) |
| Auth | JWT (access + refresh tokens, bcrypt) |
| Monorepo | pnpm workspaces |
| Local Dev | Docker Compose (PostgreSQL) |

## Project Structure

```
offload/
├── apps/
│   ├── web/                    # Next.js 15 — frontend + PWA
│   │   ├── app/                # App Router pages
│   │   │   ├── (auth)/         # Login, register (no sidebar layout)
│   │   │   ├── (app)/          # Main app layout (sidebar + content)
│   │   │   │   ├── inbox/
│   │   │   │   ├── projects/[id]/
│   │   │   │   ├── matrix/
│   │   │   │   └── tags/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Header, BottomNav, TaskDetail panel
│   │   │   ├── tasks/          # TaskList, TaskItem, TaskForm
│   │   │   ├── matrix/         # EisenhowerMatrix, Quadrant
│   │   │   ├── projects/       # ProjectList, ProjectForm
│   │   │   └── ui/             # Shared UI primitives (Button, Input, Toast, etc.)
│   │   ├── hooks/              # useAuth, useTasks, useProjects, useTags, useDragAndDrop
│   │   ├── lib/                # API client (fetch wrapper with auth), utils
│   │   └── public/             # PWA manifest, icons, offline fallback
│   │
│   └── api/                    # Fastify — REST API
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts     # register, login, refresh, logout
│       │   │   ├── projects.ts # CRUD + reorder
│       │   │   ├── tasks.ts    # CRUD + reorder + matrix view
│       │   │   └── tags.ts     # CRUD + task-tag linking
│       │   ├── services/       # Business logic (auth, projects, tasks, tags)
│       │   ├── middleware/      # JWT auth, error handler
│       │   ├── plugins/        # Fastify plugins (prisma, cors, rate-limit)
│       │   └── index.ts        # Server entry point
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   └── shared/                 # Shared TypeScript types, Zod schemas, constants
│       ├── src/
│       │   ├── schemas/        # Zod schemas for API request/response validation
│       │   ├── types/          # TypeScript type definitions
│       │   └── constants.ts    # Priority colors, quadrant labels, etc.
│       └── package.json
│
├── docker-compose.yml          # PostgreSQL for local dev
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Data Model

### User

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| email | string | unique, indexed |
| passwordHash | string | bcrypt hash |
| name | string | display name |
| createdAt | timestamp | |

### Project

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | string | required |
| color | string | hex color code |
| sortOrder | int | for drag-and-drop ordering |
| userId | UUID | FK → User |
| createdAt | timestamp | |

### Task

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| title | string | required |
| description | string? | optional, markdown-compatible |
| completed | boolean | default false |
| completedAt | timestamp? | set when completed |
| priority | int (1-4) | 1=highest (red), 4=lowest (no color) |
| urgent | boolean | default false — Eisenhower axis |
| important | boolean | default false — Eisenhower axis |
| projectId | UUID? | FK → Project, nullable (Inbox = no project) |
| userId | UUID | FK → User |
| sortOrder | int | for drag-and-drop ordering within project |
| createdAt | timestamp | |

### Tag

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | string | required |
| color | string | hex color code |
| userId | UUID | FK → User |

### TaskTag (join table)

| Column | Type | Notes |
|--------|------|-------|
| taskId | UUID | FK → Task, composite PK |
| tagId | UUID | FK → Tag, composite PK |

### RefreshToken

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| token | string | hashed refresh token, indexed |
| userId | UUID | FK → User |
| expiresAt | timestamp | 7 days from creation |
| createdAt | timestamp | |

### Indexes

- `User.email` — unique index
- `Task(userId, projectId, sortOrder)` — composite for list queries
- `Task(userId, urgent, important)` — composite for matrix view
- `Project(userId, sortOrder)` — composite for sidebar ordering

## Authentication

### Flow

1. **Register:** POST `/api/auth/register` with email + password + name → bcrypt hash → save user → return access + refresh tokens
2. **Login:** POST `/api/auth/login` with email + password → verify bcrypt → return access + refresh tokens
3. **Access token:** JWT, 15 min TTL, stored in memory (React state). Contains `userId` and `email`.
4. **Refresh token:** JWT, 7 day TTL, sent as httpOnly secure cookie. Stored in DB for invalidation.
5. **Refresh:** POST `/api/auth/refresh` — reads refresh cookie → validates → returns new access token + rotates refresh token
6. **Logout:** POST `/api/auth/logout` — invalidates refresh token in DB, clears cookie

### Frontend Auth

- Access token stored in memory (not localStorage — XSS protection)
- API client wrapper: on 401 response → attempt silent refresh → retry original request
- On refresh failure → redirect to login
- Auth state managed via React Context

### Security

- bcrypt with salt rounds = 12
- httpOnly + secure + sameSite=strict cookies for refresh token
- Rate limiting on auth endpoints (e.g., 5 attempts/minute for login)
- All data endpoints verify JWT and scope queries to `userId`

## API Design

### Error Format

All errors follow a consistent format:

```json
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR",
  "details": {}
}
```

Standard HTTP status codes: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limited), 500 (server error).

### Endpoints

#### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ email, password, name }` | `{ accessToken, user }` + refresh cookie |
| POST | `/api/auth/login` | `{ email, password }` | `{ accessToken, user }` + refresh cookie |
| POST | `/api/auth/refresh` | — (cookie) | `{ accessToken }` + new refresh cookie |
| POST | `/api/auth/logout` | — | 204 |

#### Projects

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/projects` | — | `Project[]` |
| POST | `/api/projects` | `{ name, color }` | `Project` |
| PATCH | `/api/projects/:id` | `{ name?, color? }` | `Project` |
| DELETE | `/api/projects/:id` | — | 204 (cascades tasks) |
| PATCH | `/api/projects/reorder` | `{ items: [{ id, sortOrder }] }` | 204 |

#### Tasks

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/projects/:id/tasks` | — | `Task[]` (with tags) |
| GET | `/api/tasks/inbox` | — | `Task[]` (projectId = null) |
| GET | `/api/tasks/matrix` | `?projectId=` (optional filter) | `{ urgent_important: Task[], not_urgent_important: Task[], urgent_not_important: Task[], not_urgent_not_important: Task[] }` |
| POST | `/api/tasks` | `{ title, projectId?, priority?, urgent?, important? }` | `Task` |
| PATCH | `/api/tasks/:id` | `{ title?, description?, completed?, priority?, urgent?, important?, projectId? }` | `Task` |
| DELETE | `/api/tasks/:id` | — | 204 |
| PATCH | `/api/tasks/reorder` | `{ items: [{ id, sortOrder }] }` | 204 |

#### Tags

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/tags` | — | `Tag[]` |
| POST | `/api/tags` | `{ name, color }` | `Tag` |
| PATCH | `/api/tags/:id` | `{ name?, color? }` | `Tag` |
| DELETE | `/api/tags/:id` | — | 204 |
| POST | `/api/tasks/:id/tags` | `{ tagId }` | 204 |
| DELETE | `/api/tasks/:id/tags/:tagId` | — | 204 |

### Validation

All request bodies validated with Zod schemas from `packages/shared`. Fastify uses `@fastify/type-provider-zod` for automatic request/response typing and validation.

## UI/UX Design

### Visual Style

- **Minimalist** — inspired by Things: clean whitespace, subtle shadows, no heavy borders
- **Typography-first** — task titles are the focus, metadata (tags, priority) is secondary
- **Priority colors:** p1 = 🔴 red, p2 = 🟠 orange, p3 = 🔵 blue, p4 = no color (gray)
- **Light mode** primary (dark mode as future enhancement)

### Layout

#### Desktop (>1024px)

Sidebar (240px) + main content + task detail slide-in panel (right side)

#### Tablet (768–1024px)

Collapsible sidebar + main content. Task details as overlay/modal.

#### Mobile (<768px)

No sidebar — bottom navigation bar instead. Sidebar accessible as drawer (swipe from left or hamburger menu). Task details as full-screen view.

### Screens

#### 1. Task List (Main View)

- Shows tasks for selected project (or Inbox for unassigned tasks)
- Each task row: checkbox, title, priority indicator (colored dot), tags (small chips)
- Drag-and-drop to reorder
- Click task → opens detail panel/screen
- "Add task" input at the bottom (inline, quick capture)
- Completed tasks collapsed at bottom of list

#### 2. Inbox

- Same as task list but shows tasks where `projectId = null`
- Quick capture point — add tasks fast, assign to projects later

#### 3. Eisenhower Matrix

- 2×2 grid filling available space
- Quadrant headers: "Do First" (urgent+important), "Schedule" (!urgent+important), "Delegate" (urgent+!important), "Eliminate" (!urgent+!important)
- Tasks shown as compact cards within each quadrant
- Drag-and-drop between quadrants updates `urgent`/`important` fields automatically
- Optional filter by project (dropdown above matrix)

#### 4. Task Detail

- Desktop: slide-in panel from right (like Things)
- Mobile: full-screen view
- Fields: title (editable inline), description (textarea/markdown), priority selector, urgent/important toggles, project selector, tag selector, created date, completion status
- Delete button with confirmation

#### 5. Sidebar

- "Inbox" item at top with task count badge
- Project list with colored dots, drag-and-drop reorder
- "Add project" button
- Separator
- "Tags" navigation item
- "Matrix" navigation item

#### 6. Bottom Navigation (Mobile Only)

5 items: Inbox, Matrix, Add Task (centered, prominent), Tags, Profile

### Interactions

- **Drag and drop:** @dnd-kit with touch support. Used for task reordering, project reordering, and moving tasks between matrix quadrants
- **Optimistic updates:** checkbox toggle, drag-and-drop reorder, task creation — instant UI response, rollback on API error
- **Toast notifications:** success/error feedback for mutations
- **Transitions:** subtle fade/slide animations for panel open/close, task completion

## PWA Configuration

- **Web App Manifest:** name, icons (192px, 512px), theme color, background color, display: standalone
- **Service Worker (next-pwa):** precache app shell, runtime cache for API responses (network-first strategy)
- **Offline:** show cached data with "offline" indicator, queue mutations for replay when online (stretch goal for post-MVP)
- **Install prompt:** custom in-app banner suggesting "Add to Home Screen"

## Error Handling

### Backend

- Fastify error handler plugin: catches all errors, formats to standard error response
- Prisma errors mapped to appropriate HTTP status codes (e.g., unique constraint → 409)
- Unhandled errors → 500 with generic message (no stack traces in production)

### Frontend

- React Error Boundaries at layout level — catch rendering errors, show fallback UI
- API client: centralized error handling with toast notifications
- Optimistic update rollback: on API failure, revert local state and show error toast
- Form validation: Zod schemas run on submit, inline error messages

## Testing Strategy

| Level | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Zod schemas, service functions, utility functions |
| API Integration | Vitest + @fastify/inject | Route handlers with test database |
| Component | Vitest + React Testing Library | TaskList, EisenhowerMatrix, TaskForm, key interactive components |
| E2E | Playwright | Critical flows: register → login → create project → add tasks → view matrix → drag between quadrants |

### Test Database

- Separate PostgreSQL database (or schema) for tests
- Prisma migrations applied before test suite
- Each test file gets a clean state (truncate tables)

## Deployment (Post-MVP)

| Component | Option |
|-----------|--------|
| Frontend | Vercel (native Next.js support) |
| API | Railway / Fly.io / VPS |
| Database | Railway PostgreSQL / Neon |
| CI | GitHub Actions: lint → test → build → deploy |

Deployment is not a blocker for MVP. Everything runs locally via Docker Compose first.

## Implementation Order

1. **Infrastructure** — monorepo setup, pnpm workspaces, Docker Compose, Prisma schema + initial migration, shared package with Zod schemas
2. **API: Auth** — register, login, refresh, logout, JWT middleware
3. **API: CRUD** — projects, tasks, tags endpoints with validation
4. **Frontend: Auth** — login/register pages, auth context, protected routes
5. **Frontend: Layout** — sidebar, header, responsive shell, bottom nav
6. **Frontend: Task List** — project task list, inbox, task CRUD, checkbox toggle
7. **Frontend: Task Detail** — slide-in panel / full-screen, edit fields
8. **Frontend: Drag & Drop** — task reorder, project reorder
9. **Eisenhower Matrix** — matrix view, drag between quadrants
10. **Tags** — tag CRUD, tag assignment UI
11. **PWA** — manifest, service worker, install prompt
12. **Polish** — animations, loading states, empty states, error states
