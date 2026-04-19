import { pool } from './pool';
import { createShopSaleCostExpenseEntry, createShopSaleFinanceEntry } from './finance';
import type {
  ShopCategory,
  ShopOrder,
  ShopOrderFulfillmentType,
  ShopOrderItem,
  ShopOrderPaymentMethod,
  ShopOrderStatusHistory,
  ShopProduct,
  ShopOrderStatus,
  ShopProductReview,
} from './types';

let shopCategoriesTableReady: Promise<void> | null = null;
let shopProductsTableReady: Promise<void> | null = null;
let shopOrdersTablesReady: Promise<void> | null = null;

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
  if (shopCategoriesTableReady) return shopCategoriesTableReady;

  shopCategoriesTableReady = (async () => {
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
  })().catch((error) => {
    shopCategoriesTableReady = null;
    throw error;
  });

  return shopCategoriesTableReady;
}

async function ensureShopProductsTable(): Promise<void> {
  if (shopProductsTableReady) return shopProductsTableReady;

  shopProductsTableReady = (async () => {
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
        cost DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (cost >= 0),
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
    await pool.query(`ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await pool.query(`
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
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_product_id ON shop_product_reviews(product_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_user_id ON shop_product_reviews(user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shop_product_reviews_visible ON shop_product_reviews(product_id, is_visible, created_at DESC)`);
  })().catch((error) => {
    shopProductsTableReady = null;
    throw error;
  });

  return shopProductsTableReady;
}

async function ensureShopOrdersTables(): Promise<void> {
  if (shopOrdersTablesReady) return shopOrdersTablesReady;

  shopOrdersTablesReady = (async () => {
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
      delivery_latitude DOUBLE PRECISION,
      delivery_longitude DOUBLE PRECISION,
      postal_code VARCHAR(30),
      recipient_full_name VARCHAR(160) NOT NULL,
      recipient_phone VARCHAR(30) NOT NULL,
      notes TEXT,
      subtotal DECIMAL(10, 3) NOT NULL CHECK (subtotal >= 0),
      discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
      promo_code VARCHAR(50),
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
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`);

  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY'`);
  await pool.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE shop_orders ALTER COLUMN city DROP NOT NULL`);
  await pool.query(`ALTER TABLE shop_orders ALTER COLUMN area DROP NOT NULL`);
  await pool.query(`ALTER TABLE shop_orders ALTER COLUMN street_address DROP NOT NULL`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_fulfillment_type_check'
      ) THEN
        ALTER TABLE shop_orders
          ADD CONSTRAINT shop_orders_fulfillment_type_check
          CHECK (fulfillment_type IN ('DELIVERY', 'PICKUP'));
      END IF;
    END $$;
  `);

  await pool.query(`ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_payment_method_check`);
  await pool.query(`
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_payment_method_check
      CHECK (payment_method IN ('WALLET', 'BANK_TRANSFER', 'PAYMENT_LINK', 'CASH'))
  `);

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
  })().catch((error) => {
    shopOrdersTablesReady = null;
    throw error;
  });

  return shopOrdersTablesReady;
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
    cost: Number(row.cost ?? 0),
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
    city: (row.city as string | null) ?? null,
    area: (row.area as string | null) ?? null,
    street_address: (row.street_address as string | null) ?? null,
    delivery_latitude: row.delivery_latitude !== null && row.delivery_latitude !== undefined ? Number(row.delivery_latitude) : null,
    delivery_longitude: row.delivery_longitude !== null && row.delivery_longitude !== undefined ? Number(row.delivery_longitude) : null,
    postal_code: (row.postal_code as string | null) ?? null,
    recipient_full_name: row.recipient_full_name as string,
    recipient_phone: row.recipient_phone as string,
    notes: (row.notes as string | null) ?? null,
    subtotal: Number(row.subtotal ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    promo_code_id: (row.promo_code_id as string | null) ?? null,
    promo_code: (row.promo_code as string | null) ?? null,
    shipping_fee: Number(row.shipping_fee ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    currency: (row.currency as string) || 'OMR',
    payment_method: (row.payment_method as ShopOrderPaymentMethod | null) ?? 'WALLET',
    fulfillment_type: (row.fulfillment_type as ShopOrderFulfillmentType | null) ?? 'DELIVERY',
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

function mapProductReview(row: Record<string, unknown>): ShopProductReview & {
  user_full_name: string | null;
} {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    user_id: String(row.user_id),
    rating: Number(row.rating ?? 0),
    comment: row.comment ? String(row.comment) : null,
    is_verified: Boolean(row.is_verified),
    is_visible: Boolean(row.is_visible),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
    user_full_name: row.user_full_name ? String(row.user_full_name) : null,
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
  cost?: number;
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
      (category_id, slug, name_en, name_ar, description_en, description_ar, price, cost, currency, sku, image, gallery_images,
       stock_quantity, is_active, is_featured, sort_order)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11, $12::jsonb, $13, $14, $15, $16)
     RETURNING *`,
    [
      input.categoryId,
      generatedSlug,
      input.nameEn.trim(),
      input.nameAr.trim(),
      input.descriptionEn?.trim() || null,
      input.descriptionAr?.trim() || null,
      Number(input.price),
      Number.isFinite(input.cost) ? Number(input.cost) : 0,
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
    cost?: number;
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
  if (input.cost !== undefined) {
    updates.push(`cost = $${idx++}`);
    values.push(Number(input.cost));
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

export async function listShopProductReviewsForPublic(productId: string, limit = 20): Promise<
  Array<
    ShopProductReview & {
      user_full_name: string | null;
    }
  >
> {
  await ensureShopProductsTable();

  const normalizedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const result = await pool.query(
    `SELECT r.*, u.full_name AS user_full_name
     FROM shop_product_reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1
       AND r.is_visible = TRUE
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [productId, normalizedLimit]
  );

  return result.rows.map((row) => mapProductReview(row));
}

export async function getShopProductReviewSummary(productId: string): Promise<{
  averageRating: number | null;
  reviewsCount: number;
}> {
  await ensureShopProductsTable();

  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS reviews_count,
       ROUND(AVG(rating)::numeric, 2)::float8 AS average_rating
     FROM shop_product_reviews
     WHERE product_id = $1
       AND is_visible = TRUE`,
    [productId]
  );

  const row = result.rows[0];
  return {
    averageRating: row?.average_rating == null ? null : Number(row.average_rating),
    reviewsCount: Number(row?.reviews_count ?? 0),
  };
}

export async function getShopProductReviewForUser(productId: string, userId: string): Promise<(
  ShopProductReview & {
    user_full_name: string | null;
  }
) | null> {
  await ensureShopProductsTable();

  const result = await pool.query(
    `SELECT r.*, u.full_name AS user_full_name
     FROM shop_product_reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1
       AND r.user_id = $2
     LIMIT 1`,
    [productId, userId]
  );

  return result.rows[0] ? mapProductReview(result.rows[0]) : null;
}

export async function hasUserPurchasedShopProduct(userId: string, productId: string): Promise<boolean> {
  await ensureShopOrdersTables();

  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1
       FROM shop_orders o
       INNER JOIN shop_order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
         AND oi.product_id = $2
         AND o.status <> 'CANCELLED'
     ) AS has_purchased`,
    [userId, productId]
  );

  return Boolean(result.rows[0]?.has_purchased);
}

export async function createOrUpdateShopProductReview(input: {
  productId: string;
  userId: string;
  rating: number;
  comment?: string | null;
}): Promise<
  (ShopProductReview & { user_full_name: string | null }) & {
    summary: {
      averageRating: number | null;
      reviewsCount: number;
    };
  }
> {
  await ensureShopOrdersTables();

  const normalizedRating = Math.trunc(Number(input.rating));
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  const comment = typeof input.comment === 'string' ? input.comment.trim().slice(0, 1000) : '';

  const [product, hasPurchased] = await Promise.all([
    getShopProductById(input.productId),
    hasUserPurchasedShopProduct(input.userId, input.productId),
  ]);

  if (!product) {
    throw new Error('Product not found.');
  }

  if (!hasPurchased) {
    throw new Error('Only customers who ordered this product can leave a review.');
  }

  const result = await pool.query(
    `INSERT INTO shop_product_reviews (
       product_id, user_id, rating, comment, is_verified, is_visible, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, TRUE, TRUE, NOW(), NOW()
     )
     ON CONFLICT (product_id, user_id)
     DO UPDATE SET
       rating = EXCLUDED.rating,
       comment = EXCLUDED.comment,
       is_verified = TRUE,
       is_visible = TRUE,
       updated_at = NOW()
     RETURNING *`,
    [input.productId, input.userId, normalizedRating, comment || null]
  );

  const [review, summary, userResult] = await Promise.all([
    Promise.resolve(mapProductReview(result.rows[0])),
    getShopProductReviewSummary(input.productId),
    pool.query(`SELECT full_name FROM users WHERE id = $1 LIMIT 1`, [input.userId]),
  ]);

  return {
    ...review,
    user_full_name: userResult.rows[0]?.full_name ? String(userResult.rows[0].full_name) : null,
    summary,
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

export async function getShopOrderByIdForUser(userId: string, orderId: string): Promise<
  (ShopOrder & {
    items: ShopOrderItem[];
    history: ShopOrderStatusHistory[];
  }) | null
> {
  await ensureShopOrdersTables();

  const orderResult = await pool.query(
    `SELECT *
     FROM shop_orders
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [orderId, userId]
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

  return {
    ...mapShopOrder(orderResult.rows[0]),
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

function generateShopOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SO-${y}${m}${d}-${random}`;
}

export async function createAdminShopOrder(input: {
  createdByAdminId: string;
  userId: string;
  fulfillmentType: ShopOrderFulfillmentType;
  paymentMethod: Exclude<ShopOrderPaymentMethod, 'WALLET'>;
  items: Array<{ productId: string; quantity: number }>;
  shippingFee?: number;
  recipientFullName?: string;
  recipientPhone?: string;
  city?: string;
  area?: string;
  streetAddress?: string;
  postalCode?: string;
  notes?: string;
  adminNotes?: string;
}): Promise<ShopOrder & { items: ShopOrderItem[] }> {
  await ensureShopOrdersTables();

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one product is required');
  }

  if (input.fulfillmentType === 'DELIVERY') {
    if (!input.recipientFullName?.trim() || !input.recipientPhone?.trim()) {
      throw new Error('Recipient name and phone are required for delivery');
    }
    if (!input.streetAddress?.trim() || !input.area?.trim()) {
      throw new Error('Delivery address is required');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, full_name, phone_number FROM users WHERE id = $1 LIMIT 1`,
      [input.userId]
    );
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error('Customer not found');
    }
    const customer = userResult.rows[0] as {
      id: string;
      full_name: string | null;
      phone_number: string | null;
    };

    const productIds = input.items
      .map((item) => item.productId.trim())
      .filter((id) => id.length > 0);

    if (productIds.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('At least one product is required');
    }

    const productResult = await client.query(
      `SELECT p.id, p.slug, p.name_en, p.name_ar, p.image, p.price, p.cost, p.currency, p.stock_quantity, p.is_active,
              c.is_active AS category_is_active
       FROM shop_products p
       JOIN shop_categories c ON c.id = p.category_id
       WHERE p.id = ANY($1::uuid[])
       FOR UPDATE OF p`,
      [productIds]
    );

    const productMap = new Map<string, (typeof productResult.rows)[number]>();
    for (const row of productResult.rows) {
      productMap.set(row.id as string, row);
    }

    type OrderItemRow = {
      productId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      unitCost: number;
      totalCost: number;
      nameEn: string;
      nameAr: string;
      slug: string;
      image: string | null;
    };

    let subtotal = 0;
    const orderItems: OrderItemRow[] = [];
    let currency = 'OMR';

    for (const requested of input.items) {
      const product = productMap.get(requested.productId);
      if (!product) {
        await client.query('ROLLBACK');
        throw new Error('A selected product is no longer available');
      }
      if (!product.is_active || !product.category_is_active) {
        await client.query('ROLLBACK');
        throw new Error(`Product is inactive: ${String(product.name_en)}`);
      }

      const qty = Math.max(1, Math.trunc(Number(requested.quantity)));
      const stock = Number(product.stock_quantity);
      if (!Number.isFinite(stock) || stock < qty) {
        await client.query('ROLLBACK');
        throw new Error(`Insufficient stock for ${String(product.name_en)}`);
      }

      const unitPrice = Number(product.price);
      const unitCost = Number(product.cost ?? 0);
      const lineTotal = Number((unitPrice * qty).toFixed(3));
      subtotal += lineTotal;
      currency = String(product.currency || currency);

      orderItems.push({
        productId: product.id as string,
        quantity: qty,
        unitPrice,
        lineTotal,
        unitCost,
        totalCost: Number((unitCost * qty).toFixed(3)),
        nameEn: String(product.name_en),
        nameAr: String(product.name_ar),
        slug: String(product.slug),
        image: product.image ? String(product.image) : null,
      });
    }

    subtotal = Number(subtotal.toFixed(3));
    const shippingFee = Number(
      Math.max(0, Number.isFinite(input.shippingFee) ? Number(input.shippingFee) : 0).toFixed(3)
    );
    const totalAmount = Number((subtotal + shippingFee).toFixed(3));

    const orderNumber = generateShopOrderNumber();
    const recipientFullName = (input.recipientFullName?.trim() || customer.full_name || '').trim();
    const recipientPhone = (input.recipientPhone?.trim() || customer.phone_number || '').trim();

    const orderInsert = await client.query(
      `INSERT INTO shop_orders (
        order_number, user_id, status, city, area, street_address, postal_code,
        recipient_full_name, recipient_phone, notes,
        subtotal, discount_amount, shipping_fee, total_amount, currency,
        payment_method, fulfillment_type, admin_notes, created_by_admin_id, paid_at
      ) VALUES (
        $1, $2, 'PAID', $3, $4, $5, $6,
        $7, $8, $9,
        $10, 0, $11, $12, $13,
        $14, $15, $16, $17, NOW()
      ) RETURNING id, order_number`,
      [
        orderNumber,
        input.userId,
        input.fulfillmentType === 'DELIVERY' ? input.city?.trim() || 'Muscat' : null,
        input.fulfillmentType === 'DELIVERY' ? input.area?.trim() || null : null,
        input.fulfillmentType === 'DELIVERY' ? input.streetAddress?.trim() || null : null,
        input.fulfillmentType === 'DELIVERY' ? input.postalCode?.trim() || null : null,
        recipientFullName || 'Walk-in customer',
        recipientPhone || '-',
        input.notes?.trim() || null,
        subtotal,
        shippingFee,
        totalAmount,
        currency,
        input.paymentMethod,
        input.fulfillmentType,
        input.adminNotes?.trim() || null,
        input.createdByAdminId,
      ]
    );

    const orderId = orderInsert.rows[0].id as string;

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO shop_order_items (
          order_id, product_id, quantity, unit_price, line_total,
          product_name_en, product_name_ar, product_slug, product_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          item.nameEn,
          item.nameAr,
          item.slug,
          item.image,
        ]
      );

      await client.query(
        `UPDATE shop_products
         SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    await client.query(
      `INSERT INTO shop_order_status_history (order_id, previous_status, next_status, changed_by_user_id, note)
       VALUES ($1, NULL, 'PAID', $2, $3)`,
      [orderId, input.createdByAdminId, 'Order created manually by admin']
    );

    await createShopSaleFinanceEntry({
      db: client,
      orderNumber: String(orderInsert.rows[0].order_number),
      orderId,
      amount: totalAmount,
      currency,
      customerName: recipientFullName || customer.full_name,
    });

    await createShopSaleCostExpenseEntry({
      db: client,
      saleType: 'SHOP_ORDER',
      referenceId: orderId,
      referenceNumber: `Order #${String(orderInsert.rows[0].order_number)}`,
      totalCost: Number(orderItems.reduce((sum, item) => sum + item.totalCost, 0).toFixed(3)),
      currency,
      customerName: recipientFullName || customer.full_name,
    });

    await client.query('COMMIT');

    const fullOrderResult = await pool.query(
      `SELECT * FROM shop_orders WHERE id = $1 LIMIT 1`,
      [orderId]
    );
    const fullItemsResult = await pool.query(
      `SELECT * FROM shop_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId]
    );

    return {
      ...mapShopOrder(fullOrderResult.rows[0]),
      items: fullItemsResult.rows.map((row) => mapShopOrderItem(row)),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
