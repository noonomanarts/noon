-- Migration 024: Flatten sessions into classes
-- Each class becomes a single event with its own date/time/seats_booked.
-- Removes the need for class_sessions table.

-- Step 1: Add date/time and bookings columns to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS start_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS end_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS seats_booked INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add recipe/workshop fields (moved from class_sessions)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recipe_submitted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recipe_pdf VARCHAR(500);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS grocery_list TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_brief TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS workshop_photos TEXT[] DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS trainer_photos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS highlighted_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_title VARCHAR(255);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_pdf VARCHAR(500);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_brief TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_visible_to_customers BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS final_recipe_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS admin_workshop_notes TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS admin_workshop_notes_photo VARCHAR(500);

-- Step 3: Migrate data from first (earliest) session of each class
UPDATE classes c SET
  start_date_time = sub.start_date_time,
  end_date_time = sub.end_date_time,
  seats_booked = sub.seats_booked,
  recipe_submitted = COALESCE(sub.recipe_submitted, FALSE),
  recipe_pdf = sub.recipe_pdf,
  grocery_list = sub.grocery_list,
  workshop_brief = sub.workshop_brief,
  workshop_photos = COALESCE(sub.photos, '{}'),
  trainer_photos = COALESCE(sub.trainer_photos, '{}'),
  highlighted_ingredients = COALESCE(sub.highlighted_ingredients, '[]'::jsonb),
  final_recipe_title = sub.final_recipe_title,
  final_recipe_pdf = sub.final_recipe_pdf,
  final_recipe_brief = sub.final_recipe_brief,
  final_recipe_visible_to_customers = COALESCE(sub.final_recipe_visible_to_customers, FALSE),
  final_recipe_published_at = sub.final_recipe_published_at,
  admin_workshop_notes = sub.admin_workshop_notes,
  admin_workshop_notes_photo = sub.admin_workshop_notes_photo
FROM (
  SELECT DISTINCT ON (class_id)
    class_id,
    start_date_time,
    end_date_time,
    seats_booked,
    recipe_submitted,
    recipe_pdf,
    grocery_list,
    workshop_brief,
    photos,
    trainer_photos,
    highlighted_ingredients,
    final_recipe_title,
    final_recipe_pdf,
    final_recipe_brief,
    final_recipe_visible_to_customers,
    final_recipe_published_at,
    admin_workshop_notes,
    admin_workshop_notes_photo
  FROM class_sessions
  ORDER BY class_id, start_date_time ASC
) sub
WHERE c.id = sub.class_id;

-- Step 4: Add class_id to calendar_events (replaces class_session_id)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- Update calendar_events to reference class_id via session
UPDATE calendar_events ce
SET class_id = cs.class_id
FROM class_sessions cs
WHERE ce.class_session_id = cs.id
  AND ce.class_id IS NULL;

-- Step 5: Make session_id nullable in bookings
ALTER TABLE bookings ALTER COLUMN session_id DROP NOT NULL;

-- Step 6: Make class_session_id nullable in calendar_events (already nullable, just for clarity)
-- Already nullable by schema definition

-- Step 7: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_classes_start_date_time ON classes(start_date_time);
CREATE INDEX IF NOT EXISTS idx_classes_seats_booked ON classes(seats_booked);
CREATE INDEX IF NOT EXISTS idx_calendar_events_class_id ON calendar_events(class_id);
