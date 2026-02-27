-- Migration: Add wallet and loyalty tables
-- Version: 001
-- Description: Adds wallet, wallet_transactions, and loyalty_cards tables for customer wallet functionality

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 3) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL,
  type VARCHAR(50) NOT NULL, -- DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT, REFUND, etc.
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Loyalty cards table
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  stamps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_cards_updated_at ON loyalty_cards;
CREATE TRIGGER update_loyalty_cards_updated_at
  BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create wallets for existing users
INSERT INTO wallets (user_id, balance, currency)
SELECT id, 0, 'OMR'
FROM users
WHERE id NOT IN (SELECT user_id FROM wallets);

-- Create loyalty cards for existing users
INSERT INTO loyalty_cards (user_id, points, stamps)
SELECT id, 0, 0
FROM users
WHERE id NOT IN (SELECT user_id FROM loyalty_cards);