-- Migration 048: multi-trainer, multi-category, venue, and manual trainer fees
-- 1) Classes: optional co-trainer, venue (kitchen/outside), multiple categories & sub-categories
ALTER TABLE classes ADD COLUMN IF NOT EXISTS co_trainer_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue VARCHAR(20) NOT NULL DEFAULT 'KITCHEN';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS sub_categories TEXT[] NOT NULL DEFAULT '{}';

-- Backfill category arrays from the existing single-value columns
UPDATE classes SET categories = ARRAY[category::text] WHERE COALESCE(array_length(categories, 1), 0) = 0;
UPDATE classes SET sub_categories = ARRAY[sub_category::text] WHERE COALESCE(array_length(sub_categories, 1), 0) = 0;

CREATE INDEX IF NOT EXISTS idx_classes_co_trainer_id ON classes(co_trainer_id);
CREATE INDEX IF NOT EXISTS idx_classes_categories ON classes USING GIN(categories);

-- 2) Calendar events: venue blocking flag (outside workshops stay visible but don't block the kitchen)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS blocks_venue BOOLEAN NOT NULL DEFAULT TRUE;

-- 3) Class settlements: manual per-trainer fee overrides and co-trainer payout tracking
ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS co_trainer_fee_amount DECIMAL(10, 3) NOT NULL DEFAULT 0;
ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS manual_trainer_fee_amount DECIMAL(10, 3);
ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS manual_co_trainer_fee_amount DECIMAL(10, 3);
ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS co_trainer_wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL;
