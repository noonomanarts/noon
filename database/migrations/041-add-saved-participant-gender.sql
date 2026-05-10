ALTER TABLE saved_participants
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

COMMENT ON COLUMN saved_participants.gender IS 'Optional saved participant gender: MALE, FEMALE, or OTHER.';