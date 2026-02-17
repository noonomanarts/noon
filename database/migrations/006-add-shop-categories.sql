-- Migration: Add shop categories table
-- Version: 006
-- Description: Adds managed categories for shop admin and public shop pages

CREATE TABLE IF NOT EXISTS shop_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name_en VARCHAR(180) NOT NULL,
  name_ar VARCHAR(180) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_categories_active_sort ON shop_categories(is_active, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_shop_categories_slug ON shop_categories(slug);

INSERT INTO shop_categories (slug, name_en, name_ar, description_en, description_ar, sort_order)
VALUES
  ('sweets', 'Sweets', 'الحلويات', 'Delightful desserts and sweet selections from Butter and Butter.', 'تشكيلة حلويات مميزة من Butter and Butter.', 1),
  ('raw-materials', 'Raw Materials', 'المواد الخام', 'Core baking and cooking ingredients trusted in Noon classes.', 'مكونات أساسية للخبز والطبخ معتمدة في ورش نون.', 2)
ON CONFLICT (slug) DO NOTHING;
