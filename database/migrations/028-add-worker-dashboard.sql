-- Migration 028: Add Worker Dashboard
-- Adds WORKER role, worker permissions, stock restocks tracking, and in-shop sales

-- 1. Add WORKER to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'WORKER';

-- 2. Create worker_permissions table for granular permission control
CREATE TABLE IF NOT EXISTS worker_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Permission flags
  can_restock BOOLEAN NOT NULL DEFAULT FALSE,          -- Add restocked products
  can_record_sales BOOLEAN NOT NULL DEFAULT FALSE,     -- Record in-shop sales
  can_manage_orders BOOLEAN NOT NULL DEFAULT FALSE,    -- View/update website orders
  can_print_labels BOOLEAN NOT NULL DEFAULT FALSE,     -- Print product labels
  can_print_bills BOOLEAN NOT NULL DEFAULT FALSE,      -- Print sale bills
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT worker_permissions_user_unique UNIQUE (user_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_worker_permissions_user ON worker_permissions(user_id);

-- 3. Create stock_restocks table to track product restocking
CREATE TABLE IF NOT EXISTS stock_restocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  worker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  quantity_added INTEGER NOT NULL CHECK (quantity_added > 0),
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 3),                           -- Cost per unit (optional)
  total_cost DECIMAL(10, 3),                          -- Total cost for this restock
  supplier_name VARCHAR(255),                         -- Optional supplier info
  notes TEXT,
  notes_ar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for restocks
CREATE INDEX IF NOT EXISTS idx_stock_restocks_product ON stock_restocks(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_restocks_worker ON stock_restocks(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_stock_restocks_created ON stock_restocks(created_at DESC);

-- 4. Create in_shop_sales table for recording direct shop sales
CREATE TABLE IF NOT EXISTS in_shop_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number VARCHAR(30) UNIQUE NOT NULL,            -- e.g., SALE-20260409-001
  worker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),                          -- Optional customer name
  customer_phone VARCHAR(50),                          -- Optional customer phone
  subtotal DECIMAL(10, 3) NOT NULL,
  discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  discount_reason VARCHAR(255),
  total_amount DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH', -- CASH | CARD | BANK_TRANSFER
  notes TEXT,
  notes_ar TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,                 -- If sale was voided
  voided_by_user_id UUID REFERENCES users(id),
  void_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create in_shop_sale_items table
CREATE TABLE IF NOT EXISTS in_shop_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES in_shop_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 3) NOT NULL,
  line_total DECIMAL(10, 3) NOT NULL,
  -- Snapshot of product data at time of sale
  product_name_en VARCHAR(255) NOT NULL,
  product_name_ar VARCHAR(255) NOT NULL,
  product_sku VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for in-shop sales
CREATE INDEX IF NOT EXISTS idx_in_shop_sales_worker ON in_shop_sales(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_in_shop_sales_created ON in_shop_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_shop_sales_number ON in_shop_sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_in_shop_sale_items_sale ON in_shop_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_in_shop_sale_items_product ON in_shop_sale_items(product_id);

-- 5. Add trainer_id to users for "Mum" notification routing
-- When a worker restocks, we notify the trainer assigned to receive stock notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS receives_stock_notifications BOOLEAN NOT NULL DEFAULT FALSE;

-- 6. Create a view for worker dashboard statistics
CREATE OR REPLACE VIEW worker_stats AS
SELECT
  w.user_id,
  (SELECT COUNT(*) FROM stock_restocks WHERE worker_user_id = w.user_id) AS total_restocks,
  (SELECT COUNT(*) FROM in_shop_sales WHERE worker_user_id = w.user_id AND voided_at IS NULL) AS total_sales,
  (SELECT COALESCE(SUM(total_amount), 0) FROM in_shop_sales WHERE worker_user_id = w.user_id AND voided_at IS NULL) AS total_sales_amount,
  (SELECT COUNT(*) FROM stock_restocks WHERE worker_user_id = w.user_id AND created_at >= CURRENT_DATE) AS restocks_today,
  (SELECT COUNT(*) FROM in_shop_sales WHERE worker_user_id = w.user_id AND voided_at IS NULL AND created_at >= CURRENT_DATE) AS sales_today
FROM worker_permissions w;

-- 7. Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number() RETURNS VARCHAR(30) AS $$
DECLARE
  today_date VARCHAR(8);
  seq_num INTEGER;
  new_number VARCHAR(30);
BEGIN
  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO seq_num
  FROM in_shop_sales
  WHERE sale_number LIKE 'SALE-' || today_date || '-%';
  
  new_number := 'SALE-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
