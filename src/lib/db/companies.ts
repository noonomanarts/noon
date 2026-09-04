import { query, getClient } from './pool';
import { createAdminFinanceEntry } from './finance';

export type CompanyOrderStatus = 'OPEN' | 'CLOSED';
export type CompanyPaymentMethod = 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'PAYMENT_LINK';
export type CompanyCostType = 'DIRECT_BILL' | 'INVENTORY_CUT';

export type CompanyPackage = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  sortOrder: number;
};

export type CompanyCost = {
  id: string;
  title: string;
  costType: CompanyCostType;
  amount: number;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  quantity: number | null;
  notes: string | null;
};

export type CompanyAttachment = {
  id: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
};

export type CompanyOrder = {
  id: string;
  invoiceNumber: number;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  totalAmount: number;
  totalCost: number;
  profit: number;
  status: CompanyOrderStatus;
  isPaid: boolean;
  paymentMethod: CompanyPaymentMethod | null;
  paidAt: string | null;
  invoiceDate: string;
  notes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyOrderDetail = CompanyOrder & {
  packages: CompanyPackage[];
  costs: CompanyCost[];
  attachments: CompanyAttachment[];
};

function toMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function toInt(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? Math.trunc(value) : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function mapOrder(row: Record<string, unknown>): CompanyOrder {
  return {
    id: String(row.id),
    invoiceNumber: toInt(row.invoice_number),
    companyName: String(row.company_name),
    contactName: row.contact_name ? String(row.contact_name) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    currency: String(row.currency || 'OMR'),
    totalAmount: toMoney(row.total_amount),
    totalCost: toMoney(row.total_cost),
    profit: toMoney(row.profit),
    status: String(row.status) as CompanyOrderStatus,
    isPaid: row.is_paid === true,
    paymentMethod: row.payment_method ? (String(row.payment_method) as CompanyPaymentMethod) : null,
    paidAt: row.paid_at ? String(row.paid_at) : null,
    invoiceDate: String(row.invoice_date),
    notes: row.notes ? String(row.notes) : null,
    closedAt: row.closed_at ? String(row.closed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listCompanyOrders(): Promise<CompanyOrder[]> {
  const result = await query(
    `SELECT * FROM company_orders ORDER BY created_at DESC`
  );
  return result.rows.map(mapOrder);
}

export async function getCompanyOrder(id: string): Promise<CompanyOrderDetail | null> {
  const orderResult = await query(`SELECT * FROM company_orders WHERE id = $1`, [id]);
  const orderRow = orderResult.rows[0];
  if (!orderRow) return null;

  const [packages, costs, attachments] = await Promise.all([
    query(`SELECT * FROM company_order_packages WHERE order_id = $1 ORDER BY sort_order ASC, created_at ASC`, [id]),
    query(
      `SELECT c.*, i.name AS inventory_item_name
       FROM company_order_costs c
       LEFT JOIN inventory_items i ON i.id = c.inventory_item_id
       WHERE c.order_id = $1 ORDER BY c.created_at ASC`,
      [id]
    ),
    query(`SELECT * FROM company_order_attachments WHERE order_id = $1 ORDER BY created_at ASC`, [id]),
  ]);

  return {
    ...mapOrder(orderRow),
    packages: packages.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      quantity: toInt(r.quantity, 1),
      price: toMoney(r.price),
      sortOrder: toInt(r.sort_order),
    })),
    costs: costs.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      costType: String(r.cost_type) as CompanyCostType,
      amount: toMoney(r.amount),
      inventoryItemId: r.inventory_item_id ? String(r.inventory_item_id) : null,
      inventoryItemName: r.inventory_item_name ? String(r.inventory_item_name) : null,
      quantity: r.quantity == null ? null : toMoney(r.quantity),
      notes: r.notes ? String(r.notes) : null,
    })),
    attachments: attachments.rows.map((r) => ({
      id: String(r.id),
      fileUrl: String(r.file_url),
      fileName: String(r.file_name),
      createdAt: String(r.created_at),
    })),
  };
}

export type CompanyPackageInput = { name: string; description?: string | null; quantity?: number; price: number };

