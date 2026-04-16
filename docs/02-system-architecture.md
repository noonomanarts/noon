# 02. System Architecture

## Architectural Overview

The application is structured as a full-stack Next.js monolith with clear internal layers:

1. routing and layout layer in `src/app`
2. UI composition layer in `src/components`
3. business and infrastructure logic in `src/lib`
4. persistence layer in `src/lib/db`
5. PostgreSQL schema and migrations in `database`

## Main Architectural Layers

### 1. App Router layer

`src/app` contains:

- root application layout
- localized site routes
- admin and role-specific dashboards
- API route handlers
- error boundaries and special route files

The project uses route groups to separate major surfaces:

- `(site)`
- `(admin)`

This keeps public and internal experiences logically separate while still living inside one application.

### 2. Component layer

UI is split into:

- `src/components/site`
- `src/components/admin`

The split is practical and effective. Public and dashboard concerns are not mixed in the same component directory.

### 3. Business logic layer

`src/lib` contains reusable logic such as:

- session and auth helpers
- locale helpers
- payment integration helpers
- upload path resolution
- notifications
- email and WhatsApp integrations
- page settings and content helpers
- domain-specific pricing and workflow logic

This layer is where cross-route behavior should live. It helps keep route handlers and pages thinner.

### 4. Database access layer

`src/lib/db` is the main persistence boundary.

It contains:

- PostgreSQL pool and transaction helpers
- domain-specific query modules
- shared database types

The current pattern is repository-style modules grouped by business domain, for example:

- `users.ts`
- `classes.ts`
- `events.ts`
- `shop.ts`
- `wallet.ts`
- `finance.ts`
- `inventory.ts`

## Request Flow

Typical request flow:

1. a page or API route receives input
2. input is sanitized or validated inside the route or helper functions
3. business logic is delegated to `src/lib` or `src/lib/db`
4. database operations run through the shared pool or transactions
5. the route returns JSON or the page renders UI

## Authentication Model

The current auth model is cookie-based.

- session cookie name: `noon_session`
- session resolution uses `cookies()` from Next.js
- user lookup is performed through the users database module

Role-based protection is enforced both in reusable helpers and directly in some route/layout code.

Important implication:

- auth is simple and readable
- role checks must be applied consistently
- maintainers should avoid duplicating incompatible auth logic across routes

## Localization and Directionality

Locale support is route-based:

- `/en/...`
- `/ar/...`

Supporting helpers exist in `src/lib/locale.ts`, and direction is applied at the root layout level. Many components contain explicit English and Arabic labels rather than external i18n dictionaries.

## Styling Architecture

Styling combines:

- Tailwind utility classes
- CSS custom properties in `src/app/globals.css`
- shared brand tokens
- localized direction handling

This means visual consistency depends on using the existing token model rather than inventing one-off colors and spacing rules repeatedly.

## Runtime Characteristics

### Server-first structure

The codebase uses server components by default, and interactive areas are isolated with `"use client"` where necessary.

### Node-dependent features

Several backend and integration paths depend on Node runtime behavior:

- database access
- file system access
- email and WhatsApp integrations
- payment flows

This is not an edge-first architecture.

## Strengths of the Current Architecture

- clear separation between UI, domain logic, and persistence
- practical monolith structure
- explicit route layout organization
- SQL migrations with predictable deployment behavior
- direct, understandable code paths

## Architectural Risks to Watch

- some validation and auth logic are implemented manually in routes, which can drift over time
- bilingual strings are often inline, which increases maintenance effort
- the project spans many business domains, so accidental coupling is easy if boundaries are ignored
- large client components in admin surfaces can become hard to maintain if not refactored deliberately

## Guidance for New Work

- keep data access in `src/lib/db`
- keep reusable business logic in `src/lib`
- keep route handlers thin
- keep public and admin UI concerns separated
- preserve locale-aware behavior and role-aware authorization in every new feature
