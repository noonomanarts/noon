-- 019-add-manual-cost-inventory-pool.sql

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
