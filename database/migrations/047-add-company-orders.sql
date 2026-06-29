-- 047-add-company-orders.sql
-- Adds the "Companies" feature: B2B orders with packages, costs, attachments,
-- invoice generation, payment status, and finance/inventory settlement.

CREATE SEQUENCE IF NOT EXISTS company_invoice_number_seq START 1000;

CREATE TABLE IF NOT EXISTS company_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number INTEGER NOT NULL DEFAULT nextval('company_invoice_number_seq'),
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(60),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  total_amount DECIMAL(12, 3) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0,
  profit DECIMAL(12, 3) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method VARCHAR(20) CHECK (payment_method IN ('BANK_TRANSFER', 'CARD', 'CASH', 'PAYMENT_LINK')),
  paid_at TIMESTAMP WITH TIME ZONE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_number)
);

CREATE TABLE IF NOT EXISTS company_order_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES company_orders(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(12, 3) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_order_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES company_orders(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  cost_type VARCHAR(20) NOT NULL DEFAULT 'DIRECT_BILL' CHECK (cost_type IN ('DIRECT_BILL', 'INVENTORY_CUT')),
  amount DECIMAL(12, 3) NOT NULL DEFAULT 0,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  quantity DECIMAL(12, 3),
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_order_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES company_orders(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(200) NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS company_order_id UUID REFERENCES company_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_order_packages_order ON company_order_packages(order_id);
CREATE INDEX IF NOT EXISTS idx_company_order_costs_order ON company_order_costs(order_id);
CREATE INDEX IF NOT EXISTS idx_company_order_attachments_order ON company_order_attachments(order_id);
CREATE INDEX IF NOT EXISTS idx_company_orders_status ON company_orders(status);
