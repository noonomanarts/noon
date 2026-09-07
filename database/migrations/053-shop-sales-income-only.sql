-- Shop sales must create a finance income entry only.
-- Older application code may still attempt to insert an automatic product-cost
-- expense for the same sale. Keep that cost in the shop/inventory data, but do
-- not record it as a separate Finance expense.

-- Hide previously generated sale-cost rows without deleting their audit data.
UPDATE admin_finance_entries
SET is_archived = TRUE,
    updated_at = NOW()
WHERE is_archived = FALSE
  AND entry_type = 'EXPENSE'
  AND metadata ->> 'component' = 'PRODUCT_COST'
  AND metadata ->> 'source' IN ('SHOP_ORDER', 'IN_SHOP_SALE');

CREATE OR REPLACE FUNCTION prevent_shop_sale_cost_finance_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entry_type = 'EXPENSE'
     AND NEW.metadata ->> 'component' = 'PRODUCT_COST'
     AND NEW.metadata ->> 'source' IN ('SHOP_ORDER', 'IN_SHOP_SALE') THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_shop_sale_cost_finance_entry ON admin_finance_entries;

CREATE TRIGGER trg_prevent_shop_sale_cost_finance_entry
BEFORE INSERT ON admin_finance_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_shop_sale_cost_finance_entry();
