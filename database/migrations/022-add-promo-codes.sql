-- Promo codes for class bookings
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',  -- PERCENTAGE | FIXED
  discount_value NUMERIC(10,3) NOT NULL DEFAULT 0,           -- percentage (0-100) or fixed amount in OMR
  max_uses INTEGER DEFAULT NULL,                              -- NULL = unlimited
  times_used INTEGER NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(10,3) DEFAULT 0,                   -- minimum order to apply
  starts_at TIMESTAMPTZ DEFAULT NULL,                         -- NULL = immediately
  expires_at TIMESTAMPTZ DEFAULT NULL,                        -- NULL = never
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_unique ON promo_codes (UPPER(code));

-- Track which bookings used which promo code
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,3) DEFAULT 0;
