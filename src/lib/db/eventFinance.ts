import { ensureAdminFinanceSchema } from '@/lib/db/finance';
import {
  ensureInventorySchema,
  listInventoryCatalog,
  type ClassInventoryUsageInput,
  type InventoryCatalogItem,
} from '@/lib/db/inventory';
import { pool, query } from '@/lib/db/pool';

type QueryResultRow = Record<string, unknown>;
type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount?: number | null }>;
};

type AdminFinanceEntryType = 'INCOME' | 'EXPENSE';

export type EventExpenseItemInput = {
  id?: string;
  title: string;
  amount: number;
  notes?: string | null;
};

export type EventExpenseItem = {
  id: string;
  title: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventInventoryUsageItem = {
  id: string;
  eventId: string;
  inventoryItemId: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  manualCostAmount: number | null;
  notes: string | null;
  status: 'PLANNED' | 'POSTED';
  postedAt: string | null;
  availableStock: number;
  averageUnitCost: number;
};

export type EventSettlementSnapshot = {
  eventId: string;
  bookingNumber: string;
  eventType: string;
  eventTitle: string;
  currency: string;
  paymentStatus: string;
  finance: {
    materialsCostAmount: number;
    totalCostsAmount: number;
    netProfitAmount: number;
  };
  summary: {
    grossRevenue: number;
    materialsCostAmount: number;
    totalCostsAmount: number;
    netProfitAmount: number;
  };
  expenses: EventExpenseItem[];
  inventoryUsageItems: EventInventoryUsageItem[];
  inventoryCatalog: InventoryCatalogItem[];
  settlement: {
    status: 'DRAFT' | 'CLOSED';
    notes: string | null;
    settledAt: string | null;
    settledByUserId: string | null;
  } | null;
  warnings: string[];
  canClose: boolean;
};

type EventFinanceRow = {
  id: string;
  bookingNumber: string;
  eventType: string;
  fullName: string;
  companyOrGroupName: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
};

let eventFinanceSchemaReady: Promise<void> | null = null;

function toMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function sanitizeExpenseItems(value: unknown): EventExpenseItemInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((row): EventExpenseItemInput | null => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const title = typeof item.title === 'string' ? item.title.trim().slice(0, 255) : '';
      const notes = typeof item.notes === 'string' ? item.notes.trim().slice(0, 2000) : '';
      const amount = toMoney(item.amount);

      if (!title || amount < 0) return null;

      return {
        id: typeof item.id === 'string' ? item.id : undefined,
        title,
        amount,
        notes: notes || null,
      };
    })
    .filter((item): item is EventExpenseItemInput => Boolean(item));
}

function sanitizeInventoryUsageItems(value: unknown): ClassInventoryUsageInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((row): ClassInventoryUsageInput | null => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const inventoryItemId = typeof item.inventoryItemId === 'string' ? item.inventoryItemId.trim() : '';
      const quantity = toMoney(item.quantity);
      const manualCostAmount = item.manualCostAmount == null ? 0 : toMoney(item.manualCostAmount);
      const notes = typeof item.notes === 'string' ? item.notes.trim().slice(0, 1000) : '';

      if (!inventoryItemId || (quantity <= 0 && manualCostAmount <= 0)) {
        return null;
      }

      return {
        inventoryItemId,
        quantity,
        manualCostAmount: manualCostAmount > 0 ? manualCostAmount : null,
        notes: notes || null,
      };
    })
    .filter((row): row is ClassInventoryUsageInput => Boolean(row));
}

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case 'COOKING_COMPETITION':
      return 'Cooking Competition';
    case 'PRIVATE_CLASS':
      return 'Private Class';
    case 'BIRTHDAY_PARTY':
      return 'Birthday Party';
    default:
      return 'Event';
  }
}

