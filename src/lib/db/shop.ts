import { pool } from './pool';
import type { ShopCategory } from './types';

let shopCategoriesTableReady = false;

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
