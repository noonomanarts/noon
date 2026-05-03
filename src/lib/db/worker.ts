/**
 * Worker Dashboard Database Functions
 */

import { pool } from './index';
import { createShopRestockExpenseEntry, createShopRevenueFinanceEntry, createShopSaleCostExpenseEntry } from './finance';
import type {
  WorkerPermissions,
  StockRestock,
  InShopSale,
  InShopSaleItem,
  InShopSalePaymentMethod,
  WorkerStats,
  ShopProduct,
} from './types';

let stockRestocksSchemaReady = false;

/**
 * Convert database numeric value to a proper JavaScript number
 */
function toMoney(value: unknown): number {
  if (value == null) return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function ensureStockRestocksSchema(): Promise<void> {
  if (stockRestocksSchemaReady) return;

  await pool.query(`ALTER TABLE stock_restocks ADD COLUMN IF NOT EXISTS expiry_date DATE`);
  await pool.query(`ALTER TABLE stock_restocks ADD COLUMN IF NOT EXISTS production_date DATE`);
  stockRestocksSchemaReady = true;
}

// ============================================================================
// Worker Permissions
// ============================================================================

export async function getWorkerPermissions(userId: string): Promise<WorkerPermissions | null> {
  const result = await pool.query(
    `SELECT * FROM worker_permissions WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    can_restock: row.can_restock,
    can_record_sales: row.can_record_sales,
    can_manage_orders: row.can_manage_orders,
    can_print_labels: row.can_print_labels,
    can_print_bills: row.can_print_bills,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export async function upsertWorkerPermissions(
  userId: string,
  permissions: Partial<Omit<WorkerPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<WorkerPermissions> {
  const result = await pool.query(
    `INSERT INTO worker_permissions (user_id, can_restock, can_record_sales, can_manage_orders, can_print_labels, can_print_bills)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id)
     DO UPDATE SET
       can_restock = COALESCE($2, worker_permissions.can_restock),
       can_record_sales = COALESCE($3, worker_permissions.can_record_sales),
       can_manage_orders = COALESCE($4, worker_permissions.can_manage_orders),
       can_print_labels = COALESCE($5, worker_permissions.can_print_labels),
       can_print_bills = COALESCE($6, worker_permissions.can_print_bills),
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      permissions.can_restock ?? false,
      permissions.can_record_sales ?? false,
      permissions.can_manage_orders ?? false,
      permissions.can_print_labels ?? false,
      permissions.can_print_bills ?? false,
    ]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    can_restock: row.can_restock,
    can_record_sales: row.can_record_sales,
    can_manage_orders: row.can_manage_orders,
    can_print_labels: row.can_print_labels,
    can_print_bills: row.can_print_bills,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

// ============================================================================
// Stock Restocks
// ============================================================================

export interface CreateRestockInput {
  productId: string;
  workerUserId: string;
  quantityAdded: number;
  expiryDate: string;
  productionDate?: string | null;
  notes?: string;
  notesAr?: string;
}

export async function createStockRestock(input: CreateRestockInput): Promise<StockRestock> {
  await ensureStockRestocksSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current stock
    const productResult = await client.query(
      `SELECT stock_quantity, cost, currency, name_en, name_ar FROM shop_products WHERE id = $1 FOR UPDATE`,
      [input.productId]
    );
    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const previousQuantity = Number(productResult.rows[0].stock_quantity);
    const unitCost = toMoney(productResult.rows[0].cost);
    if (unitCost <= 0) {
      throw new Error('Product cost must be set before restocking inventory');
    }

    const totalCost = toMoney(unitCost * input.quantityAdded);
    const currency = String(productResult.rows[0].currency || 'OMR');
    const productName = String(productResult.rows[0].name_en || productResult.rows[0].name_ar || 'Product');
    const newQuantity = previousQuantity + input.quantityAdded;
    const expiryDate = new Date(`${input.expiryDate}T00:00:00`);

    if (Number.isNaN(expiryDate.getTime())) {
      throw new Error('Invalid expiry date');
    }

    let productionDate: string | null = null;
    if (input.productionDate) {
      const parsed = new Date(`${input.productionDate}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid production date');
      }
      productionDate = input.productionDate;
    }

    // Update product stock
    await client.query(
      `UPDATE shop_products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2`,
      [newQuantity, input.productId]
    );

    // Record restock
    const restockResult = await client.query(
      `INSERT INTO stock_restocks (product_id, worker_user_id, quantity_added, previous_quantity, new_quantity, expiry_date, production_date, unit_cost, total_cost, supplier_name, notes, notes_ar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11)
       RETURNING *`,
      [
        input.productId,
        input.workerUserId,
        input.quantityAdded,
        previousQuantity,
        newQuantity,
        input.expiryDate,
        productionDate,
        unitCost,
        totalCost,
        input.notes ?? null,
        input.notesAr ?? null,
      ]
    );

    const restockRow = restockResult.rows[0];

    await createShopRestockExpenseEntry({
      db: client,
      restockId: String(restockRow.id),
      productId: input.productId,
      productName,
      quantityAdded: input.quantityAdded,
      totalCost,
      currency,
      workerName: null,
      notes: input.notes ?? null,
      occurredAt: new Date(restockRow.created_at),
    });

    await client.query('COMMIT');

    const row = restockRow;
    return {
      id: row.id,
      product_id: row.product_id,
      worker_user_id: row.worker_user_id,
      quantity_added: Number(row.quantity_added),
      previous_quantity: Number(row.previous_quantity),
      new_quantity: Number(row.new_quantity),
      expiry_date: row.expiry_date ? new Date(`${row.expiry_date}T00:00:00`) : null,
      production_date: row.production_date ? new Date(`${row.production_date}T00:00:00`) : null,
      unit_cost: row.unit_cost ? toMoney(row.unit_cost) : null,
      total_cost: row.total_cost ? toMoney(row.total_cost) : null,
      supplier_name: row.supplier_name,
      notes: row.notes,
      notes_ar: row.notes_ar,
      created_at: new Date(row.created_at),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getStockRestocks(options?: {
  productId?: string;
  workerUserId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ restocks: (StockRestock & { product_name_en: string; product_name_ar: string; worker_name: string })[]; total: number }> {
  await ensureStockRestocksSchema();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.productId) {
    conditions.push(`sr.product_id = $${idx++}`);
    params.push(options.productId);
  }
  if (options?.workerUserId) {
    conditions.push(`sr.worker_user_id = $${idx++}`);
    params.push(options.workerUserId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM stock_restocks sr ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const result = await pool.query(
    `SELECT sr.*, p.name_en AS product_name_en, p.name_ar AS product_name_ar, u.full_name AS worker_name
     FROM stock_restocks sr
     JOIN shop_products p ON sr.product_id = p.id
     JOIN users u ON sr.worker_user_id = u.id
     ${whereClause}
     ORDER BY sr.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    restocks: result.rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      worker_user_id: row.worker_user_id,
      quantity_added: Number(row.quantity_added),
      previous_quantity: Number(row.previous_quantity),
      new_quantity: Number(row.new_quantity),
      expiry_date: row.expiry_date ? new Date(`${row.expiry_date}T00:00:00`) : null,
      production_date: row.production_date ? new Date(`${row.production_date}T00:00:00`) : null,
      unit_cost: row.unit_cost ? toMoney(row.unit_cost) : null,
      total_cost: row.total_cost ? toMoney(row.total_cost) : null,
      supplier_name: row.supplier_name,
      notes: row.notes,
      notes_ar: row.notes_ar,
      created_at: new Date(row.created_at),
      product_name_en: row.product_name_en,
      product_name_ar: row.product_name_ar,
      worker_name: row.worker_name,
    })),
    total,
  };
}

