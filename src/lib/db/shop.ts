import { pool } from './pool';
import type { ShopCategory, ShopOrder, ShopOrderItem, ShopOrderStatusHistory, ShopProduct, ShopOrderStatus } from './types';

let shopCategoriesTableReady = false;
let shopProductsTableReady = false;
let shopOrdersTablesReady = false;

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureShopCategoriesTable(): Promise<void> {
  if (shopCategoriesTableReady) return;

  await pool.query(`
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
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_categories_active_sort ON shop_categories(is_active, sort_order, created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_categories_slug ON shop_categories(slug)`);

  await pool.query(`
    INSERT INTO shop_categories (slug, name_en, name_ar, description_en, description_ar, sort_order)
    VALUES
      ('sweets', 'Sweets', 'الحلويات', 'Delightful desserts and sweet selections from Butter and Butter.', 'تشكيلة حلويات مميزة من Butter and Butter.', 1),
      ('raw-materials', 'Raw Materials', 'المواد الخام', 'Core baking and cooking ingredients trusted in Noon classes.', 'مكونات أساسية للخبز والطبخ معتمدة في ورش نون.', 2)
    ON CONFLICT (slug) DO NOTHING
  `);

  shopCategoriesTableReady = true;
}

async function ensureShopProductsTable(): Promise<void> {
  if (shopProductsTableReady) return;

  await ensureShopCategoriesTable();

  await pool.query(`
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
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_products_category_sort ON shop_products(category_id, is_active, sort_order, created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_products_slug ON shop_products(slug)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_products_active_featured ON shop_products(is_active, is_featured)`);

  shopProductsTableReady = true;
}

async function ensureShopOrdersTables(): Promise<void> {
  if (shopOrdersTablesReady) return;

  await ensureShopProductsTable();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_number VARCHAR(30) UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
      city VARCHAR(80) NOT NULL,
      area VARCHAR(120) NOT NULL,
      street_address TEXT NOT NULL,
      postal_code VARCHAR(30),
      recipient_full_name VARCHAR(160) NOT NULL,
      recipient_phone VARCHAR(30) NOT NULL,
      notes TEXT,
      subtotal DECIMAL(10, 3) NOT NULL CHECK (subtotal >= 0),
      shipping_fee DECIMAL(10, 3) NOT NULL DEFAULT 2.000 CHECK (shipping_fee >= 0),
      total_amount DECIMAL(10, 3) NOT NULL CHECK (total_amount >= 0),
      currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
      payment_method VARCHAR(20) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET')),
      wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
      tracking_number VARCHAR(120),
      admin_notes TEXT,
      cancellation_reason TEXT,
      paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      shipped_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120)`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'shop_orders'
          AND c.conname = 'shop_orders_status_check'
          AND pg_get_constraintdef(c.oid) NOT LIKE '%PROCESSING%'
      ) THEN
        ALTER TABLE shop_orders DROP CONSTRAINT shop_orders_status_check;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'shop_orders'
          AND c.conname = 'shop_orders_status_check'
      ) THEN
        BEGIN
          ALTER TABLE shop_orders
          ADD CONSTRAINT shop_orders_status_check
          CHECK (status IN ('PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
        EXCEPTION
          WHEN duplicate_object THEN
            NULL;
        END;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price DECIMAL(10, 3) NOT NULL CHECK (unit_price >= 0),
      line_total DECIMAL(10, 3) NOT NULL CHECK (line_total >= 0),
      product_name_en VARCHAR(255) NOT NULL,
      product_name_ar VARCHAR(255) NOT NULL,
      product_slug VARCHAR(255) NOT NULL,
      product_image TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_order_status_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
      previous_status VARCHAR(20),
      next_status VARCHAR(20) NOT NULL,
      changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      note TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_orders_order_number ON shop_orders(order_number)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON shop_order_items(order_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_order_status_history_order_id ON shop_order_status_history(order_id, created_at DESC)`);

  shopOrdersTablesReady = true;
}

