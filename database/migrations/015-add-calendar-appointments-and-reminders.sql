-- Migration: Add calendar appointment type and reminder fields
-- Version: 015

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'calendar_event_type'
      AND e.enumlabel = 'APPOINTMENT'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'APPOINTMENT';
  END IF;
END $$;

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS appointment_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS appointment_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER,
  ADD COLUMN IF NOT EXISTS notify_at_start BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS start_notification_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_reminder_minutes_before_check;

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_reminder_minutes_before_check
  CHECK (reminder_minutes_before IS NULL OR (reminder_minutes_before >= 0 AND reminder_minutes_before <= 1440));
