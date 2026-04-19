-- Migration 037: Support admin-created shop orders with delivery/pickup
-- and extended payment methods (bank transfer, payment link).

-- 1) Allow pickup orders (no delivery address required).
ALTER TABLE shop_orders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE shop_orders ALTER COLUMN area DROP NOT NULL;
ALTER TABLE shop_orders ALTER COLUMN street_address DROP NOT NULL;

-- 2) Fulfillment type (DELIVERY or PICKUP from Noon).
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shop_orders_fulfillment_type_check'
  ) THEN
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_fulfillment_type_check
      CHECK (fulfillment_type IN ('DELIVERY', 'PICKUP'));
  END IF;
END $$;

-- 3) Widen payment_method to support admin-recorded methods.
ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_payment_method_check;
ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_payment_method_check
  CHECK (payment_method IN ('WALLET', 'BANK_TRANSFER', 'PAYMENT_LINK', 'CASH'));

-- 4) Audit: track which admin user created a manual order (nullable for self-checkout).
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
