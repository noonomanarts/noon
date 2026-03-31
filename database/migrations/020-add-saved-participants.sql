-- Migration 020: Add saved_participants table
-- Allows users to save participant profiles (e.g. kids, colleagues) for faster repeat bookings.

CREATE TABLE IF NOT EXISTS saved_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(120),                         -- optional friendly label, e.g. "My son Ali"
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_participants_user ON saved_participants(user_id);

-- Prevent exact duplicates per user (same name + dob combination)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_participants_unique
  ON saved_participants(user_id, lower(full_name), date_of_birth);
