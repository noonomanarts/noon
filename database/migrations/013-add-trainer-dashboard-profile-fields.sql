-- Add trainer profile fields for public media and manual upcoming courses
ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS featured_media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE';

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS featured_media_url VARCHAR(500);

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS manual_upcoming_courses JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Table for trainer-suggested workshops
CREATE TABLE IF NOT EXISTS trainer_workshop_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255),
  brief TEXT,
  recipe TEXT,
  notes TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
  live_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trainer_workshop_suggestions_status_check'
  ) THEN
    ALTER TABLE trainer_workshop_suggestions
      ADD CONSTRAINT trainer_workshop_suggestions_status_check
      CHECK (status IN ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_trainer_id
  ON trainer_workshop_suggestions(trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_status
  ON trainer_workshop_suggestions(status);
