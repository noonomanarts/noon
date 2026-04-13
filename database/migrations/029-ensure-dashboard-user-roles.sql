-- Migration 029: Ensure dashboard user roles exist on older databases
-- Some environments were missing PHOTOGRAPHER and WORKER enum values in user_role.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'PHOTOGRAPHER'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'PHOTOGRAPHER';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'WORKER'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'WORKER';
  END IF;
END $$;