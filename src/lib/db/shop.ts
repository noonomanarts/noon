import { pool } from './pool';
import type { ShopCategory, ShopProduct } from './types';

let shopCategoriesTableReady = false;
let shopProductsTableReady = false;

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
