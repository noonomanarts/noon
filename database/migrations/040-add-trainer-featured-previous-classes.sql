-- Migration 040: Add trainer_profiles.featured_previous_class_ids
-- Allows admin to manually choose which past workshops appear in the
-- "Previous Classes" section of a trainer's public profile page.
-- An empty array means no previous workshops are shown publicly.

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS featured_previous_class_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
