-- Migration: Add shop products table
-- Version: 007
-- Description: Adds products table linked to shop categories for admin product management

CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES shop_categories(id) ON DELETE RESTRICT,
  slug VARCHAR(160) NOT NULL UNIQUE,
  name_en VARCHAR(220) NOT NULL,
  name_ar VARCHAR(220) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  price DECIMAL(10, 3) NOT NULL CHECK (price >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  sku VARCHAR(120) UNIQUE,
  image TEXT,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_category_sort ON shop_products(category_id, is_active, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_shop_products_slug ON shop_products(slug);
CREATE INDEX IF NOT EXISTS idx_shop_products_active_featured ON shop_products(is_active, is_featured);
