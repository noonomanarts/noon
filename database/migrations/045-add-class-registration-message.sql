-- Add fixed registration auto-message sent to participants on booking
ALTER TABLE classes ADD COLUMN IF NOT EXISTS registration_message TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS registration_message_ar TEXT;
