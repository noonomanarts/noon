-- 018-add-workshop-profit-and-material-reasons.sql

INSERT INTO admin_finance_reasons (entry_type, name, description, sort_order, is_active, is_system)
VALUES
  ('INCOME', 'Net Profit', 'Net workshop profit retained by Noon', 15, TRUE, TRUE),
  ('EXPENSE', 'Workshop Materials', 'Inventory materials consumed by workshop execution', 35, TRUE, TRUE)
ON CONFLICT (entry_type, name) DO NOTHING;
