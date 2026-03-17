DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'EMPLOYEE'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'EMPLOYEE';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'SOCIAL_MEDIA_ADMIN'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'SOCIAL_MEDIA_ADMIN';
  END IF;
END $$;