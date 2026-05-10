ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS audience_gender VARCHAR(20) NOT NULL DEFAULT 'MIXED';

COMMENT ON COLUMN classes.audience_gender IS 'Enrollment audience restriction for the class: MALE_ONLY, FEMALE_ONLY, or MIXED.';