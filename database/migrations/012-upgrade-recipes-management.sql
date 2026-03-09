-- 012-upgrade-recipes-management.sql

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS trainer_photos TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS highlighted_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_title VARCHAR(255);

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_pdf VARCHAR(500);

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_brief TEXT;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_visible_to_customers BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_published_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS admin_workshop_notes TEXT;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS admin_workshop_notes_photo VARCHAR(500);

UPDATE class_sessions
SET trainer_photos = COALESCE(photos, '{}')
WHERE (trainer_photos IS NULL OR CARDINALITY(trainer_photos) = 0)
  AND photos IS NOT NULL
  AND CARDINALITY(photos) > 0;

CREATE INDEX IF NOT EXISTS idx_class_sessions_final_recipe_visible
  ON class_sessions(final_recipe_visible_to_customers);

CREATE INDEX IF NOT EXISTS idx_class_sessions_final_recipe_published_at
  ON class_sessions(final_recipe_published_at DESC);