export async function createCompanyOrder(input: {
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  currency?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
  packages: CompanyPackageInput[];
  createdByUserId: string;
}): Promise<string> {
  const companyName = text(input.companyName, 200);
  if (!companyName) throw new Error('Company name is required.');

  const result = await query(
    `INSERT INTO company_orders (company_name, contact_name, email, phone, currency, invoice_date, notes, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8)
     RETURNING id`,
    [
      companyName,
      text(input.contactName, 200),
      text(input.email, 200),
      text(input.phone, 60),
      (text(input.currency, 10) ?? 'OMR').toUpperCase(),
      input.invoiceDate || null,
      text(input.notes, 4000),
      input.createdByUserId,
    ]
  );
  const orderId = String(result.rows[0].id);
  await replaceCompanyPackages(orderId, input.packages);
  return orderId;
}

export async function updateCompanyOrder(id: string, input: {
  companyName?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  invoiceDate?: string | null;
  notes?: string | null;
}): Promise<void> {
  await query(
    `UPDATE company_orders SET
       company_name = COALESCE($2, company_name),
       contact_name = $3,
       email = $4,
       phone = $5,
       invoice_date = COALESCE($6::date, invoice_date),
       notes = $7,
       updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      text(input.companyName ?? null, 200),
      text(input.contactName ?? null, 200),
      text(input.email ?? null, 200),
      text(input.phone ?? null, 60),
      input.invoiceDate || null,
      text(input.notes ?? null, 4000),
    ]
  );
}

export async function replaceCompanyPackages(orderId: string, packages: CompanyPackageInput[]): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM company_order_packages WHERE order_id = $1`, [orderId]);
    let total = 0;
    for (let i = 0; i < packages.length; i += 1) {
      const pkg = packages[i];
      const name = text(pkg.name, 200);
      if (!name) continue;
      const qty = Math.max(1, toInt(pkg.quantity, 1));
      const price = Math.max(0, toMoney(pkg.price));
      total += qty * price;
      await client.query(
        `INSERT INTO company_order_packages (order_id, name, description, quantity, price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, name, text(pkg.description ?? null, 2000), qty, price, i]
      );
    }
    await client.query(`UPDATE company_orders SET total_amount = $2, updated_at = NOW() WHERE id = $1`, [orderId, toMoney(total)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addCompanyCost(orderId: string, input: {
  title: string;
  costType: CompanyCostType;
  amount?: number;
  inventoryItemId?: string | null;
  quantity?: number | null;
  notes?: string | null;
  createdByUserId: string;
}): Promise<void> {
  const title = text(input.title, 200);
  if (!title) throw new Error('Cost title is required.');
  const amount = Math.max(0, toMoney(input.amount));
  if (input.costType === 'INVENTORY_CUT' && amount <= 0) {
    throw new Error('Enter the amount to cut from inventory value.');
  }
  await query(
    `INSERT INTO company_order_costs (order_id, title, cost_type, amount, inventory_item_id, quantity, notes, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      orderId,
      title,
      input.costType,
      amount,
      input.costType === 'INVENTORY_CUT' ? input.inventoryItemId || null : null,
      input.costType === 'INVENTORY_CUT' ? (input.quantity == null ? null : toMoney(input.quantity)) : null,
      text(input.notes ?? null, 2000),
      input.createdByUserId,
    ]
  );
}

export async function deleteCompanyCost(orderId: string, costId: string): Promise<void> {
  await query(`DELETE FROM company_order_costs WHERE id = $1 AND order_id = $2`, [costId, orderId]);
}

export async function addCompanyAttachment(orderId: string, fileUrl: string, fileName: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO company_order_attachments (order_id, file_url, file_name, created_by_user_id) VALUES ($1, $2, $3, $4)`,
    [orderId, fileUrl, fileName.slice(0, 200), userId]
  );
}

export async function deleteCompanyAttachment(orderId: string, attachmentId: string): Promise<void> {
  await query(`DELETE FROM company_order_attachments WHERE id = $1 AND order_id = $2`, [attachmentId, orderId]);
}

export async function markCompanyOrderPaid(orderId: string, method: CompanyPaymentMethod): Promise<void> {
  await query(
    `UPDATE company_orders SET is_paid = TRUE, payment_method = $2, paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [orderId, method]
  );
}

export async function deleteCompanyOrder(id: string): Promise<void> {
  await query(`DELETE FROM company_orders WHERE id = $1`, [id]);
}

/**
 * Closes a company order: deducts inventory for INVENTORY_CUT costs, posts each
 * cost to admin expenses, posts the remaining amount (revenue - costs) as income,
 * and marks the order CLOSED.
 */
