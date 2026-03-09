-- 010-add-admin-finance-entries.sql

CREATE TABLE IF NOT EXISTS admin_finance_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_type VARCHAR(10) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  amount DECIMAL(12, 3) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_method VARCHAR(80),
  reference VARCHAR(120),
  counterparty VARCHAR(160),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS entry_type VARCHAR(10);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT 'General';
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 3);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'OMR';
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reference VARCHAR(120);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS counterparty VARCHAR(160);
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

UPDATE admin_finance_entries SET metadata = '{}'::jsonb WHERE metadata IS NULL;
ALTER TABLE admin_finance_entries ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE admin_finance_entries ALTER COLUMN metadata SET NOT NULL;
ALTER TABLE admin_finance_entries ALTER COLUMN category SET DEFAULT 'General';
ALTER TABLE admin_finance_entries ALTER COLUMN currency SET DEFAULT 'OMR';

ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_entry_type_check;
ALTER TABLE admin_finance_entries
  ADD CONSTRAINT admin_finance_entries_entry_type_check
  CHECK (entry_type IN ('INCOME', 'EXPENSE'));

ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_amount_check;
ALTER TABLE admin_finance_entries
  ADD CONSTRAINT admin_finance_entries_amount_check
  CHECK (amount > 0);

CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_occurred_at ON admin_finance_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_entry_type ON admin_finance_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_category ON admin_finance_entries(category);
CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_created_by ON admin_finance_entries(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_is_archived ON admin_finance_entries(is_archived);
