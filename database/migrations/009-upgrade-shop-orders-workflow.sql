-- 009-upgrade-shop-orders-workflow.sql

ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120);
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;
ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_status_check
  CHECK (status IN ('PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'));

CREATE TABLE IF NOT EXISTS shop_order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  next_status VARCHAR(20) NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_order_status_history_order_id ON shop_order_status_history(order_id, created_at DESC);