function mapCategory(row: Record<string, unknown>): ShopCategory {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name_en: row.name_en as string,
    name_ar: row.name_ar as string,
    description_en: (row.description_en as string | null) ?? null,
    description_ar: (row.description_ar as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}

function mapProduct(row: Record<string, unknown>): ShopProduct {
  const gallery = row.gallery_images;
  return {
    id: row.id as string,
    category_id: row.category_id as string,
    slug: row.slug as string,
    name_en: row.name_en as string,
    name_ar: row.name_ar as string,
    description_en: (row.description_en as string | null) ?? null,
    description_ar: (row.description_ar as string | null) ?? null,
    price: Number(row.price ?? 0),
    currency: (row.currency as string) || 'OMR',
    sku: (row.sku as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    gallery_images: Array.isArray(gallery) ? (gallery as string[]) : [],
    stock_quantity: Number(row.stock_quantity ?? 0),
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    sort_order: Number(row.sort_order ?? 0),
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}

function mapShopOrder(row: Record<string, unknown>): ShopOrder {
  return {
    id: row.id as string,
    order_number: row.order_number as string,
    user_id: row.user_id as string,
    status: row.status as ShopOrderStatus,
    city: row.city as string,
    area: row.area as string,
    street_address: row.street_address as string,
    postal_code: (row.postal_code as string | null) ?? null,
    recipient_full_name: row.recipient_full_name as string,
    recipient_phone: row.recipient_phone as string,
    notes: (row.notes as string | null) ?? null,
    subtotal: Number(row.subtotal ?? 0),
    shipping_fee: Number(row.shipping_fee ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    currency: (row.currency as string) || 'OMR',
    payment_method: 'WALLET',
    wallet_transaction_id: (row.wallet_transaction_id as string | null) ?? null,
    tracking_number: (row.tracking_number as string | null) ?? null,
    admin_notes: (row.admin_notes as string | null) ?? null,
    cancellation_reason: (row.cancellation_reason as string | null) ?? null,
    paid_at: new Date(row.paid_at as string),
    shipped_at: row.shipped_at ? new Date(row.shipped_at as string) : null,
    delivered_at: row.delivered_at ? new Date(row.delivered_at as string) : null,
    cancelled_at: row.cancelled_at ? new Date(row.cancelled_at as string) : null,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}

function mapShopOrderItem(row: Record<string, unknown>): ShopOrderItem {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    product_id: row.product_id as string,
    quantity: Number(row.quantity ?? 0),
    unit_price: Number(row.unit_price ?? 0),
    line_total: Number(row.line_total ?? 0),
    product_name_en: row.product_name_en as string,
    product_name_ar: row.product_name_ar as string,
    product_slug: row.product_slug as string,
    product_image: (row.product_image as string | null) ?? null,
    created_at: new Date(row.created_at as string),
  };
}

function mapShopOrderStatusHistory(row: Record<string, unknown>): ShopOrderStatusHistory {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    previous_status: (row.previous_status as ShopOrderStatus | null) ?? null,
    next_status: row.next_status as ShopOrderStatus,
    changed_by_user_id: (row.changed_by_user_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    created_at: new Date(row.created_at as string),
  };
}

export async function listShopCategoriesForAdmin(options?: {
  includeInactive?: boolean;
  search?: string;
}): Promise<ShopCategory[]> {
  await ensureShopCategoriesTable();

  const includeInactive = options?.includeInactive ?? true;
  const search = options?.search?.trim() ?? '';
  const params: Array<string | boolean> = [];
  const where: string[] = [];

  if (!includeInactive) {
    params.push(true);
    where.push(`is_active = $${params.length}`);
  }

  if (search.length > 0) {
    params.push(`%${search}%`);
    const idx = params.length;
    where.push(`(
      name_en ILIKE $${idx}
      OR name_ar ILIKE $${idx}
      OR slug ILIKE $${idx}
    )`);
  }

  const query = `
    SELECT *
    FROM shop_categories
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY sort_order ASC, created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows.map((row) => mapCategory(row));
}

export async function listShopCategoriesForPublic(): Promise<ShopCategory[]> {
  await ensureShopCategoriesTable();

  const result = await pool.query(
    `SELECT *
     FROM shop_categories
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, created_at DESC`
  );

  return result.rows.map((row) => mapCategory(row));
}

export async function getShopCategoryById(id: string): Promise<ShopCategory | null> {
  await ensureShopCategoriesTable();

  const result = await pool.query('SELECT * FROM shop_categories WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function getShopCategoryBySlug(slug: string, includeInactive = false): Promise<ShopCategory | null> {
  await ensureShopCategoriesTable();

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const result = await pool.query(
    `SELECT *
     FROM shop_categories
     WHERE slug = $1 ${includeInactive ? '' : 'AND is_active = TRUE'}
     LIMIT 1`,
    [normalizedSlug]
  );

  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function createShopCategory(input: {
  slug?: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  image?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<ShopCategory> {
  await ensureShopCategoriesTable();

  const generatedSlug = normalizeSlug(input.slug?.trim() || input.nameEn);
  if (!generatedSlug) {
    throw new Error('Valid slug is required');
  }

  const result = await pool.query(
    `INSERT INTO shop_categories
      (slug, name_en, name_ar, description_en, description_ar, image, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      generatedSlug,
      input.nameEn.trim(),
      input.nameAr.trim(),
      input.descriptionEn?.trim() || null,
      input.descriptionAr?.trim() || null,
      input.image?.trim() || null,
      input.isActive ?? true,
      Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    ]
  );

  return mapCategory(result.rows[0]);
}

export async function updateShopCategory(
  id: string,
  input: {
    slug?: string;
    nameEn?: string;
    nameAr?: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    image?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }
): Promise<ShopCategory | null> {
  await ensureShopCategoriesTable();

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.slug !== undefined) {
    const normalized = normalizeSlug(input.slug);
    if (!normalized) throw new Error('Valid slug is required');
    updates.push(`slug = $${idx++}`);
    values.push(normalized);
  }
  if (input.nameEn !== undefined) {
    updates.push(`name_en = $${idx++}`);
    values.push(input.nameEn.trim());
  }
  if (input.nameAr !== undefined) {
    updates.push(`name_ar = $${idx++}`);
    values.push(input.nameAr.trim());
  }
  if (input.descriptionEn !== undefined) {
    updates.push(`description_en = $${idx++}`);
    values.push(input.descriptionEn?.trim() || null);
  }
  if (input.descriptionAr !== undefined) {
    updates.push(`description_ar = $${idx++}`);
    values.push(input.descriptionAr?.trim() || null);
  }
  if (input.image !== undefined) {
    updates.push(`image = $${idx++}`);
    values.push(input.image?.trim() || null);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(input.isActive);
  }
  if (input.sortOrder !== undefined) {
    updates.push(`sort_order = $${idx++}`);
    values.push(Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0);
  }

  if (updates.length === 0) {
    return getShopCategoryById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE shop_categories
     SET ${updates.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );

  if (!result.rows[0]) return null;
  return mapCategory(result.rows[0]);
}

export async function deleteShopCategory(id: string): Promise<boolean> {
  await ensureShopCategoriesTable();

  const result = await pool.query('DELETE FROM shop_categories WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listShopProductsForAdmin(options?: {
  includeInactive?: boolean;
  categoryId?: string;
  search?: string;
}): Promise<
  (ShopProduct & {
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  })[]
> {
  await ensureShopProductsTable();

  const includeInactive = options?.includeInactive ?? true;
  const search = options?.search?.trim() ?? '';
  const categoryId = options?.categoryId?.trim() ?? '';

  const params: Array<string | boolean> = [];
  const where: string[] = [];

  if (!includeInactive) {
    params.push(true);
    where.push(`p.is_active = $${params.length}`);
  }

  if (categoryId) {
    params.push(categoryId);
    where.push(`p.category_id = $${params.length}`);
  }

  if (search.length > 0) {
    params.push(`%${search}%`);
    const idx = params.length;
    where.push(`(
      p.name_en ILIKE $${idx}
      OR p.name_ar ILIKE $${idx}
      OR p.slug ILIKE $${idx}
      OR COALESCE(p.sku, '') ILIKE $${idx}
      OR c.name_en ILIKE $${idx}
      OR c.name_ar ILIKE $${idx}
    )`);
  }

  const result = await pool.query(
    `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug
     FROM shop_products p
     JOIN shop_categories c ON c.id = p.category_id
     ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.sort_order ASC, p.created_at DESC`,
    params
  );

  return result.rows.map((row) => ({
    ...mapProduct(row),
    category_name_en: row.category_name_en as string,
    category_name_ar: row.category_name_ar as string,
    category_slug: row.category_slug as string,
  }));
}

export async function getShopProductById(id: string): Promise<ShopProduct | null> {
  await ensureShopProductsTable();
  const result = await pool.query('SELECT * FROM shop_products WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] ? mapProduct(result.rows[0]) : null;
}

export async function createShopProduct(input: {
  categoryId: string;
  slug?: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  price: number;
  currency?: string;
  sku?: string | null;
  image?: string | null;
  galleryImages?: string[];
  stockQuantity?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
}): Promise<ShopProduct> {
  await ensureShopProductsTable();

  const category = await getShopCategoryById(input.categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  const generatedSlug = normalizeSlug(input.slug?.trim() || input.nameEn);
  if (!generatedSlug) {
    throw new Error('Valid slug is required');
  }

  const galleryImages = Array.isArray(input.galleryImages)
    ? input.galleryImages.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];

  const result = await pool.query(
    `INSERT INTO shop_products
      (category_id, slug, name_en, name_ar, description_en, description_ar, price, currency, sku, image, gallery_images,
       stock_quantity, is_active, is_featured, sort_order)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10, $11::jsonb, $12, $13, $14, $15)
     RETURNING *`,
    [
      input.categoryId,
      generatedSlug,
      input.nameEn.trim(),
      input.nameAr.trim(),
      input.descriptionEn?.trim() || null,
      input.descriptionAr?.trim() || null,
      Number(input.price),
      (input.currency || 'OMR').trim().toUpperCase(),
      input.sku?.trim() || '',
      input.image?.trim() || null,
      JSON.stringify(galleryImages),
      Number.isFinite(input.stockQuantity) ? Number(input.stockQuantity) : 0,
      input.isActive ?? true,
      input.isFeatured ?? false,
      Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    ]
  );

  return mapProduct(result.rows[0]);
}

export async function updateShopProduct(
  id: string,
  input: {
    categoryId?: string;
    slug?: string;
    nameEn?: string;
    nameAr?: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    price?: number;
    currency?: string;
    sku?: string | null;
    image?: string | null;
    galleryImages?: string[];
    stockQuantity?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
  }
): Promise<ShopProduct | null> {
  await ensureShopProductsTable();

  if (input.categoryId !== undefined) {
    const category = await getShopCategoryById(input.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.categoryId !== undefined) {
    updates.push(`category_id = $${idx++}`);
    values.push(input.categoryId);
  }
  if (input.slug !== undefined) {
    const normalized = normalizeSlug(input.slug);
    if (!normalized) throw new Error('Valid slug is required');
    updates.push(`slug = $${idx++}`);
    values.push(normalized);
  }
  if (input.nameEn !== undefined) {
    updates.push(`name_en = $${idx++}`);
    values.push(input.nameEn.trim());
  }
  if (input.nameAr !== undefined) {
    updates.push(`name_ar = $${idx++}`);
    values.push(input.nameAr.trim());
  }
  if (input.descriptionEn !== undefined) {
    updates.push(`description_en = $${idx++}`);
    values.push(input.descriptionEn?.trim() || null);
  }
  if (input.descriptionAr !== undefined) {
    updates.push(`description_ar = $${idx++}`);
    values.push(input.descriptionAr?.trim() || null);
  }
  if (input.price !== undefined) {
    updates.push(`price = $${idx++}`);
    values.push(Number(input.price));
  }
  if (input.currency !== undefined) {
    updates.push(`currency = $${idx++}`);
    values.push(input.currency.trim().toUpperCase());
  }
  if (input.sku !== undefined) {
    updates.push(`sku = NULLIF($${idx++}, '')`);
    values.push(input.sku?.trim() || '');
  }
  if (input.image !== undefined) {
    updates.push(`image = $${idx++}`);
    values.push(input.image?.trim() || null);
  }
  if (input.galleryImages !== undefined) {
    const galleryImages = input.galleryImages.filter((item) => typeof item === 'string' && item.trim().length > 0);
    updates.push(`gallery_images = $${idx++}::jsonb`);
    values.push(JSON.stringify(galleryImages));
  }
  if (input.stockQuantity !== undefined) {
    updates.push(`stock_quantity = $${idx++}`);
    values.push(Number.isFinite(input.stockQuantity) ? Number(input.stockQuantity) : 0);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(input.isActive);
  }
  if (input.isFeatured !== undefined) {
    updates.push(`is_featured = $${idx++}`);
    values.push(input.isFeatured);
  }
  if (input.sortOrder !== undefined) {
    updates.push(`sort_order = $${idx++}`);
    values.push(Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0);
  }

  if (updates.length === 0) {
    return getShopProductById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE shop_products
     SET ${updates.join(', ')}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );

  if (!result.rows[0]) return null;
  return mapProduct(result.rows[0]);
}

export async function deleteShopProduct(id: string): Promise<boolean> {
  await ensureShopProductsTable();
  const result = await pool.query('DELETE FROM shop_products WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listShopProductsForPublic(options?: {
  categorySlug?: string;
  featuredOnly?: boolean;
  limit?: number;
}): Promise<
  (ShopProduct & {
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  })[]
> {
  await ensureShopProductsTable();

  const params: Array<string | boolean | number> = [true, true];
  const where: string[] = ['p.is_active = $1', 'c.is_active = $2'];

  if (options?.categorySlug?.trim()) {
    params.push(normalizeSlug(options.categorySlug));
    where.push(`c.slug = $${params.length}`);
  }

  if (options?.featuredOnly) {
    params.push(true);
    where.push(`p.is_featured = $${params.length}`);
  }

  const limit = Number.isFinite(options?.limit) ? Math.min(100, Math.max(1, Number(options?.limit))) : null;
  const limitClause = limit ? `LIMIT $${params.length + 1}` : '';
  if (limit) {
    params.push(limit);
  }

  const result = await pool.query(
    `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug
     FROM shop_products p
     JOIN shop_categories c ON c.id = p.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC
     ${limitClause}`,
    params
  );

  return result.rows.map((row) => ({
    ...mapProduct(row),
    category_name_en: row.category_name_en as string,
    category_name_ar: row.category_name_ar as string,
    category_slug: row.category_slug as string,
  }));
}

export async function getShopProductBySlugForPublic(slug: string): Promise<
  (ShopProduct & {
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  }) | null
> {
  await ensureShopProductsTable();

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const result = await pool.query(
    `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug
     FROM shop_products p
     JOIN shop_categories c ON c.id = p.category_id
     WHERE p.slug = $1
       AND p.is_active = TRUE
       AND c.is_active = TRUE
     LIMIT 1`,
    [normalizedSlug]
  );

  if (!result.rows[0]) return null;

  return {
    ...mapProduct(result.rows[0]),
    category_name_en: result.rows[0].category_name_en as string,
    category_name_ar: result.rows[0].category_name_ar as string,
    category_slug: result.rows[0].category_slug as string,
  };
}

export async function listRelatedShopProductsForPublic(options: {
  categoryId: string;
  excludeProductId: string;
  limit?: number;
}): Promise<
  (ShopProduct & {
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  })[]
> {
  await ensureShopProductsTable();

  const limit = Number.isFinite(options.limit) ? Math.min(12, Math.max(1, Number(options.limit))) : 4;

  const result = await pool.query(
    `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug
     FROM shop_products p
     JOIN shop_categories c ON c.id = p.category_id
     WHERE p.category_id = $1
       AND p.id <> $2
       AND p.is_active = TRUE
       AND c.is_active = TRUE
     ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC
     LIMIT $3`,
    [options.categoryId, options.excludeProductId, limit]
  );

  return result.rows.map((row) => ({
    ...mapProduct(row),
    category_name_en: row.category_name_en as string,
    category_name_ar: row.category_name_ar as string,
    category_slug: row.category_slug as string,
  }));
}

export async function getShopProductsByIdsForPublic(ids: string[]): Promise<
  (ShopProduct & {
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  })[]
> {
  await ensureShopProductsTable();

  const cleanedIds = ids.map((id) => id.trim()).filter((id) => id.length > 0);
  if (cleanedIds.length === 0) return [];

  const result = await pool.query(
    `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug
     FROM shop_products p
     JOIN shop_categories c ON c.id = p.category_id
     WHERE p.id = ANY($1::uuid[])
       AND p.is_active = TRUE
       AND c.is_active = TRUE`,
    [cleanedIds]
  );

  return result.rows.map((row) => ({
    ...mapProduct(row),
    category_name_en: row.category_name_en as string,
    category_name_ar: row.category_name_ar as string,
    category_slug: row.category_slug as string,
  }));
}

export async function listShopOrdersForAdmin(options?: {
  status?: ShopOrderStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  orders: (ShopOrder & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
    items: ShopOrderItem[];
    history: ShopOrderStatusHistory[];
    total_count: number;
  })[];
  total: number;
}> {
  await ensureShopOrdersTables();

  const status = options?.status ?? 'ALL';
  const search = options?.search?.trim() ?? '';
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ['1=1'];
  const params: Array<string | number> = [];

  if (status !== 'ALL') {
    params.push(status);
    whereClauses.push(`o.status = $${params.length}`);
  }

  if (search.length > 0) {
    params.push(`%${search}%`);
    const idx = params.length;
    whereClauses.push(`(
      o.order_number ILIKE $${idx}
      OR u.full_name ILIKE $${idx}
      OR u.email ILIKE $${idx}
      OR u.phone_number ILIKE $${idx}
      OR o.recipient_full_name ILIKE $${idx}
      OR o.recipient_phone ILIKE $${idx}
      OR o.city ILIKE $${idx}
      OR o.area ILIKE $${idx}
    )`);
  }

  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const result = await pool.query(
    `SELECT o.*, u.full_name AS user_full_name, u.email AS user_email,
            u.phone_number AS user_phone_number, u.profile_image AS user_profile_image,
            COUNT(*) OVER()::int AS total_count
     FROM shop_orders o
     JOIN users u ON u.id = o.user_id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY o.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params
  );

  const orderIds = result.rows.map((row) => row.id as string);

  let itemsByOrderId = new Map<string, ShopOrderItem[]>();
  if (orderIds.length > 0) {
    const itemsResult = await pool.query(
      `SELECT *
       FROM shop_order_items
       WHERE order_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [orderIds]
    );

    itemsByOrderId = itemsResult.rows.reduce((acc, row) => {
      const item = mapShopOrderItem(row);
      const current = acc.get(item.order_id) ?? [];
      current.push(item);
      acc.set(item.order_id, current);
      return acc;
    }, new Map<string, ShopOrderItem[]>());
  }

  let historyByOrderId = new Map<string, ShopOrderStatusHistory[]>();
  if (orderIds.length > 0) {
    const historyResult = await pool.query(
      `SELECT *
       FROM shop_order_status_history
       WHERE order_id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
      [orderIds]
    );

    historyByOrderId = historyResult.rows.reduce((acc, row) => {
      const history = mapShopOrderStatusHistory(row);
      const current = acc.get(history.order_id) ?? [];
      current.push(history);
      acc.set(history.order_id, current);
      return acc;
    }, new Map<string, ShopOrderStatusHistory[]>());
  }

  const orders = result.rows.map((row) => ({
    ...mapShopOrder(row),
    user_full_name: row.user_full_name as string,
    user_email: row.user_email as string,
    user_phone_number: row.user_phone_number as string,
    user_profile_image: (row.user_profile_image as string | null) ?? null,
    items: itemsByOrderId.get(row.id as string) ?? [],
    history: historyByOrderId.get(row.id as string) ?? [],
    total_count: Number(row.total_count ?? 0),
  }));

  return {
    orders,
    total: orders[0]?.total_count ?? 0,
  };
}

export async function getShopOrdersAnalyticsSummary(): Promise<{
  totalOrders: number;
  productsRevenue: number;
  shippingRevenue: number;
  grossRevenue: number;
  monthRevenue: number;
  monthOrders: number;
  statusCounts: Record<ShopOrderStatus, number>;
}> {
  await ensureShopOrdersTables();

  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COALESCE(SUM(subtotal), 0)::numeric AS products_revenue,
       COALESCE(SUM(shipping_fee), 0)::numeric AS shipping_revenue,
       COALESCE(SUM(total_amount), 0)::numeric AS gross_revenue,
       COALESCE(SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::numeric AS month_revenue,
       COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS month_orders,
       COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_count,
       COUNT(*) FILTER (WHERE status = 'PROCESSING')::int AS processing_count,
       COUNT(*) FILTER (WHERE status = 'READY_TO_SHIP')::int AS ready_to_ship_count,
       COUNT(*) FILTER (WHERE status = 'SHIPPED')::int AS shipped_count,
       COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_count,
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_count
     FROM shop_orders`
  );

  const row = result.rows[0] ?? {};

  return {
    totalOrders: Number(row.total_orders ?? 0),
    productsRevenue: parseFloat(String(row.products_revenue ?? 0)),
    shippingRevenue: parseFloat(String(row.shipping_revenue ?? 0)),
    grossRevenue: parseFloat(String(row.gross_revenue ?? 0)),
    monthRevenue: parseFloat(String(row.month_revenue ?? 0)),
    monthOrders: Number(row.month_orders ?? 0),
    statusCounts: {
      PAID: Number(row.paid_count ?? 0),
      PROCESSING: Number(row.processing_count ?? 0),
      READY_TO_SHIP: Number(row.ready_to_ship_count ?? 0),
      SHIPPED: Number(row.shipped_count ?? 0),
      DELIVERED: Number(row.delivered_count ?? 0),
      CANCELLED: Number(row.cancelled_count ?? 0),
    },
  };
}

export async function listShopOrdersByUserId(userId: string): Promise<
  (ShopOrder & {
    items: ShopOrderItem[];
    history: ShopOrderStatusHistory[];
  })[]
> {
  await ensureShopOrdersTables();

  const ordersResult = await pool.query(
    `SELECT *
     FROM shop_orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  const orderIds = ordersResult.rows.map((row) => row.id as string);

  let itemsByOrderId = new Map<string, ShopOrderItem[]>();
  if (orderIds.length > 0) {
    const itemsResult = await pool.query(
      `SELECT *
       FROM shop_order_items
       WHERE order_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [orderIds]
    );

    itemsByOrderId = itemsResult.rows.reduce((acc, row) => {
      const item = mapShopOrderItem(row);
      const current = acc.get(item.order_id) ?? [];
      current.push(item);
      acc.set(item.order_id, current);
      return acc;
    }, new Map<string, ShopOrderItem[]>());
  }

  let historyByOrderId = new Map<string, ShopOrderStatusHistory[]>();
  if (orderIds.length > 0) {
    const historyResult = await pool.query(
      `SELECT *
       FROM shop_order_status_history
       WHERE order_id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
      [orderIds]
    );

    historyByOrderId = historyResult.rows.reduce((acc, row) => {
      const history = mapShopOrderStatusHistory(row);
      const current = acc.get(history.order_id) ?? [];
      current.push(history);
      acc.set(history.order_id, current);
      return acc;
    }, new Map<string, ShopOrderStatusHistory[]>());
  }

  return ordersResult.rows.map((row) => ({
    ...mapShopOrder(row),
    items: itemsByOrderId.get(row.id as string) ?? [],
    history: historyByOrderId.get(row.id as string) ?? [],
  }));
}

export async function getShopOrderForAdminById(orderId: string): Promise<
  (ShopOrder & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
    items: ShopOrderItem[];
    history: ShopOrderStatusHistory[];
  }) | null
> {
  await ensureShopOrdersTables();

  const orderResult = await pool.query(
    `SELECT o.*, u.full_name AS user_full_name, u.email AS user_email,
            u.phone_number AS user_phone_number, u.profile_image AS user_profile_image
     FROM shop_orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = $1
     LIMIT 1`,
    [orderId]
  );

  if (!orderResult.rows[0]) return null;

  const itemsResult = await pool.query(
    `SELECT *
     FROM shop_order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );

  const historyResult = await pool.query(
    `SELECT *
     FROM shop_order_status_history
     WHERE order_id = $1
     ORDER BY created_at DESC`,
    [orderId]
  );

  const row = orderResult.rows[0];

  return {
    ...mapShopOrder(row),
    user_full_name: row.user_full_name as string,
    user_email: row.user_email as string,
    user_phone_number: row.user_phone_number as string,
    user_profile_image: (row.user_profile_image as string | null) ?? null,
    items: itemsResult.rows.map((itemRow) => mapShopOrderItem(itemRow)),
    history: historyResult.rows.map((historyRow) => mapShopOrderStatusHistory(historyRow)),
  };
}

const SHOP_ORDER_ALLOWED_TRANSITIONS: Record<ShopOrderStatus, ShopOrderStatus[]> = {
  PAID: ['PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['READY_TO_SHIP', 'SHIPPED', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export async function updateShopOrderForAdmin(input: {
  orderId: string;
  changedByUserId: string;
  status?: ShopOrderStatus;
  trackingNumber?: string | null;
  adminNotes?: string | null;
  cancellationReason?: string | null;
}): Promise<
  (ShopOrder & {
    items: ShopOrderItem[];
    history: ShopOrderStatusHistory[];
  }) | null
> {
  await ensureShopOrdersTables();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT * FROM shop_orders WHERE id = $1 FOR UPDATE`,
      [input.orderId]
    );

    if (!currentResult.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentOrder = mapShopOrder(currentResult.rows[0]);
    const nextStatus = input.status ?? currentOrder.status;

    if (nextStatus !== currentOrder.status) {
      const allowedNext = SHOP_ORDER_ALLOWED_TRANSITIONS[currentOrder.status] ?? [];
      if (!allowedNext.includes(nextStatus)) {
        throw new Error(`Invalid status transition from ${currentOrder.status} to ${nextStatus}`);
      }
    }

    const nextTracking = input.trackingNumber !== undefined
      ? (input.trackingNumber?.trim() || null)
      : currentOrder.tracking_number;

    if (nextStatus === 'SHIPPED' && !nextTracking) {
      throw new Error('Tracking number is required for SHIPPED status');
    }

    const nextAdminNotes = input.adminNotes !== undefined
      ? (input.adminNotes?.trim() || null)
      : currentOrder.admin_notes;

    const nextCancellationReason = input.cancellationReason !== undefined
      ? (input.cancellationReason?.trim() || null)
      : currentOrder.cancellation_reason;

    if (nextStatus === 'CANCELLED' && !nextCancellationReason) {
      throw new Error('Cancellation reason is required for CANCELLED status');
    }

    await client.query(
      `UPDATE shop_orders
       SET status = $1::varchar,
           tracking_number = $2,
           admin_notes = $3,
           cancellation_reason = $4,
           shipped_at = CASE WHEN $1::varchar = 'SHIPPED'::varchar THEN COALESCE(shipped_at, NOW()) ELSE shipped_at END,
           delivered_at = CASE WHEN $1::varchar = 'DELIVERED'::varchar THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
           cancelled_at = CASE WHEN $1::varchar = 'CANCELLED'::varchar THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = $5`,
      [nextStatus, nextTracking, nextAdminNotes, nextCancellationReason, input.orderId]
    );

    if (nextStatus !== currentOrder.status || input.adminNotes !== undefined || input.trackingNumber !== undefined || input.cancellationReason !== undefined) {
      await client.query(
        `INSERT INTO shop_order_status_history
          (order_id, previous_status, next_status, changed_by_user_id, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          input.orderId,
          currentOrder.status,
          nextStatus,
          input.changedByUserId,
          nextAdminNotes,
        ]
      );
    }

    const updatedOrderResult = await client.query(
      `SELECT * FROM shop_orders WHERE id = $1 LIMIT 1`,
      [input.orderId]
    );

    const itemsResult = await client.query(
      `SELECT * FROM shop_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [input.orderId]
    );

    const historyResult = await client.query(
      `SELECT * FROM shop_order_status_history WHERE order_id = $1 ORDER BY created_at DESC`,
      [input.orderId]
    );

    await client.query('COMMIT');

    return {
      ...mapShopOrder(updatedOrderResult.rows[0]),
      items: itemsResult.rows.map((row) => mapShopOrderItem(row)),
      history: historyResult.rows.map((row) => mapShopOrderStatusHistory(row)),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
