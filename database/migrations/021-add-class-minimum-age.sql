-- 021-add-class-minimum-age.sql
-- Add minimum age restriction per workshop with visibility toggle

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS minimum_age INTEGER DEFAULT NULL;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS show_minimum_age BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN classes.minimum_age IS 'Minimum attendee age in years. NULL means no restriction.';
COMMENT ON COLUMN classes.show_minimum_age IS 'Whether to display the minimum age on the public workshop page.';