// ============================================================================
// In-Shop Sales
// ============================================================================

export interface CreateInShopSaleInput {
  workerUserId: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: InShopSalePaymentMethod;
  notes?: string;
  notesAr?: string;
}

export async function createInShopSale(input: CreateInShopSaleInput): Promise<InShopSale & { items: InShopSaleItem[] }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get sale number
    const saleNumberResult = await client.query(`SELECT generate_sale_number() AS sale_number`);
    const saleNumber = saleNumberResult.rows[0].sale_number;

    // Get products and calculate totals
    const productIds = input.items.map((item) => item.productId);
    const productsResult = await client.query(
      `SELECT id, name_en, name_ar, sku, price, cost, stock_quantity FROM shop_products WHERE id = ANY($1) FOR UPDATE`,
      [productIds]
    );
    const products = new Map(productsResult.rows.map((p) => [p.id, p]));

    let subtotal = 0;
    let totalCost = 0;
    const saleItems: { productId: string; quantity: number; unitPrice: number; lineTotal: number; unitCost: number; totalCost: number; product: typeof productsResult.rows[0] }[] = [];

    for (const item of input.items) {
      const product = products.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (Number(product.stock_quantity) < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name_en}`);
      }

      const unitPrice = toMoney(product.price);
      const unitCost = toMoney(product.cost);
      const lineTotal = toMoney(unitPrice * item.quantity);
      const lineCost = toMoney(unitCost * item.quantity);
      subtotal += lineTotal;
      totalCost += lineCost;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        unitCost,
        totalCost: lineCost,
        product,
      });

      // Decrease stock
      await client.query(
        `UPDATE shop_products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.productId]
      );
    }

    const discountAmount = input.discountAmount ?? 0;
    const totalAmount = toMoney(subtotal - discountAmount);

    // Create sale
    const saleResult = await client.query(
      `INSERT INTO in_shop_sales (sale_number, worker_user_id, customer_name, customer_phone, subtotal, discount_amount, discount_reason, total_amount, payment_method, notes, notes_ar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        saleNumber,
        input.workerUserId,
        input.customerName ?? null,
        input.customerPhone ?? null,
        subtotal,
        discountAmount,
        input.discountReason ?? null,
        totalAmount,
        input.paymentMethod ?? 'CASH',
        input.notes ?? null,
        input.notesAr ?? null,
      ]
    );
    const sale = saleResult.rows[0];

    // Create sale items
    const insertedItems: InShopSaleItem[] = [];
    for (const item of saleItems) {
      const itemResult = await client.query(
        `INSERT INTO in_shop_sale_items (sale_id, product_id, quantity, unit_price, line_total, product_name_en, product_name_ar, product_sku)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          sale.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          item.product.name_en,
          item.product.name_ar,
          item.product.sku,
        ]
      );
      insertedItems.push({
        id: itemResult.rows[0].id,
        sale_id: itemResult.rows[0].sale_id,
        product_id: itemResult.rows[0].product_id,
        quantity: Number(itemResult.rows[0].quantity),
        unit_price: toMoney(itemResult.rows[0].unit_price),
        line_total: toMoney(itemResult.rows[0].line_total),
        product_name_en: itemResult.rows[0].product_name_en,
        product_name_ar: itemResult.rows[0].product_name_ar,
        product_sku: itemResult.rows[0].product_sku,
        created_at: new Date(itemResult.rows[0].created_at),
      });
    }

    await createShopRevenueFinanceEntry({
      db: client,
      saleType: 'IN_SHOP_SALE',
      referenceId: sale.id,
      referenceNumber: `Sale #${sale.sale_number}`,
      amount: totalAmount,
      currency: sale.currency,
      customerName: input.customerName ?? null,
      occurredAt: new Date(sale.created_at),
    });

    await createShopSaleCostExpenseEntry({
      db: client,
      saleType: 'IN_SHOP_SALE',
      referenceId: sale.id,
      referenceNumber: `Sale #${sale.sale_number}`,
      totalCost,
      currency: sale.currency,
      customerName: input.customerName ?? null,
      occurredAt: new Date(sale.created_at),
    });

    await client.query('COMMIT');

    return {
      id: sale.id,
      sale_number: sale.sale_number,
      worker_user_id: sale.worker_user_id,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      subtotal: toMoney(sale.subtotal),
      discount_amount: toMoney(sale.discount_amount),
      discount_reason: sale.discount_reason,
      total_amount: toMoney(sale.total_amount),
      currency: sale.currency,
      payment_method: sale.payment_method,
      notes: sale.notes,
      notes_ar: sale.notes_ar,
      voided_at: sale.voided_at ? new Date(sale.voided_at) : null,
      voided_by_user_id: sale.voided_by_user_id,
      void_reason: sale.void_reason,
      created_at: new Date(sale.created_at),
      items: insertedItems,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getInShopSales(options?: {
  workerUserId?: string;
  fromDate?: Date;
  toDate?: Date;
  includeVoided?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ sales: (InShopSale & { worker_name: string; items: InShopSaleItem[] })[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.workerUserId) {
    conditions.push(`s.worker_user_id = $${idx++}`);
    params.push(options.workerUserId);
  }
  if (options?.fromDate) {
    conditions.push(`s.created_at >= $${idx++}`);
    params.push(options.fromDate);
  }
  if (options?.toDate) {
    conditions.push(`s.created_at <= $${idx++}`);
    params.push(options.toDate);
  }
  if (!options?.includeVoided) {
    conditions.push(`s.voided_at IS NULL`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM in_shop_sales s ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const result = await pool.query(
    `SELECT s.*, u.full_name AS worker_name
     FROM in_shop_sales s
     JOIN users u ON s.worker_user_id = u.id
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  const sales: (InShopSale & { worker_name: string; items: InShopSaleItem[] })[] = [];

  for (const row of result.rows) {
    const itemsResult = await pool.query(
      `SELECT * FROM in_shop_sale_items WHERE sale_id = $1 ORDER BY created_at`,
      [row.id]
    );

    sales.push({
      id: row.id,
      sale_number: row.sale_number,
      worker_user_id: row.worker_user_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      subtotal: toMoney(row.subtotal),
      discount_amount: toMoney(row.discount_amount),
      discount_reason: row.discount_reason,
      total_amount: toMoney(row.total_amount),
      currency: row.currency,
      payment_method: row.payment_method,
      notes: row.notes,
      notes_ar: row.notes_ar,
      voided_at: row.voided_at ? new Date(row.voided_at) : null,
      voided_by_user_id: row.voided_by_user_id,
      void_reason: row.void_reason,
      created_at: new Date(row.created_at),
      worker_name: row.worker_name,
      items: itemsResult.rows.map((item) => ({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: toMoney(item.unit_price),
        line_total: toMoney(item.line_total),
        product_name_en: item.product_name_en,
        product_name_ar: item.product_name_ar,
        product_sku: item.product_sku,
        created_at: new Date(item.created_at),
      })),
    });
  }

  return { sales, total };
}

export async function getInShopSaleById(saleId: string): Promise<(InShopSale & { worker_name: string; items: InShopSaleItem[] }) | null> {
  const result = await pool.query(
    `SELECT s.*, u.full_name AS worker_name
     FROM in_shop_sales s
     JOIN users u ON s.worker_user_id = u.id
     WHERE s.id = $1`,
    [saleId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  const itemsResult = await pool.query(
    `SELECT * FROM in_shop_sale_items WHERE sale_id = $1 ORDER BY created_at`,
    [saleId]
  );

  return {
    id: row.id,
    sale_number: row.sale_number,
    worker_user_id: row.worker_user_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    subtotal: toMoney(row.subtotal),
    discount_amount: toMoney(row.discount_amount),
    discount_reason: row.discount_reason,
    total_amount: toMoney(row.total_amount),
    currency: row.currency,
    payment_method: row.payment_method,
    notes: row.notes,
    notes_ar: row.notes_ar,
    voided_at: row.voided_at ? new Date(row.voided_at) : null,
    voided_by_user_id: row.voided_by_user_id,
    void_reason: row.void_reason,
    created_at: new Date(row.created_at),
    worker_name: row.worker_name,
    items: itemsResult.rows.map((item) => ({
      id: item.id,
      sale_id: item.sale_id,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: toMoney(item.unit_price),
      line_total: toMoney(item.line_total),
      product_name_en: item.product_name_en,
      product_name_ar: item.product_name_ar,
      product_sku: item.product_sku,
      created_at: new Date(item.created_at),
    })),
  };
}

export async function voidInShopSale(saleId: string, voidedByUserId: string, reason?: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get sale items to restore stock
    const itemsResult = await client.query(
      `SELECT product_id, quantity FROM in_shop_sale_items WHERE sale_id = $1`,
      [saleId]
    );

    // Restore stock for each item
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE shop_products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Mark sale as voided
    await client.query(
      `UPDATE in_shop_sales SET voided_at = NOW(), voided_by_user_id = $1, void_reason = $2 WHERE id = $3`,
      [voidedByUserId, reason ?? null, saleId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Worker Stats
// ============================================================================

export async function getWorkerStats(userId: string): Promise<WorkerStats> {
  const result = await pool.query(
    `SELECT
       $1::uuid AS user_id,
       (SELECT COUNT(*) FROM stock_restocks WHERE worker_user_id = $1) AS total_restocks,
       (SELECT COUNT(*) FROM in_shop_sales WHERE worker_user_id = $1 AND voided_at IS NULL) AS total_sales,
       (SELECT COALESCE(SUM(total_amount), 0) FROM in_shop_sales WHERE worker_user_id = $1 AND voided_at IS NULL) AS total_sales_amount,
       (SELECT COUNT(*) FROM stock_restocks WHERE worker_user_id = $1 AND created_at >= CURRENT_DATE) AS restocks_today,
       (SELECT COUNT(*) FROM in_shop_sales WHERE worker_user_id = $1 AND voided_at IS NULL AND created_at >= CURRENT_DATE) AS sales_today`,
    [userId]
  );

  const row = result.rows[0];
  return {
    user_id: row.user_id,
    total_restocks: Number(row.total_restocks),
    total_sales: Number(row.total_sales),
    total_sales_amount: toMoney(row.total_sales_amount),
    restocks_today: Number(row.restocks_today),
    sales_today: Number(row.sales_today),
  };
}

// ============================================================================
// Products for Worker (simplified view)
// ============================================================================

export async function getProductsForWorker(): Promise<Pick<ShopProduct, 'id' | 'name_en' | 'name_ar' | 'sku' | 'price' | 'currency' | 'stock_quantity' | 'image'>[]> {
  const result = await pool.query(
    `SELECT id, name_en, name_ar, sku, price, currency, stock_quantity, image
     FROM shop_products
     WHERE is_active = TRUE
     ORDER BY name_en`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name_en: row.name_en,
    name_ar: row.name_ar,
    sku: row.sku,
    price: toMoney(row.price),
    currency: row.currency,
    stock_quantity: Number(row.stock_quantity),
    image: row.image,
  }));
}

// ============================================================================
// Notification Helpers
// ============================================================================

export async function getUsersReceivingStockNotifications(): Promise<{ id: string; full_name: string; email: string }[]> {
  const result = await pool.query(
    `SELECT id, full_name, email FROM users WHERE receives_stock_notifications = TRUE AND status = 'ACTIVE'`
  );
  return result.rows;
}

/**
 * Get workers who have the can_manage_orders permission enabled
 */
export async function getWorkersWithOrdersPermission(): Promise<{ id: string; full_name: string; email: string }[]> {
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email
     FROM users u
     JOIN worker_permissions wp ON u.id = wp.user_id
     WHERE u.role = 'WORKER'
       AND u.status = 'ACTIVE'
       AND wp.can_manage_orders = TRUE`
  );
  return result.rows;
}
