-- 011-add-finance-reasons-and-settings.sql

CREATE TABLE IF NOT EXISTS admin_finance_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(10) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(entry_type, name)
);

CREATE TABLE IF NOT EXISTS admin_finance_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  default_currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  require_reason_selection BOOLEAN NOT NULL DEFAULT TRUE,
  allow_custom_reason BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reason_id UUID;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reason_name VARCHAR(120);

ALTER TABLE admin_finance_reasons DROP CONSTRAINT IF EXISTS admin_finance_reasons_entry_type_check;
ALTER TABLE admin_finance_reasons
  ADD CONSTRAINT admin_finance_reasons_entry_type_check
  CHECK (entry_type IN ('INCOME', 'EXPENSE'));

ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_reason_id_fkey;
ALTER TABLE admin_finance_entries
  ADD CONSTRAINT admin_finance_entries_reason_id_fkey
  FOREIGN KEY (reason_id) REFERENCES admin_finance_reasons(id) ON DELETE SET NULL;

INSERT INTO admin_finance_settings (id, default_currency, require_reason_selection, allow_custom_reason)
VALUES (TRUE, 'OMR', TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_finance_reasons (entry_type, name, description, sort_order, is_active, is_system)
VALUES
  ('INCOME', 'Classes Revenue', 'Income from classes and workshops', 10, TRUE, TRUE),
  ('INCOME', 'Events Revenue', 'Income from private events and bookings', 20, TRUE, TRUE),
  ('INCOME', 'Shop Sales', 'Income from product sales', 30, TRUE, TRUE),
  ('INCOME', 'Other Income', 'Other income sources', 999, TRUE, TRUE),
  ('EXPENSE', 'Salaries', 'Team and trainer payments', 10, TRUE, TRUE),
  ('EXPENSE', 'Rent & Utilities', 'Rent, electricity, internet and utilities', 20, TRUE, TRUE),
  ('EXPENSE', 'Supplies', 'Class and operations supplies', 30, TRUE, TRUE),
  ('EXPENSE', 'Marketing', 'Marketing and advertising costs', 40, TRUE, TRUE),
  ('EXPENSE', 'Other Expense', 'Other expenses', 999, TRUE, TRUE)
ON CONFLICT (entry_type, name) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_finance_reasons_type_name ON admin_finance_reasons(entry_type, name);
CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_type ON admin_finance_reasons(entry_type);
CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_active ON admin_finance_reasons(is_active, is_archived);
CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_sort_order ON admin_finance_reasons(entry_type, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_reason_id ON admin_finance_entries(reason_id);
