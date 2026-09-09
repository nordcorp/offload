# Offload

Offload is a self-hosted task manager for capturing work in an inbox, organizing it into projects and tags, and prioritizing it with an Eisenhower matrix. It is a pnpm monorepo with a Next.js PWA, a Fastify API, Prisma, and PostgreSQL.

## Production

Requirements: Docker with Compose, a Linux server with ports 80 and 443 open, and a domain whose DNS points to that server. Caddy provisions and renews HTTPS certificates automatically.

```bash
cp .env.production.example .env.production
```

Edit `.env.production`: set `APP_DOMAIN`, use a strong database password in both `POSTGRES_PASSWORD` and `DATABASE_URL`, and generate independent secrets (for example with `openssl rand -base64 48`) for `JWT_SECRET` and `COOKIE_SECRET`. Set `IMAGE_TAG` to a release tag (for example `v1.0.0`) to pin all application images, or keep `latest`. Then start the complete stack:

```bash
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
```

Database migrations run automatically before the API starts. The application is available at `https://<APP_DOMAIN>`. PostgreSQL and the API are only reachable inside the Docker network; persistent data is stored in named Docker volumes.

CI publishes `ghcr.io/nordcorp/offload-api`, `ghcr.io/nordcorp/offload-web`, and `ghcr.io/nordcorp/offload-migrate` when a `v*` tag is pushed and tests and the production build pass.

To update an installation:

```bash
git pull
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
```

## Development and contributing

Requirements: Node.js 22.13+, pnpm, and Docker.

```bash
pnpm install
cp .env.example apps/api/.env
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:3001`. Before opening a pull request, run:

```bash
pnpm test
pnpm build
```

API tests clear application tables in the configured database. Always point `apps/api/.env` at a disposable test database before running `pnpm test`.

Keep changes focused, add or update tests for behavior changes, and describe any database migration or configuration change in the pull request.