function buildEventFinanceTitle(row: EventFinanceRow): string {
  const context = row.companyOrGroupName?.trim() || row.fullName.trim() || row.bookingNumber;
  return `${getEventTypeLabel(row.eventType)} - ${context}`;
}

async function resolveAutoFinanceReason(params: {
  db: Queryable;
  type: AdminFinanceEntryType;
  preferredNames: string[];
}): Promise<{ reasonId: string | null; reasonName: string; category: string }> {
  const normalizedNames = params.preferredNames.map((name) => name.trim()).filter((name) => name.length > 0);

  if (normalizedNames.length > 0) {
    const preferredResult = await params.db.query(
      `SELECT id, name
       FROM admin_finance_reasons
       WHERE entry_type = $1
         AND is_archived = FALSE
         AND name = ANY($2::text[])
       ORDER BY CASE WHEN is_active THEN 0 ELSE 1 END,
                array_position($2::text[], name),
                sort_order ASC,
                name ASC
       LIMIT 1`,
      [params.type, normalizedNames]
    );

    const preferredRow = preferredResult.rows[0];
    if (preferredRow) {
      const reasonId = preferredRow.id ? String(preferredRow.id) : null;
      const reasonName = String(preferredRow.name);
      return { reasonId, reasonName, category: reasonName };
    }
  }

  const fallbackResult = await params.db.query(
    `SELECT id, name
     FROM admin_finance_reasons
     WHERE entry_type = $1
       AND is_archived = FALSE
     ORDER BY CASE WHEN is_active THEN 0 ELSE 1 END, sort_order ASC, name ASC
     LIMIT 1`,
    [params.type]
  );

  const fallbackRow = fallbackResult.rows[0];
  if (!fallbackRow) {
    return { reasonId: null, reasonName: 'General', category: 'General' };
  }

  const reasonName = String(fallbackRow.name || 'General');
  return {
    reasonId: fallbackRow.id ? String(fallbackRow.id) : null,
    reasonName,
    category: reasonName,
  };
}

async function insertAutoFinanceEntry(params: {
  db: Queryable;
  type: AdminFinanceEntryType;
  title: string;
  amount: number;
  currency: string;
  occurredAtIso: string;
  createdByUserId: string;
  reason: { reasonId: string | null; reasonName: string; category: string };
  counterparty?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (params.amount <= 0) return;

  await params.db.query(
    `INSERT INTO admin_finance_entries (
       entry_type,
       title,
       category,
       reason_id,
       reason_name,
       amount,
       currency,
       occurred_at,
       counterparty,
       notes,
       metadata,
       created_by_user_id,
       updated_by_user_id,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $12, NOW(), NOW()
     )`,
    [
      params.type,
      params.title,
      params.reason.category,
      params.reason.reasonId,
      params.reason.reasonName,
      params.amount,
      params.currency,
      params.occurredAtIso,
      params.counterparty || null,
      params.notes || null,
      params.metadata ?? {},
      params.createdByUserId,
    ]
  );
}

export async function ensureEventFinanceSchema(): Promise<void> {
  if (eventFinanceSchemaReady) {
    return eventFinanceSchemaReady;
  }

  eventFinanceSchemaReady = (async () => {
    await ensureInventorySchema();
    await ensureAdminFinanceSchema();

    await query(
      `CREATE TABLE IF NOT EXISTS event_expense_items (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
         title VARCHAR(255) NOT NULL,
         amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (amount >= 0),
         notes TEXT,
         created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
       )`
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_event_expense_items_event_booking_id ON event_expense_items(event_booking_id)`);

    await query(
      `CREATE TABLE IF NOT EXISTS event_settlements (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         event_booking_id UUID NOT NULL UNIQUE REFERENCES event_bookings(id) ON DELETE CASCADE,
         status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CLOSED')),
         gross_revenue DECIMAL(10, 3) NOT NULL DEFAULT 0,
         materials_cost_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
         total_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
         net_profit_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
         notes TEXT,
         settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
         settled_at TIMESTAMP WITH TIME ZONE,
         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
       )`
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_event_settlements_event_booking_id ON event_settlements(event_booking_id)`);

    await query(`ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS event_booking_id UUID REFERENCES event_bookings(id) ON DELETE SET NULL`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_event_booking_id ON inventory_movements(event_booking_id)`);

    await query(
      `CREATE TABLE IF NOT EXISTS event_inventory_usages (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
         inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
         quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
         unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
         total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
         manual_cost_amount DECIMAL(12, 3),
         notes TEXT,
         status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'POSTED')),
         posted_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL,
         posted_at TIMESTAMP WITH TIME ZONE,
         created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
       )`
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_event_booking_id ON event_inventory_usages(event_booking_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_item_id ON event_inventory_usages(inventory_item_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_status ON event_inventory_usages(status)`);
    await query(`ALTER TABLE event_inventory_usages ADD COLUMN IF NOT EXISTS manual_cost_amount DECIMAL(12, 3)`);
  })().catch((error) => {
    eventFinanceSchemaReady = null;
    throw error;
  });

  return eventFinanceSchemaReady;
}

