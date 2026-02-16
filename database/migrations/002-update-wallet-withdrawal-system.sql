-- Migration: Update wallet tables for withdrawal system
-- Version: 002
-- Description: Adds available_balance to wallets and status to wallet_transactions for withdrawal requests

-- Add available_balance column to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance DECIMAL(10, 3) NOT NULL DEFAULT 0;

-- Add status column to wallet_transactions table
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'COMPLETED';

-- Update existing wallets to set available_balance equal to balance initially
UPDATE wallets SET available_balance = balance WHERE available_balance = 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id_status ON wallet_transactions(wallet_id, status);