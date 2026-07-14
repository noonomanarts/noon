-- Migration 050: normalize auto-generated birthday promo codes to 10% off.
-- Only touches unused percentage BDAY codes so already-redeemed discounts stay untouched.
UPDATE promo_codes
SET discount_value = 10,
    updated_at = NOW()
WHERE code LIKE 'BDAY-%'
  AND discount_type = 'PERCENTAGE'
  AND times_used = 0
  AND discount_value <> 10;
