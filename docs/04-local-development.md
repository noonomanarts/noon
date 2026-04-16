# 04. Local Development Guide

## Prerequisites

Before running the project locally, make sure you have:

- Node.js compatible with `Next.js 16`
- `pnpm`
- Docker and Docker Compose for PostgreSQL-based local setup
- a local `.env` file

## Main Development Scripts

Defined in `package.json`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Build the production app |
| `pnpm start` | Start the production server after build |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Run pending SQL migrations |
| `pnpm db:seed` | Seed the database |

## Environment Setup

Use `.env.example` as the baseline.

Important variables currently used by the codebase include:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `APP_PORT`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `PAYMOB_API_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_SECRET_KEY`
- `PAYMOB_HMAC`
- `PAYMOB_PAYMENT_METHODS`
- `PAYMOB_INTEGRATION_ID`
- `UPLOAD_DIR`

## Recommended Local Startup Flow

### Option 1: Docker-backed database + local Next.js app

1. Create `.env` from `.env.example`
2. Start PostgreSQL
3. Install dependencies
4. Run migrations
5. Start the app

Suggested command sequence:

```bash
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

### Option 2: Full Docker stack

Use the repository `docker-compose.yml` if you want the app and database together inside containers.

This is closer to the production shape, especially because the application is built with `output: "standalone"`.

## Database Notes for Local Development

- local defaults point to PostgreSQL on port `5433`
- the app can build `DATABASE_URL` from PG/POSTGRES variables if needed
- migration execution is separate from init scripts

Important operational detail:

- `database/init/*.sql` runs only when PostgreSQL creates a fresh data volume
- `database/migrations/*.sql` runs continuously over time through the custom runner

## Authentication Notes

The project uses a cookie named `noon_session` for the current session model. If auth-related work behaves unexpectedly, inspect:

- cookie creation and deletion
- user lookup logic
- route- and layout-level role checks

## Localization Notes

The route root redirects to `/ar`, and locale-aware routes live under:

- `/en`
- `/ar`

Any feature developed for page rendering should be verified in both locales, especially when layout direction matters.

## Suggested Local Verification Checklist

Before opening a PR or merging changes, verify:

- the app starts cleanly
- `pnpm lint` passes
- changed pages render in both `en` and `ar` when relevant
- auth/role protections still work
- database migrations run successfully if schema changed
- uploads, notifications, and payment flows are not broken by path or env changes

## Common Local Failure Points

### Database connection issues

Check:

- `DATABASE_URL`
- `POSTGRES_*` values
- Docker container health
- whether the persisted DB volume still uses an older password

### Missing uploads

The code supports configurable upload roots and legacy fallback roots. If uploads appear broken, inspect `UPLOAD_DIR` and the filesystem paths resolved by the upload helper.

### Payment integration failures

Paymob configuration is strict. Missing or mismatched environment variables will cause runtime errors.

## Rule for New Contributors

Do not start implementing features until you can:

- run the app locally
- connect to the database
- run migrations
- lint the codebase successfully
