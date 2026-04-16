# 05. Coding Standards and Conventions

## Purpose

This document describes the coding style already present in the repository and the standards that new code should follow.

## General Principles

- Prefer simple, explicit code over abstract frameworks.
- Keep business logic out of JSX-heavy page files where possible.
- Keep data access inside `src/lib/db`.
- Keep route handlers focused on HTTP concerns.
- Preserve bilingual behavior and role-based restrictions.

## TypeScript Standards

The project uses strict TypeScript settings. New code should:

- keep types explicit at public boundaries
- avoid `any`
- model domain data with named types or interfaces
- use camelCase in frontend-facing objects and preserve DB field mapping clearly

## Routing Standards

### Use App Router conventions

New routes should follow Next.js App Router patterns already used in the repo:

- `page.tsx` for pages
- `layout.tsx` for shared wrappers
- `route.ts` for API handlers
- route groups for surface separation

### Respect route grouping

- public UX belongs under `(site)`
- internal/admin/role dashboards belong under `(admin)`

## Component Standards

### Server by default

Use server components unless interactivity requires `"use client"`.

### Client component rule

Only mark a file as client-rendered when it needs:

- browser APIs
- local React state
- event-heavy interactivity
- effects

### Component placement

- public-facing UI: `src/components/site`
- internal/admin UI: `src/components/admin`

## Backend and API Standards

### Route handler pattern

The current route pattern typically includes:

1. parse request body
2. sanitize values
3. validate required fields
4. authorize user if needed
5. call domain/db helpers
6. return `NextResponse.json`
7. log and return a controlled error on failure

This pattern should remain consistent.

### Validation style

Validation is currently implemented manually in many routes through:

- local parsing helpers
- trimming
- maximum length rules
- value whitelisting
- business-rule checks

If introducing a schema validation library later, apply it consistently. Do not mix incompatible validation styles ad hoc.

## Database Access Standards

- Put queries in `src/lib/db/*`
- use the shared pool helper
- use transactions for multi-step writes
- keep query modules grouped by domain
- avoid embedding raw SQL directly in route handlers unless the case is unusually small and justified

## Styling Standards

The UI uses:

- Tailwind utility classes
- CSS variables for brand and theme tokens
- global locale-aware styling

New UI work should:

- reuse existing color and typography tokens
- avoid hardcoding random color systems
- preserve bilingual and directional behavior
- stay consistent with existing admin/site visual separation

## Localization Standards

Because the project is bilingual:

- any user-facing text should consider both `en` and `ar`
- any layout-sensitive feature should be tested in both `ltr` and `rtl`
- avoid shipping features that only work visually in one locale

## Auth and Role Standards

When adding protected features:

- authenticate explicitly
- authorize by role explicitly
- do not assume a page-level guard is enough if an API route can still be called directly

## Naming Conventions

Current naming patterns are generally:

- components: `PascalCase`
- helpers and utility files: `camelCase`
- SQL migrations: numeric prefix + descriptive slug
- route folders: domain-oriented names

Follow the existing conventions rather than introducing new naming schemes.

## Commenting Standards

- write comments only when intent is not obvious
- prefer comments that explain why, not what
- remove stale comments during refactors

## Practical Quality Standard

A code change is not complete unless it also preserves:

- route organization
- type safety
- role safety
- locale behavior
- database correctness
- operational readability
