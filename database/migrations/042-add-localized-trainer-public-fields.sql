ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255);

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS display_name_ar VARCHAR(255);

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS bio_en TEXT;

ALTER TABLE trainer_profiles
  ADD COLUMN IF NOT EXISTS bio_ar TEXT;