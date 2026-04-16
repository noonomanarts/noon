# 03. Directory Structure

## Top-Level Structure

| Path | Purpose |
| --- | --- |
| `src/` | Application source code |
| `database/` | Schema, init scripts, and SQL migrations |
| `scripts/` | Operational and maintenance scripts |
| `public/` | Static assets, images, icons, fonts |
| `SERVER/` | Reverse proxy companion setup |
| `docs/` | Internal project documentation |

## `src/` Overview

### `src/app/`

Main routing layer for the Next.js App Router.

Contains:

- root layout and global files
- route groups for public and admin areas
- API route handlers
- role-specific dashboard pages
- upload-serving routes

Key subareas:

- `src/app/(site)/[locale]`
- `src/app/(admin)/[locale]`
- `src/app/api`

### `src/components/`

UI components are split by surface:

- `src/components/site`
- `src/components/admin`

This split should be preserved for maintainability.

### `src/lib/`

Shared application logic:

- auth and session helpers
- locale helpers
- page content and settings helpers
- payment, upload, notification, calendar, WhatsApp, email logic
- domain workflows and formatting helpers

### `src/lib/db/`

Database-focused modules:

- connection pool
- transactions
- type definitions
- domain repositories

This folder is the main data-access boundary.

### `src/types/`

Shared TypeScript types used across the application.

### `src/fonts/`

Project-level font references and notes.

## `database/` Overview

### `database/init/`

Bootstrap SQL scripts used when PostgreSQL initializes a fresh database volume.

### `database/migrations/`

Sequential SQL migration files applied by the custom migration runner.

### `database/schema.sql`

Repository-level schema reference.

## `scripts/` Overview

This directory contains utility scripts for:

- migrations
- database connection bootstrapping
- admin password support
- test and inspection utilities

Note that `scripts/` is intentionally excluded from the main ESLint flow because some files use CommonJS.

## Route Group Breakdown

### Public site routes

`src/app/(site)/[locale]` contains:

- marketing pages
- account pages
- classes
- events
- checkout and cart
- shop pages
- login/register

### Internal routes

`src/app/(admin)/[locale]` contains:

- admin dashboard
- worker dashboard
- photographer dashboard

## API Structure

`src/app/api` is organized by domain rather than by HTTP verb.

Examples:

- `admin`
- `account`
- `auth`
- `wallet`
- `shop`
- `public`
- `worker`
- `photographer`

This is a good pattern and should remain the default for future additions.

## Static Assets

`public/` includes:

- brand images
- slideshow media
- logos
- icons
- animation JSON
- local font files

Fonts are bundled locally rather than fetched remotely, which improves build reliability.

## Recommended Directory Rules

- Add new public components to `src/components/site`.
- Add new admin/dashboard components to `src/components/admin`.
- Add reusable logic to `src/lib`, not directly inside route files.
- Add database queries to the relevant `src/lib/db/*` module.
- Add new schema changes only through `database/migrations`.
- Keep static documentation under `docs/`, not scattered in random files.
