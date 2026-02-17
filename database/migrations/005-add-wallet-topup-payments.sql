-- Migration: Add wallet top-up payments table
-- Version: 005
-- Description: Stores gateway top-up payment attempts/results for admin payments reporting

CREATE TABLE IF NOT EXISTS wallet_topup_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(80) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  gateway VARCHAR(50) NOT NULL DEFAULT 'PENDING_GATEWAY',
  gateway_transaction_id VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
  payment_url TEXT,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_user_id ON wallet_topup_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_status ON wallet_topup_payments(status);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_created_at ON wallet_topup_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_reference ON wallet_topup_payments(reference);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_wallet_topup_payments_updated_at ON wallet_topup_payments;

    CREATE TRIGGER update_wallet_topup_payments_updated_at
      BEFORE UPDATE ON wallet_topup_payments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
