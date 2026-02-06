# Database Migrations

This folder contains SQL migration files that are run automatically when the application starts.

## How it works

1. **Initial Setup**: When the database is first created, PostgreSQL automatically runs all `.sql` files in `database/init/` in alphabetical order.

2. **Ongoing Migrations**: When the app starts, the `run-migrations.js` script checks for any new migration files in this folder and runs them.

## Creating a new migration

1. Create a new SQL file with a version prefix: `003_add_new_feature.sql`
2. The version number should be sequential
3. The migration will be tracked in the `schema_migrations` table

## Example migration file

```sql
-- 003_add_new_column.sql

-- Add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_new_column ON users(new_column);
```

## Important notes

- Migrations are run in alphabetical order
- Each migration runs only once (tracked in `schema_migrations` table)
- Always use `IF NOT EXISTS` or `IF EXISTS` to make migrations idempotent
- Test migrations locally before deploying
