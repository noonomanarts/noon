-- Migration 040: Add trainer_profiles.featured_previous_class_ids
-- Allows admin to manually choose which workshops appear in the
-- "Previous Classes" section of a trainer's public profile page.
-- When NULL or an empty array, the public page falls back to the
-- automatic list of past PUBLISHED classes for the trainer.

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS featured_previous_class_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
