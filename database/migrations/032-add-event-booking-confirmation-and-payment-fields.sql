ALTER TABLE event_bookings
ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(120) UNIQUE,
ADD COLUMN IF NOT EXISTS confirmation_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120),
ADD COLUMN IF NOT EXISTS payment_gateway_order_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_event_bookings_confirmation_token ON event_bookings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_event_bookings_payment_reference ON event_bookings(payment_reference);
CREATE INDEX IF NOT EXISTS idx_event_bookings_payment_gateway_order_id ON event_bookings(payment_gateway_order_id);