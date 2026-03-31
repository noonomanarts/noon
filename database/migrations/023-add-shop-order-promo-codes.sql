-- Add promo code support for shop checkout orders
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,3) NOT NULL DEFAULT 0;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_shop_orders_promo_code_id ON shop_orders (promo_code_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_promo_code ON shop_orders (promo_code);
