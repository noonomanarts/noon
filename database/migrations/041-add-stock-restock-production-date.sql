-- Migration 041: Add production_date to stock_restocks
-- The worker panel already captures expiry_date; production_date is the
-- complementary optional field entered at the time of restocking.

ALTER TABLE stock_restocks
  ADD COLUMN IF NOT EXISTS production_date DATE;
