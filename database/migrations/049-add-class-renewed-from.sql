-- Migration 049: link renewed/duplicated classes to their source workshop so
-- repeat requesters can be notified reliably when a workshop is repeated.
ALTER TABLE classes ADD COLUMN IF NOT EXISTS renewed_from_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classes_renewed_from ON classes(renewed_from_class_id);