export async function closeCompanyOrder(orderId: string, adminUserId: string): Promise<void> {
  const detail = await getCompanyOrder(orderId);
  if (!detail) throw new Error('Company order not found.');
  if (detail.status === 'CLOSED') throw new Error('This order is already closed.');

  const client = await getClient();
  let totalCost = 0;
  const postedCostAmounts = new Map<string, number>();
  try {
    await client.query('BEGIN');

    for (const cost of detail.costs) {
      if (cost.costType === 'INVENTORY_CUT' && cost.inventoryItemId) {
        const itemResult = await client.query(
          `SELECT current_stock, average_unit_cost, allows_manual_cost, name FROM inventory_items WHERE id = $1 FOR UPDATE`,
          [cost.inventoryItemId]
        );
        const itemRow = itemResult.rows[0];
        if (!itemRow) throw new Error('Inventory item not found.');
        const stock = toMoney(itemRow.current_stock);
        const unitCost = toMoney(itemRow.average_unit_cost);
        const requestedAmount = cost.amount > 0
          ? cost.amount
          : toMoney((cost.quantity ?? 0) * unitCost);
        if (requestedAmount <= 0) {
          throw new Error(`Enter an amount for inventory cost "${String(itemRow.name)}".`);
        }
        if (unitCost <= 0) {
          throw new Error(`Inventory item "${String(itemRow.name)}" has no average cost.`);
        }
        const requiredQuantity = toMoney(requestedAmount / unitCost);
        if (stock < requiredQuantity) {
          throw new Error(`Insufficient stock for "${String(itemRow.name)}". Available value: ${(stock * unitCost).toFixed(3)}, required: ${requestedAmount.toFixed(3)}.`);
        }
        const lineCost = requestedAmount;
        totalCost += lineCost;
        await client.query(
          `UPDATE inventory_items SET current_stock = current_stock - $1, total_consumed_cost = total_consumed_cost + $2, updated_by_user_id = $3, updated_at = NOW() WHERE id = $4`,
          [requiredQuantity, lineCost, adminUserId, cost.inventoryItemId]
        );
        await client.query(
          `INSERT INTO inventory_movements (inventory_item_id, movement_type, direction, quantity, unit_cost, total_cost, reference_type, reference_id, company_order_id, notes, occurred_at, created_by_user_id, created_at)
           VALUES ($1, 'ADJUSTMENT_OUT', 'OUT', $2, $3, $4, 'COMPANY_SETTLEMENT', $5, $5, $6, NOW(), $7, NOW())`,
          [cost.inventoryItemId, requiredQuantity, unitCost, lineCost, orderId, cost.notes || null, adminUserId]
        );
        postedCostAmounts.set(cost.id, lineCost);
      } else {
        totalCost += cost.amount;
        postedCostAmounts.set(cost.id, cost.amount);
      }
    }

    const profit = toMoney(detail.totalAmount - totalCost);
    await client.query(
      `UPDATE company_orders SET status = 'CLOSED', total_cost = $2, profit = $3, closed_at = NOW(), closed_by_user_id = $4, updated_at = NOW() WHERE id = $1`,
      [orderId, toMoney(totalCost), profit, adminUserId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const label = `Company project: ${detail.companyName} (#${detail.invoiceNumber})`;
  for (const cost of detail.costs) {
    const amount = postedCostAmounts.get(cost.id) ?? cost.amount;
    if (amount <= 0) continue;
    await createAdminFinanceEntry({
      type: 'EXPENSE',
      title: `${label} - ${cost.title}`,
      category: 'Supplies',
      amount,
      currency: detail.currency,
      counterparty: detail.companyName,
      notes: cost.costType === 'INVENTORY_CUT' ? 'Inventory deducted for company project.' : 'Direct bill for company project.',
      metadata: { source: 'COMPANY_SETTLEMENT', companyOrderId: orderId, component: cost.costType === 'INVENTORY_CUT' ? 'INVENTORY_COST' : 'DIRECT_BILL_COST' },
      createdByUserId: adminUserId,
    }).catch(() => undefined);
  }

  if (detail.totalAmount > 0) {
    await createAdminFinanceEntry({
      type: 'INCOME',
      title: `${label} - revenue`,
      category: 'Other Income',
      amount: detail.totalAmount,
      currency: detail.currency,
      counterparty: detail.companyName,
      notes: 'Gross revenue from company project.',
      metadata: { source: 'COMPANY_SETTLEMENT', companyOrderId: orderId, component: 'GROSS_REVENUE' },
      createdByUserId: adminUserId,
    }).catch(() => undefined);
  }
}
