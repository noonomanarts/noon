-- 019-add-manual-cost-inventory-pool.sql

-- Ensure inventory tables exist (they were previously created lazily at runtime)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(180) NOT NULL,
  sku VARCHAR(100),
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  reorder_level DECIMAL(12, 3) NOT NULL DEFAULT 0,
  current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  average_unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (average_unit_cost >= 0),
  total_purchase_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_purchase_cost >= 0),
  total_consumed_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_consumed_cost >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  allows_manual_cost BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku_unique ON inventory_items((LOWER(sku))) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_name VARCHAR(255),
  invoice_number VARCHAR(120),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchases_occurred_at ON inventory_purchases(occurred_at DESC);

CREATE TABLE IF NOT EXISTS inventory_purchase_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_purchase_id ON inventory_purchase_lines(purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_item_id ON inventory_purchase_lines(inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('PURCHASE', 'WORKSHOP_USAGE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
  reference_type VARCHAR(50),
  reference_id UUID,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  notes TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_class_id ON inventory_movements(class_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at ON inventory_movements(occurred_at DESC);

CREATE TABLE IF NOT EXISTS class_inventory_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  manual_cost_amount DECIMAL(12, 3),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'POSTED')),
  posted_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_class_id ON class_inventory_usages(class_id);
CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_item_id ON class_inventory_usages(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_status ON class_inventory_usages(status);

-- Original migration: add columns + seed data
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS allows_manual_cost BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE class_inventory_usages
ADD COLUMN IF NOT EXISTS manual_cost_amount DECIMAL(12, 3);

INSERT INTO inventory_items (
  name,
  unit,
  reorder_level,
  current_stock,
  average_unit_cost,
  total_purchase_cost,
  total_consumed_cost,
  currency,
  allows_manual_cost,
  is_active,
  created_at,
  updated_at
)
SELECT
  'General Materials Pool',
  'credit',
  0,
  0,
  1,
  0,
  0,
  'OMR',
  TRUE,
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM inventory_items
  WHERE allows_manual_cost = TRUE
);
