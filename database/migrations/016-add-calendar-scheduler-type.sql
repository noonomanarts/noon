-- Migration: Add non-blocking scheduler type to calendar events

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'calendar_event_type'
      AND e.enumlabel = 'SCHEDULER'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'SCHEDULER';
  END IF;
END $$;
