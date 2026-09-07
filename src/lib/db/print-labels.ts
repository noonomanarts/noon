import { pool } from './index';
import type { ShopProduct } from './types';

export type ProductForPrintLabel = Pick<
  ShopProduct,
  'id' | 'name_en' | 'name_ar' | 'sku' | 'price' | 'currency' | 'stock_quantity' | 'image'
> & {
  latest_expiry_date: string | null;
  latest_production_date: string | null;
};

/**
 * Load products for barcode/price labels.
 *
 * PostgreSQL DATE values can be returned by the pg driver as JavaScript Date
 * objects. Passing those through the previous `${value}T00:00:00` conversion
 * produced Invalid Date values and the label UI rendered them as N/A.
 * Return date-only ISO strings from SQL so label dates are stable across server
 * serialization, browser locale and timezone handling.
 */
export async function getProductsForPrintLabels(): Promise<ProductForPrintLabel[]> {
  const result = await pool.query(
    `SELECT p.id,
            p.name_en,
            p.name_ar,
            p.sku,
            p.price,
            p.currency,
            p.stock_quantity,
            p.image,
            TO_CHAR(latest.expiry_date, 'YYYY-MM-DD') AS latest_expiry_date,
            TO_CHAR(latest.production_date, 'YYYY-MM-DD') AS latest_production_date
     FROM shop_products p
     LEFT JOIN LATERAL (
       SELECT sr.expiry_date, sr.production_date
       FROM stock_restocks sr
       WHERE sr.product_id = p.id
       ORDER BY sr.created_at DESC, sr.id DESC
       LIMIT 1
     ) latest ON TRUE
     WHERE p.is_active = TRUE
     ORDER BY p.name_en`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name_en: row.name_en,
    name_ar: row.name_ar,
    sku: row.sku,
    price: Number(row.price ?? 0),
    currency: row.currency || 'OMR',
    stock_quantity: Number(row.stock_quantity ?? 0),
    image: row.image,
    latest_expiry_date: row.latest_expiry_date ? String(row.latest_expiry_date) : null,
    latest_production_date: row.latest_production_date ? String(row.latest_production_date) : null,
  }));
}
