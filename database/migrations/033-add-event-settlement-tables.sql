CREATE TABLE IF NOT EXISTS event_expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_expense_items_event_booking_id ON event_expense_items(event_booking_id);

CREATE TABLE IF NOT EXISTS event_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL UNIQUE REFERENCES event_bookings(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CLOSED')),
  gross_revenue DECIMAL(10, 3) NOT NULL DEFAULT 0,
  materials_cost_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  total_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  net_profit_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  notes TEXT,
  settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_settlements_event_booking_id ON event_settlements(event_booking_id);

ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS event_booking_id UUID REFERENCES event_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_event_booking_id ON inventory_movements(event_booking_id);

CREATE TABLE IF NOT EXISTS event_inventory_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_event_booking_id ON event_inventory_usages(event_booking_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_item_id ON event_inventory_usages(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_status ON event_inventory_usages(status);