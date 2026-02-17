-- 008-add-shop-orders.sql

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(30) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED')),
  city VARCHAR(80) NOT NULL,
  area VARCHAR(120) NOT NULL,
  street_address TEXT NOT NULL,
  postal_code VARCHAR(30),
  recipient_full_name VARCHAR(160) NOT NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  notes TEXT,
  subtotal DECIMAL(10, 3) NOT NULL CHECK (subtotal >= 0),
  shipping_fee DECIMAL(10, 3) NOT NULL DEFAULT 2.000 CHECK (shipping_fee >= 0),
  total_amount DECIMAL(10, 3) NOT NULL CHECK (total_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  payment_method VARCHAR(20) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET')),
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_orders_order_number ON shop_orders(order_number);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 3) NOT NULL CHECK (unit_price >= 0),
  line_total DECIMAL(10, 3) NOT NULL CHECK (line_total >= 0),
  product_name_en VARCHAR(255) NOT NULL,
  product_name_ar VARCHAR(255) NOT NULL,
  product_slug VARCHAR(255) NOT NULL,
  product_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_product_id ON shop_order_items(product_id);
