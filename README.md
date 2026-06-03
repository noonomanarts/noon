# Noon Oman Arts

Production web platform for Noon Oman Arts, built with `Next.js`, `React`, `TypeScript`, and `PostgreSQL`.

## Overview

This repository contains a full business web application, not just a marketing site.

It currently includes:

- public bilingual website pages
- class discovery and booking flows
- event and group booking flows
- shop, cart, checkout, and promo code flows
- customer account, wallet, loyalty, and notifications
- admin dashboard and operational tooling
- worker and photographer role-specific dashboards
- SQL migrations and Docker-based deployment

## Core Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS v4`
- `PostgreSQL`
- `pg`
- Docker / Docker Compose

## Main Project Areas

### Public site

- localized routes under `/en` and `/ar`
- home, about, contact, FAQs, terms
- classes and event booking flows
- shop and product pages

### Customer features

- login and registration
- WhatsApp verification
- account settings
- wallet and loyalty
- notifications and orders

### Internal features

- admin dashboard
- shop and inventory operations
- classes and events management
- finance and reporting
- worker flows
- photographer flows

## Repository Structure

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages, layouts, and API routes |
| `src/components` | Site and admin UI components |
| `src/lib` | Shared business and infrastructure logic |
| `src/lib/db` | Database access layer |
| `database` | Schema, init scripts, and SQL migrations |
| `scripts` | Operational scripts |
| `public` | Static assets and local fonts |
| `docs` | Internal project documentation |
| `SERVER` | Proxy-related deployment setup |

## Requirements

- Node.js 20+
- `pnpm`
- Docker and Docker Compose
- PostgreSQL, usually via Docker in local development

## Installation

```bash
pnpm install
```

## Environment Setup

Create a local `.env` based on `.env.example`.

Important variables include:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `PAYMOB_API_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_SECRET_KEY`
- `PAYMOB_HMAC`
- `UPLOAD_DIR`

## Local Development

Typical local flow:

```bash
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

App default:

- local site: `http://localhost:3000`

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build the production app |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Run pending SQL migrations |
| `pnpm db:seed` | Seed database data |

## Database

The project uses PostgreSQL with:

- initialization SQL in `database/init`
- incremental migrations in `database/migrations`
- a custom migration runner in `scripts/run-migrations.js`

Important behavior:

- `database/init` runs only on first database initialization
- `database/migrations` runs over time as the schema evolves

## Deployment

The project is configured for containerized deployment.

Key points:

- Next.js is built with `output: "standalone"`
- the main application and PostgreSQL are defined in `docker-compose.yml`
- startup runs database readiness checks and pending migrations automatically
- `SERVER/` contains proxy and TLS companion setup

## Documentation

Detailed internal documentation is available in [docs/README.md](./docs/README.md).

Recommended reading:

1. [Project Overview](./docs/01-project-overview.md)
2. [System Architecture](./docs/02-system-architecture.md)
3. [Directory Structure](./docs/03-directory-structure.md)
4. [Local Development Guide](./docs/04-local-development.md)
5. [Coding Standards and Conventions](./docs/05-coding-standards.md)

## Development Rules

When contributing to this repository:

- keep database access inside `src/lib/db`
- keep reusable logic in `src/lib`
- keep admin and site UI separated
- preserve locale-aware behavior for `en` and `ar`
- add schema changes through migrations, not manual DB edits
- update documentation when architecture or workflow changes

## Notes

- authentication is currently cookie-based using `noon_session`
- the app supports multiple internal roles including `ADMIN`, `WORKER`, `PHOTOGRAPHER`, and `SOCIAL_MEDIA_ADMIN`
- many flows are operationally sensitive, so changes should be verified beyond simple page rendering