async function getEventFinanceRow(eventId: string, db: Queryable): Promise<EventFinanceRow | null> {
  const result = await db.query(
    `SELECT id,
            booking_number,
            event_type,
            full_name,
            company_or_group_name,
            total_amount,
            currency,
            status,
            payment_status
     FROM event_bookings
     WHERE id = $1
     LIMIT 1`,
    [eventId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    bookingNumber: String(row.booking_number),
    eventType: String(row.event_type),
    fullName: String(row.full_name || ''),
    companyOrGroupName: row.company_or_group_name ? String(row.company_or_group_name) : null,
    totalAmount: toMoney(row.total_amount),
    currency: String(row.currency || 'OMR'),
    status: String(row.status || 'NEW'),
    paymentStatus: String(row.payment_status || 'PENDING'),
  };
}

async function getExpenseItems(eventId: string, db: Queryable): Promise<EventExpenseItem[]> {
  const result = await db.query(
    `SELECT id, title, amount, notes, created_at, updated_at
     FROM event_expense_items
     WHERE event_booking_id = $1
     ORDER BY created_at ASC`,
    [eventId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title || ''),
    amount: toMoney(row.amount),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

async function replaceExpenseItems(params: {
  db: Queryable;
  eventId: string;
  adminUserId: string;
  expenseItems: EventExpenseItemInput[];
}): Promise<void> {
  await params.db.query(`DELETE FROM event_expense_items WHERE event_booking_id = $1`, [params.eventId]);

  for (const expense of params.expenseItems) {
    if (expense.amount <= 0) continue;
    await params.db.query(
      `INSERT INTO event_expense_items (
         event_booking_id, title, amount, notes, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [params.eventId, expense.title, expense.amount, expense.notes || null, params.adminUserId]
    );
  }
}

async function getSettlementRow(eventId: string, db: Queryable): Promise<EventSettlementSnapshot['settlement']> {
  const result = await db.query(
    `SELECT status, notes, settled_at, settled_by_user_id
     FROM event_settlements
     WHERE event_booking_id = $1
     LIMIT 1`,
    [eventId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    status: String(row.status) === 'CLOSED' ? 'CLOSED' : 'DRAFT',
    notes: row.notes ? String(row.notes) : null,
    settledAt: row.settled_at ? String(row.settled_at) : null,
    settledByUserId: row.settled_by_user_id ? String(row.settled_by_user_id) : null,
  };
}

export async function listEventInventoryUsageItems(eventId: string, db: Queryable = { query }): Promise<EventInventoryUsageItem[]> {
  await ensureEventFinanceSchema();

  const result = await db.query(
    `SELECT u.id,
            u.event_booking_id,
            u.inventory_item_id,
            u.quantity,
            u.unit_cost,
            u.total_cost,
            u.manual_cost_amount,
            u.notes,
            u.status,
            u.posted_at,
            i.name AS item_name,
            i.unit AS item_unit,
            i.current_stock,
            i.average_unit_cost
     FROM event_inventory_usages u
     INNER JOIN inventory_items i ON i.id = u.inventory_item_id
     WHERE u.event_booking_id = $1
     ORDER BY u.created_at ASC`,
    [eventId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    eventId: String(row.event_booking_id),
    inventoryItemId: String(row.inventory_item_id),
    itemName: String(row.item_name),
    itemUnit: String(row.item_unit || 'unit'),
    quantity: toMoney(row.quantity),
    unitCost: toMoney(row.unit_cost),
    totalCost: toMoney(row.total_cost),
    manualCostAmount: row.manual_cost_amount == null ? null : toMoney(row.manual_cost_amount),
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status) === 'POSTED' ? 'POSTED' : 'PLANNED',
    postedAt: row.posted_at ? String(row.posted_at) : null,
    availableStock: toMoney(row.current_stock),
    averageUnitCost: toMoney(row.average_unit_cost),
  }));
}

export async function replaceEventInventoryUsagePlans(params: {
  db: Queryable;
  eventId: string;
  adminUserId: string;
  usageItems: ClassInventoryUsageInput[];
}): Promise<void> {
  await ensureEventFinanceSchema();

  await params.db.query(`DELETE FROM event_inventory_usages WHERE event_booking_id = $1 AND status = 'PLANNED'`, [params.eventId]);

  if (params.usageItems.length === 0) return;

  const itemIds = params.usageItems.map((item) => item.inventoryItemId);
  const itemsResult = await params.db.query(
    `SELECT id, average_unit_cost, current_stock, allows_manual_cost
     FROM inventory_items
     WHERE id = ANY($1::uuid[])
     FOR UPDATE`,
    [itemIds]
  );

  const itemsById = new Map<string, QueryResultRow>();
  for (const row of itemsResult.rows) {
    itemsById.set(String(row.id), row);
  }

  for (const item of params.usageItems) {
    const itemRow = itemsById.get(item.inventoryItemId);
    if (!itemRow) {
      throw new Error('One of the selected inventory items does not exist');
    }

    const averageUnitCost = toMoney(itemRow.average_unit_cost);
    const availableStock = toMoney(itemRow.current_stock);
    const allowsManualCost = Boolean(itemRow.allows_manual_cost);
    const requestedManualCost = item.manualCostAmount == null ? null : toMoney(item.manualCostAmount);
    let quantity = toMoney(item.quantity);
    let unitCost = averageUnitCost;
    let totalCost = toMoney(quantity * unitCost);

    if (requestedManualCost != null && requestedManualCost > 0) {
      if (!allowsManualCost) {
        throw new Error('Manual material cost is only allowed for inventory pool items.');
      }
      if (averageUnitCost <= 0) {
        throw new Error('Manual-cost inventory pool has no purchase history yet. Add stock purchases before using manual material amount.');
      }
      quantity = toMoney(requestedManualCost / averageUnitCost);
      if (quantity <= 0) {
        throw new Error('Manual material cost is too small for the selected inventory pool average cost.');
      }
      if (quantity > availableStock) {
        throw new Error('Insufficient stock in selected inventory pool for the requested manual material cost.');
      }
      unitCost = toMoney(requestedManualCost / quantity);
      totalCost = requestedManualCost;
    } else if (quantity <= 0) {
      throw new Error('Inventory usage quantity must be greater than zero.');
    }

    await params.db.query(
      `INSERT INTO event_inventory_usages (
         event_booking_id, inventory_item_id, quantity, unit_cost, total_cost, manual_cost_amount, notes,
         status, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PLANNED', $8, NOW(), NOW())`,
      [
        params.eventId,
        item.inventoryItemId,
        quantity,
        unitCost,
        totalCost,
        requestedManualCost,
        item.notes || null,
        params.adminUserId,
      ]
    );
  }
}

export async function finalizeEventInventoryUsagePlans(params: {
  db: Queryable;
  eventId: string;
  adminUserId: string;
}): Promise<void> {
  await ensureEventFinanceSchema();

  const usageResult = await params.db.query(
    `SELECT u.id,
            u.inventory_item_id,
            u.quantity,
            u.unit_cost,
            u.total_cost,
            u.manual_cost_amount,
            u.notes,
            i.name AS item_name,
            i.current_stock,
            i.average_unit_cost,
            i.allows_manual_cost
     FROM event_inventory_usages u
     INNER JOIN inventory_items i ON i.id = u.inventory_item_id
     WHERE u.event_booking_id = $1
       AND u.status = 'PLANNED'
     ORDER BY u.created_at ASC
     FOR UPDATE OF u, i`,
    [params.eventId]
  );

  for (const usageRow of usageResult.rows) {
    const usageId = String(usageRow.id);
    const inventoryItemId = String(usageRow.inventory_item_id);
    const quantity = toMoney(usageRow.quantity);
    const availableStock = toMoney(usageRow.current_stock);

    if (quantity <= 0) continue;

    if (availableStock < quantity) {
      const itemName = String(usageRow.item_name || 'Item');
      throw new Error(`Insufficient stock for \"${itemName}\". Available: ${availableStock.toFixed(3)}, required: ${quantity.toFixed(3)}.`);
    }

    const averageUnitCost = toMoney(usageRow.average_unit_cost);
    const allowsManualCost = Boolean(usageRow.allows_manual_cost);
    const manualCostAmount = usageRow.manual_cost_amount == null ? null : toMoney(usageRow.manual_cost_amount);
    const savedUnitCost = toMoney(usageRow.unit_cost);
    const savedTotalCost = toMoney(usageRow.total_cost);
    const unitCost = savedUnitCost > 0 ? savedUnitCost : averageUnitCost;
    const totalCost = allowsManualCost && manualCostAmount != null && manualCostAmount > 0
      ? manualCostAmount
      : (savedTotalCost > 0 ? savedTotalCost : toMoney(quantity * unitCost));
    const nextStock = toMoney(availableStock - quantity);

    await params.db.query(
      `UPDATE inventory_items
       SET current_stock = $1,
           total_consumed_cost = total_consumed_cost + $2,
           updated_by_user_id = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [nextStock, totalCost, params.adminUserId, inventoryItemId]
    );

    const movementResult = await params.db.query(
      `INSERT INTO inventory_movements (
         inventory_item_id, movement_type, direction, quantity, unit_cost, total_cost,
         reference_type, reference_id, class_id, event_booking_id, notes, occurred_at, created_by_user_id, created_at
       ) VALUES (
         $1, 'WORKSHOP_USAGE', 'OUT', $2, $3, $4,
         'EVENT_SETTLEMENT', $5, NULL, $5, $6, NOW(), $7, NOW()
       )
       RETURNING id`,
      [inventoryItemId, quantity, unitCost, totalCost, params.eventId, usageRow.notes || null, params.adminUserId]
    );

    await params.db.query(
      `UPDATE event_inventory_usages
       SET status = 'POSTED',
           unit_cost = $1,
           total_cost = $2,
           manual_cost_amount = $3,
           posted_movement_id = $4,
           posted_at = NOW(),
           updated_at = NOW()
       WHERE id = $5`,
      [
        unitCost,
        totalCost,
        manualCostAmount,
        movementResult.rows[0] ? String(movementResult.rows[0].id) : null,
        usageId,
      ]
    );
  }
}

function buildSettlementSnapshot(args: {
  financeRow: EventFinanceRow;
  expenses: EventExpenseItem[];
  inventoryUsageItems: EventInventoryUsageItem[];
  inventoryCatalog: InventoryCatalogItem[];
  settlement: EventSettlementSnapshot['settlement'];
}): EventSettlementSnapshot {
  const grossRevenue = args.financeRow.paymentStatus === 'PAID' ? args.financeRow.totalAmount : 0;
  const materialsCostAmount = toMoney(
    args.expenses.reduce((sum, item) => sum + item.amount, 0)
      + args.inventoryUsageItems.reduce((sum, item) => sum + item.totalCost, 0)
  );
  const totalCostsAmount = materialsCostAmount;
  const netProfitAmount = toMoney(grossRevenue - totalCostsAmount);
  const warnings: string[] = [];

  if (args.financeRow.paymentStatus !== 'PAID') {
    warnings.push('Mark the event as paid before closing settlement.');
  }
  if (grossRevenue <= 0) {
    warnings.push('No paid revenue is available for this event yet.');
  }
  if (netProfitAmount < 0) {
    warnings.push('Net profit is negative. Review material costs before closing this event.');
  }
  if (args.financeRow.status === 'COMPLETED') {
    warnings.push('This event has already been closed and settled.');
  }

  return {
    eventId: args.financeRow.id,
    bookingNumber: args.financeRow.bookingNumber,
    eventType: args.financeRow.eventType,
    eventTitle: buildEventFinanceTitle(args.financeRow),
    currency: args.financeRow.currency,
    paymentStatus: args.financeRow.paymentStatus,
    finance: {
      materialsCostAmount,
      totalCostsAmount,
      netProfitAmount,
    },
    summary: {
      grossRevenue,
      materialsCostAmount,
      totalCostsAmount,
      netProfitAmount,
    },
    expenses: args.expenses,
    inventoryUsageItems: args.inventoryUsageItems,
    inventoryCatalog: args.inventoryCatalog,
    settlement: args.settlement,
    warnings,
    canClose: args.financeRow.status !== 'COMPLETED' && args.financeRow.paymentStatus === 'PAID' && grossRevenue > 0 && netProfitAmount >= 0,
  };
}

async function upsertSettlementRow(params: {
  db: Queryable;
  eventId: string;
  adminUserId: string;
  snapshot: EventSettlementSnapshot;
  notes: string | null;
  status: 'DRAFT' | 'CLOSED';
}) {
  await params.db.query(
    `INSERT INTO event_settlements (
       event_booking_id,
       status,
       gross_revenue,
       materials_cost_amount,
       total_costs_amount,
       net_profit_amount,
       notes,
       settled_by_user_id,
       settled_at,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       CASE WHEN $2 = 'CLOSED' THEN NOW() ELSE NULL END,
       NOW(), NOW()
     )
     ON CONFLICT (event_booking_id) DO UPDATE SET
       status = EXCLUDED.status,
       gross_revenue = EXCLUDED.gross_revenue,
       materials_cost_amount = EXCLUDED.materials_cost_amount,
       total_costs_amount = EXCLUDED.total_costs_amount,
       net_profit_amount = EXCLUDED.net_profit_amount,
       notes = EXCLUDED.notes,
       settled_by_user_id = EXCLUDED.settled_by_user_id,
       settled_at = CASE WHEN EXCLUDED.status = 'CLOSED' THEN NOW() ELSE event_settlements.settled_at END,
       updated_at = NOW()`,
    [
      params.eventId,
      params.status,
      params.snapshot.summary.grossRevenue,
      params.snapshot.summary.materialsCostAmount,
      params.snapshot.summary.totalCostsAmount,
      params.snapshot.summary.netProfitAmount,
      params.notes,
      params.adminUserId,
    ]
  );
}

export async function getEventSettlementSnapshot(eventId: string): Promise<EventSettlementSnapshot | null> {
  await ensureEventFinanceSchema();

  const [financeRow, expenses, settlement, inventoryUsageItems, inventoryCatalog] = await Promise.all([
    getEventFinanceRow(eventId, { query }),
    getExpenseItems(eventId, { query }),
    getSettlementRow(eventId, { query }),
    listEventInventoryUsageItems(eventId, { query }),
    listInventoryCatalog({ query }),
  ]);

  if (!financeRow) return null;

  return buildSettlementSnapshot({
    financeRow,
    expenses,
    inventoryUsageItems,
    inventoryCatalog,
    settlement,
  });
}

export async function saveEventSettlementDraft(args: {
  eventId: string;
  adminUserId: string;
  expenseItems: unknown;
  inventoryUsageItems?: unknown;
  notes?: unknown;
}): Promise<EventSettlementSnapshot> {
  await ensureEventFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
  const inventoryUsageItems = sanitizeInventoryUsageItems(args.inventoryUsageItems);
  const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 4000) || null : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const financeRow = await getEventFinanceRow(args.eventId, client);
    if (!financeRow) {
      throw new Error('Event not found');
    }
    if (financeRow.status === 'COMPLETED') {
      throw new Error('Event has already been closed');
    }

    await replaceExpenseItems({ db: client, eventId: args.eventId, adminUserId: args.adminUserId, expenseItems });
    await replaceEventInventoryUsagePlans({ db: client, eventId: args.eventId, adminUserId: args.adminUserId, usageItems: inventoryUsageItems });

    const [expenses, savedInventoryUsageItems, inventoryCatalog] = await Promise.all([
      getExpenseItems(args.eventId, client),
      listEventInventoryUsageItems(args.eventId, client),
      listInventoryCatalog(client),
    ]);

    const snapshot = buildSettlementSnapshot({
      financeRow,
      expenses,
      inventoryUsageItems: savedInventoryUsageItems,
      inventoryCatalog,
      settlement: {
        status: 'DRAFT',
        notes,
        settledAt: null,
        settledByUserId: args.adminUserId,
      },
    });

    await upsertSettlementRow({
      db: client,
      eventId: args.eventId,
      adminUserId: args.adminUserId,
      snapshot,
      notes,
      status: 'DRAFT',
    });

    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeEventSettlement(args: {
  eventId: string;
  adminUserId: string;
  expenseItems: unknown;
  inventoryUsageItems?: unknown;
  notes?: unknown;
}): Promise<EventSettlementSnapshot> {
  await ensureEventFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
  const inventoryUsageItems = sanitizeInventoryUsageItems(args.inventoryUsageItems);
  const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 4000) || null : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockResult = await client.query(`SELECT id FROM event_bookings WHERE id = $1 FOR UPDATE`, [args.eventId]);
    if (!lockResult.rows[0]) {
      throw new Error('Event not found');
    }

    const financeRow = await getEventFinanceRow(args.eventId, client);
    if (!financeRow) {
      throw new Error('Event not found');
    }
    if (financeRow.status === 'CANCELLED') {
      throw new Error('Cancelled events cannot be closed.');
    }
    if (financeRow.status === 'COMPLETED') {
      throw new Error('Event has already been closed');
    }
    if (financeRow.paymentStatus !== 'PAID') {
      throw new Error('Mark the event as paid before closing settlement.');
    }

    await replaceExpenseItems({ db: client, eventId: args.eventId, adminUserId: args.adminUserId, expenseItems });
    await replaceEventInventoryUsagePlans({ db: client, eventId: args.eventId, adminUserId: args.adminUserId, usageItems: inventoryUsageItems });

    const [expenses, draftInventoryUsageItems, inventoryCatalog] = await Promise.all([
      getExpenseItems(args.eventId, client),
      listEventInventoryUsageItems(args.eventId, client),
      listInventoryCatalog(client),
    ]);

    const draftSnapshot = buildSettlementSnapshot({
      financeRow,
      expenses,
      inventoryUsageItems: draftInventoryUsageItems,
      inventoryCatalog,
      settlement: {
        status: 'CLOSED',
        notes,
        settledAt: new Date().toISOString(),
        settledByUserId: args.adminUserId,
      },
    });

    if (!draftSnapshot.canClose) {
      throw new Error(draftSnapshot.warnings[0] || 'Event cannot be closed yet.');
    }

    await finalizeEventInventoryUsagePlans({ db: client, eventId: args.eventId, adminUserId: args.adminUserId });

    const [postedInventoryUsageItems, refreshedInventoryCatalog] = await Promise.all([
      listEventInventoryUsageItems(args.eventId, client),
      listInventoryCatalog(client),
    ]);

    const snapshot = buildSettlementSnapshot({
      financeRow,
      expenses,
      inventoryUsageItems: postedInventoryUsageItems,
      inventoryCatalog: refreshedInventoryCatalog,
      settlement: {
        status: 'CLOSED',
        notes,
        settledAt: new Date().toISOString(),
        settledByUserId: args.adminUserId,
      },
    });

    if (snapshot.summary.netProfitAmount < 0) {
      throw new Error('Net profit is negative. Review material costs before closing this event.');
    }

    const settledAt = new Date().toISOString();
    const eventFinanceTitle = snapshot.eventTitle;
    const [netProfitReason, materialsReason] = await Promise.all([
      resolveAutoFinanceReason({ db: client, type: 'INCOME', preferredNames: ['Net Profit', 'Other Income'] }),
      resolveAutoFinanceReason({ db: client, type: 'EXPENSE', preferredNames: ['Workshop Materials', 'Supplies', 'Other Expense'] }),
    ]);

    for (const expense of expenses) {
      if (expense.amount <= 0) continue;
      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: eventFinanceTitle,
        amount: expense.amount,
        currency: snapshot.currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: materialsReason,
        notes: expense.notes ? `Event material cost: ${expense.title}. ${expense.notes}` : `Event material cost: ${expense.title}.`,
        metadata: {
          source: 'EVENT_SETTLEMENT_CLOSE',
          eventBookingId: args.eventId,
          component: 'MANUAL_MATERIAL_COST',
          expenseItemId: expense.id,
          expenseTitle: expense.title,
        },
      });
    }

    for (const usageItem of postedInventoryUsageItems) {
      if (usageItem.status !== 'POSTED' || usageItem.totalCost <= 0) continue;
      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: eventFinanceTitle,
        amount: usageItem.totalCost,
        currency: snapshot.currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: materialsReason,
        notes: `Event inventory usage: ${usageItem.itemName} (${usageItem.quantity.toFixed(3)} ${usageItem.itemUnit}).`,
        metadata: {
          source: 'EVENT_SETTLEMENT_CLOSE',
          eventBookingId: args.eventId,
          component: 'INVENTORY_MATERIAL_USAGE',
          inventoryUsageId: usageItem.id,
          inventoryItemId: usageItem.inventoryItemId,
          quantity: usageItem.quantity,
          unitCost: usageItem.unitCost,
        },
      });
    }

    await insertAutoFinanceEntry({
      db: client,
      type: 'INCOME',
      title: eventFinanceTitle,
      amount: snapshot.summary.netProfitAmount,
      currency: snapshot.currency,
      occurredAtIso: settledAt,
      createdByUserId: args.adminUserId,
      reason: netProfitReason,
      counterparty: 'Noon',
      notes: 'Net profit auto-generated from event close settlement.',
      metadata: {
        source: 'EVENT_SETTLEMENT_CLOSE',
        eventBookingId: args.eventId,
        component: 'NET_PROFIT',
      },
    });

    await upsertSettlementRow({
      db: client,
      eventId: args.eventId,
      adminUserId: args.adminUserId,
      snapshot,
      notes,
      status: 'CLOSED',
    });

    await client.query(
      `UPDATE event_bookings
       SET status = 'COMPLETED',
           updated_at = NOW()
       WHERE id = $1`,
      [args.eventId]
    );

    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}