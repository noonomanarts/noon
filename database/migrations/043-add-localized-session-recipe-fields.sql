-- Migration 043: add localized final recipe fields to class_sessions

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_title_ar VARCHAR(255);

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_pdf_ar VARCHAR(500);

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS final_recipe_brief_ar TEXT;