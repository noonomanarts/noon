# Project Documentation

This directory contains the internal documentation set for the `noon` project.

## Table of Contents

1. [01. Project Overview](./01-project-overview.md)
2. [02. System Architecture](./02-system-architecture.md)
3. [03. Directory Structure](./03-directory-structure.md)
4. [04. Local Development Guide](./04-local-development.md)
5. [05. Coding Standards and Conventions](./05-coding-standards.md)
6. [06. Database and Migrations](./06-database-and-migrations.md)
7. [07. API Design and Backend Patterns](./07-api-design.md)
8. [08. Deployment and Operations](./08-deployment-and-operations.md)
9. [09. Product Domains and User Roles](./09-product-domains-and-roles.md)

## Documentation Goals

This documentation set is intended to help:

- new developers understand the project quickly
- maintainers reason about architectural decisions
- contributors follow the existing code style and workflow
- operators deploy and troubleshoot the application safely

## Scope

The documents are based on the current repository state, including:

- `Next.js 16` with App Router
- `React 19`
- `TypeScript` in strict mode
- `Tailwind CSS v4`
- `PostgreSQL` via `pg`
- SQL-based migrations in `database/migrations`
- Docker-based production deployment

## Recommended Reading Order

1. Start with [01. Project Overview](./01-project-overview.md)
2. Continue with [02. System Architecture](./02-system-architecture.md)
3. Review [03. Directory Structure](./03-directory-structure.md)
4. Use [04. Local Development Guide](./04-local-development.md) to run the project
5. Follow [05. Coding Standards and Conventions](./05-coding-standards.md) before changing code

## Maintenance Rule

Whenever the project structure, architecture, deployment flow, or development conventions change, these documents should be updated in the same branch as the related code changes.
