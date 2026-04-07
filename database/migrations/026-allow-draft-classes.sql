-- Migration 026: Allow nullable trainer_id for draft classes
-- This enables saving class forms as drafts before all required fields are filled

ALTER TABLE classes ALTER COLUMN trainer_id DROP NOT NULL;
ALTER TABLE classes ALTER COLUMN description SET DEFAULT '';
ALTER TABLE classes ALTER COLUMN price SET DEFAULT 0;
ALTER TABLE classes ALTER COLUMN category SET DEFAULT 'COOKING';
ALTER TABLE classes ALTER COLUMN sub_category SET DEFAULT 'MIXED';
