ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_class_reminder_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS whatsapp_class_review_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp_class_reminder_sent_at
ON bookings(whatsapp_class_reminder_sent_at);

CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp_class_review_sent_at
ON bookings(whatsapp_class_review_sent_at);
