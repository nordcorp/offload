# Offload

A fast, self-hosted task manager built around the **Eisenhower Matrix**. Capture ideas in your Inbox, organize tasks into Projects with Tags, and prioritize what matters.

Built with **Next.js 15 (PWA)**, **Fastify**, **Prisma**, **PostgreSQL**, and **Caddy** (automatic HTTPS).

---

## Features

- 📥 **Inbox & Projects** — quick task capture, custom projects, and color-coded tags.
- 🎯 **Eisenhower Matrix** — 4-quadrant prioritization (*Do First, Schedule, Delegate, Eliminate*) with drag-and-drop.
- ⚡ **Priority & Date Sorting** — sort tasks by priority (P1–P4) or date added.
- 📱 **Progressive Web App (PWA)** — install on desktop or mobile with offline capabilities.
- 🔒 **Self-Hosted & Secure** — automatic SSL/TLS via Caddy, JWT + HTTP-only cookie sessions, isolated internal Docker network.

---

## Quick Start (Production)

### Prerequisites
- Linux server with **Docker** & **Docker Compose**
- A domain name pointing to your server IP (ports 80 and 443 open)

### 1. Clone repository
```bash
git clone https://github.com/nordcorp/offload.git
cd offload
```

### 2. Configure environment
```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set your domain and secrets:
```ini
APP_DOMAIN=tasks.yourdomain.com
IMAGE_TAG=latest

POSTGRES_USER=offload
POSTGRES_PASSWORD=generate-a-strong-password
POSTGRES_DB=offload
DATABASE_URL=postgresql://offload:generate-a-strong-password@postgres:5432/offload

JWT_SECRET=generate-at-least-32-random-characters
COOKIE_SECRET=generate-at-least-32-random-characters
COOKIE_SECURE=true
```

> **Tip:** Generate random secrets with:
> ```bash
> openssl rand -base64 32
> ```

### 3. Start application
```bash
docker compose --env-file .env.production up -d
```

Database migrations run automatically before the API starts. Caddy provisions and renews SSL certificates automatically.

Open `https://tasks.yourdomain.com` in your browser.

---

## Updating

To update to the latest release:

```bash
git pull
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
```

---

## Local Testing (without domain)

To run a quick instance locally on `http://localhost`:

1. Copy config:
   ```bash
   cp .env.production.example .env.production
   ```
2. Set in `.env.production`:
   ```ini
   APP_DOMAIN=localhost
   CORS_ORIGIN=http://localhost
   COOKIE_SECURE=false
   ```
3. Start stack:
   ```bash
   docker compose --env-file .env.production up -d
   ```
4. Open `http://localhost` in your browser.

---

## Useful Commands

```bash
# View live logs
docker compose --env-file .env.production logs -f

# Check container status
docker compose --env-file .env.production ps

# Stop all services
docker compose --env-file .env.production down

# Backup database
docker compose --env-file .env.production exec -T postgres pg_dump -U offload offload > backup.sql
```

---

## Development

Requirements: **Node.js 22.13+**, **pnpm**, and **Docker**.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure API environment
cp .env.example apps/api/.env

# 3. Start development PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 4. Run database migrations
pnpm db:migrate

# 5. Start dev servers
pnpm dev
```

- Web app: `http://localhost:3000`
- API server: `http://localhost:3001`

### Running tests
```bash
pnpm test
pnpm build
```
