-- Migration: Add withdrawal decision timestamps
-- Version: 003
-- Description: Adds approved_at and rejected_at timestamps for wallet withdrawal requests

ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing records (best-effort historical approximation)
UPDATE wallet_transactions
SET approved_at = COALESCE(approved_at, created_at)
WHERE status = 'APPROVED' AND approved_at IS NULL;

UPDATE wallet_transactions
SET rejected_at = COALESCE(rejected_at, created_at)
WHERE status = 'REJECTED' AND rejected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_approved_at ON wallet_transactions(approved_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_rejected_at ON wallet_transactions(rejected_at);