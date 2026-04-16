# 06. Database and Migrations

## Database Choice

The application uses PostgreSQL as its primary datastore.

Connection is handled through the `pg` package and a shared connection pool in `src/lib/db/pool.ts`.

## Connection Strategy

The project resolves database connectivity in this order:

1. use `DATABASE_URL` if it exists
2. otherwise derive a connection string from `PG*` or `POSTGRES_*` variables

This fallback behavior exists in both the runtime DB helper and the migration scripts.

## Pooling Pattern

The shared DB pool:

- uses a singleton pattern
- is cached in development to avoid repeated pool creation
- exposes helpers for `query`, `getClient`, and `transaction`

This is the expected access path for new DB work.

## Database Modules

The database layer is organized by domain.

Current examples include:

- users
- classes
- events
- trainers
- contacts
- wallet
- shop
- admin settings
- finance
- inventory
- notifications
- photographer
- promo codes

This organization should be preserved as the system grows.

## Schema Initialization

`database/init/` contains SQL scripts used only for first-time PostgreSQL initialization.

These scripts are suitable for:

- base schema creation
- seed bootstrap logic for a fresh volume

They are not a replacement for ongoing migrations.

## Migration Model

`database/migrations/` contains sequential SQL files applied by `scripts/run-migrations.js`.

Current repository state includes dozens of migration files, covering business growth over time.

## Migration Runner Behavior

The custom migration runner:

- ensures `schema_migrations` exists
- reads `.sql` files in sorted order
- skips previously applied versions
- runs each migration inside a transaction
- records success in `schema_migrations`

This is a straightforward and maintainable model.

## Migration Naming Standard

Use the current numeric prefix convention:

- `001-add-wallet-tables.sql`
- `027-add-photographer-dashboard.sql`
- `036-add-shop-product-reviews.sql`

Rules:

- keep numbering sequential
- use a descriptive slug
- prefer idempotent SQL when practical

## Migration Authoring Rules

When writing new migrations:

- make them safe to run once
- use `IF EXISTS` or `IF NOT EXISTS` where appropriate
- include related indexes and constraints
- update code and migration in the same change set
- test them on a local database before deployment

## Data Integrity Guidelines

For any new feature touching data:

- define ownership of the data model clearly
- map DB snake_case to frontend camelCase consistently
- use transactions for multi-table operations
- avoid silently swallowing write failures

## Operational Warning

If PostgreSQL uses a persisted Docker volume, changing environment passwords later does not automatically reconfigure the existing database user. This can look like an app bug when it is actually an infrastructure mismatch.

## Recommended Development Workflow for Schema Changes

1. create a new migration
2. update repository code
3. run migrations locally
4. test affected pages and APIs
5. deploy with migration-aware startup

## Rule

Never edit production schema manually as a substitute for a proper migration unless there is an emergency operation and it is separately documented afterward.
