-- Add PDF attachment field for trainer workshop suggestions
ALTER TABLE trainer_workshop_suggestions
  ADD COLUMN IF NOT EXISTS recipe_pdf VARCHAR(500);
