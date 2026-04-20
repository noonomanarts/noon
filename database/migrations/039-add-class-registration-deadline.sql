-- Migration 039: Add explicit registration close deadline for classes
-- When registration_close_at is NULL, the effective deadline is computed at runtime
-- as start_date_time - 24 hours. Admins may set it explicitly to override.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS registration_close_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_classes_registration_close_at
  ON classes(registration_close_at);
