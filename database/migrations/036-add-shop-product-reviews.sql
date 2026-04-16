CREATE TABLE IF NOT EXISTS shop_product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT shop_product_reviews_product_user_unique UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_product_id
ON shop_product_reviews(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_user_id
ON shop_product_reviews(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_visible
ON shop_product_reviews(product_id, is_visible, created_at DESC);
