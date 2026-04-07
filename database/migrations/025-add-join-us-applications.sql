-- Migration 025: Add join-us application forms table
-- Supports trainer applications and future social media hire applications

CREATE TABLE IF NOT EXISTS join_us_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type       VARCHAR(50) NOT NULL DEFAULT 'trainer',
  status          VARCHAR(30) NOT NULL DEFAULT 'NEW',

  -- Personal Information
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  email           VARCHAR(255) NOT NULL,
  date_of_birth   DATE,
  nationality     VARCHAR(120),
  address         VARCHAR(500),
  instagram_url   VARCHAR(500),
  photo_url       VARCHAR(500),

  -- Qualifications
  certifications  TEXT,
  employment_status VARCHAR(50),
  employer_details TEXT,

  -- Training Experience
  has_prior_training BOOLEAN DEFAULT FALSE,
  prior_training_details TEXT,
  motivation      TEXT,
  personality_description TEXT,

  -- Workshop Category
  workshop_category VARCHAR(50),
  other_skills_detail TEXT,

  -- Culinary-specific
  has_restaurant_experience BOOLEAN DEFAULT FALSE,
  restaurant_details TEXT,
  recipe_file_url VARCHAR(500),
  kitchen_interests TEXT,
  culinary_dishes TEXT[],

  -- Arts & Crafts-specific
  arts_specialization TEXT,
  arts_workshop_ideas TEXT[],

  -- Generic JSONB for future form types (social media, etc.)
  extra_data      JSONB DEFAULT '{}',

  -- Confirmation email
  confirmation_email_sent BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_join_us_applications_form_type ON join_us_applications(form_type);
CREATE INDEX IF NOT EXISTS idx_join_us_applications_status ON join_us_applications(status);
CREATE INDEX IF NOT EXISTS idx_join_us_applications_created_at ON join_us_applications(created_at DESC);

-- Ensure admin_settings exists on fresh databases
CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC);

-- Admin setting for controlling form visibility
-- Key: 'join_us_forms', value: { trainer: { enabled: true }, social_media: { enabled: false } }
INSERT INTO admin_settings (key, value)
VALUES (
  'join_us_forms',
  '{"trainer": {"enabled": true}, "social_media": {"enabled": false}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
