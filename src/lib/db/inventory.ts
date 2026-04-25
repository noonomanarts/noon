import { pool, query } from './pool';

type QueryResultRow = Record<string, unknown>;
type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount?: number | null }>;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorderLevel: number;
  currentStock: number;
  averageUnitCost: number;
  stockValue: number;
  totalPurchaseCost: number;
  totalConsumedCost: number;
  currency: string;
  allowsManualCost: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryCatalogItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  averageUnitCost: number;
  reorderLevel: number;
  allowsManualCost: boolean;
  isLowStock: boolean;
};

export type InventoryPurchaseLineInput = {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  notes?: string | null;
};

export type InventoryPurchaseLine = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
};

export type InventoryPurchase = {
  id: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  occurredAt: string;
  notes: string | null;
  totalCost: number;
  lines: InventoryPurchaseLine[];
  createdAt: string;
};

export type InventoryOverview = {
  summary: {
    itemsCount: number;
    totalStockQuantity: number;
    totalStockValue: number;
    totalPurchasedCost: number;
    totalConsumedCost: number;
    lowStockCount: number;
  };
  workshopCosts: Array<{
    classId: string;
    classTitle: string;
    classTitleAr: string | null;
    trainerName: string | null;
    sessionDate: string | null;
    totalCost: number;
    linesCount: number;
  }>;
  recentPurchases: InventoryPurchase[];
};

export type ClassInventoryUsageInput = {
  inventoryItemId: string;
  quantity: number;
  manualCostAmount?: number | null;
  notes?: string | null;
};

export type ClassInventoryUsageItem = {
  id: string;
  classId: string;
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

let inventorySchemaReady: Promise<void> | null = null;

function toMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeUsageItems(items: ClassInventoryUsageInput[]): ClassInventoryUsageInput[] {
  const grouped = new Map<string, { quantity: number; manualCostAmount: number; notes: string[] }>();

  for (const item of items) {
    const inventoryItemId = String(item.inventoryItemId || '').trim();
    const quantity = toMoney(item.quantity);
    const manualCostAmount = toMoney(item.manualCostAmount ?? 0);
    if (!inventoryItemId || (quantity <= 0 && manualCostAmount <= 0)) continue;

    const bucket = grouped.get(inventoryItemId) ?? { quantity: 0, manualCostAmount: 0, notes: [] };
    bucket.quantity = toMoney(bucket.quantity + quantity);
    bucket.manualCostAmount = toMoney(bucket.manualCostAmount + manualCostAmount);
    if (item.notes) {
      const note = String(item.notes).trim().slice(0, 500);
      if (note) bucket.notes.push(note);
    }
    grouped.set(inventoryItemId, bucket);
  }

  return Array.from(grouped.entries()).map(([inventoryItemId, item]) => ({
    inventoryItemId,
    quantity: item.quantity,
    manualCostAmount: item.manualCostAmount > 0 ? item.manualCostAmount : null,
    notes: item.notes.length > 0 ? item.notes.join(' | ').slice(0, 1000) : null,
  }));
}

export async function ensureInventorySchema(): Promise<void> {
  if (inventorySchemaReady) return inventorySchemaReady;

  inventorySchemaReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(180) NOT NULL,
        sku VARCHAR(100),
        unit VARCHAR(40) NOT NULL DEFAULT 'unit',
        reorder_level DECIMAL(12, 3) NOT NULL DEFAULT 0,
        current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
        average_unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (average_unit_cost >= 0),
        total_purchase_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_purchase_cost >= 0),
        total_consumed_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_consumed_cost >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
        allows_manual_cost BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku_unique ON inventory_items((LOWER(sku))) WHERE sku IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active)`);
    await query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS allows_manual_cost BOOLEAN NOT NULL DEFAULT FALSE`);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_purchases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_name VARCHAR(255),
        invoice_number VARCHAR(120),
        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        notes TEXT,
        total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_purchases_occurred_at ON inventory_purchases(occurred_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_purchase_lines (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_id UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
        inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
        unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
        total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_purchase_id ON inventory_purchase_lines(purchase_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_item_id ON inventory_purchase_lines(inventory_item_id)`);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('PURCHASE', 'WORKSHOP_USAGE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')),
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
        quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
        unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
        total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
        reference_type VARCHAR(50),
        reference_id UUID,
        class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        notes TEXT,
        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_class_id ON inventory_movements(class_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at ON inventory_movements(occurred_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS class_inventory_usages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
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
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_class_id ON class_inventory_usages(class_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_item_id ON class_inventory_usages(inventory_item_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_status ON class_inventory_usages(status)`);
    await query(`ALTER TABLE class_inventory_usages ADD COLUMN IF NOT EXISTS manual_cost_amount DECIMAL(12, 3)`);

    await query(
      `INSERT INTO inventory_items (
         name, unit, reorder_level, current_stock, average_unit_cost,
         total_purchase_cost, total_consumed_cost, currency, allows_manual_cost, is_active,
         created_by_user_id, updated_by_user_id, created_at, updated_at
       )
       SELECT
         'General Materials Pool', 'credit', 0, 0, 1,
         0, 0, 'OMR', TRUE, TRUE,
         NULL, NULL, NOW(), NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM inventory_items WHERE allows_manual_cost = TRUE
       )`
    );
  })().catch((error) => {
    inventorySchemaReady = null;
    throw error;
  });

  return inventorySchemaReady;
}

function mapInventoryItem(row: QueryResultRow): InventoryItem {
  const currentStock = toMoney(row.current_stock);
  const averageUnitCost = toMoney(row.average_unit_cost);

  return {
    id: String(row.id),
    name: String(row.name),
    sku: row.sku ? String(row.sku) : null,
    unit: String(row.unit || 'unit'),
    reorderLevel: toMoney(row.reorder_level),
    currentStock,
    averageUnitCost,
    stockValue: toMoney(currentStock * averageUnitCost),
    totalPurchaseCost: toMoney(row.total_purchase_cost),
    totalConsumedCost: toMoney(row.total_consumed_cost),
    currency: String(row.currency || 'OMR'),
    allowsManualCost: Boolean(row.allows_manual_cost),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listInventoryItems(options?: { includeInactive?: boolean }): Promise<InventoryItem[]> {
  await ensureInventorySchema();

  const includeInactive = Boolean(options?.includeInactive);
  const result = await query(
    `SELECT *
     FROM inventory_items
     WHERE ($1::boolean IS TRUE OR is_active = TRUE)
     ORDER BY name ASC`,
    [includeInactive]
  );

  return result.rows.map(mapInventoryItem);
}

export async function listInventoryCatalog(db: Queryable = { query }): Promise<InventoryCatalogItem[]> {
  await ensureInventorySchema();

  const result = await db.query(
    `SELECT id, name, unit, reorder_level, current_stock, average_unit_cost, allows_manual_cost
     FROM inventory_items
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );

  return result.rows.map((row) => {
    const currentStock = toMoney(row.current_stock);
    const reorderLevel = toMoney(row.reorder_level);

    return {
      id: String(row.id),
      name: String(row.name),
      unit: String(row.unit || 'unit'),
      currentStock,
      averageUnitCost: toMoney(row.average_unit_cost),
      reorderLevel,
      allowsManualCost: Boolean(row.allows_manual_cost),
      isLowStock: reorderLevel > 0 && currentStock <= reorderLevel,
    };
  });
}

export async function createInventoryItem(input: {
  name: string;
  sku?: string | null;
  unit?: string | null;
  reorderLevel?: number;
  currency?: string | null;
  allowsManualCost?: boolean;
  adminUserId: string;
}): Promise<InventoryItem> {
  await ensureInventorySchema();

  const name = sanitizeText(input.name, 180);
  if (!name) {
    throw new Error('Item name is required');
  }

  const sku = sanitizeText(input.sku, 100);
  const unit = sanitizeText(input.unit, 40) ?? 'unit';
  const reorderLevel = Math.max(0, toMoney(input.reorderLevel ?? 0));
  const currency = sanitizeText(input.currency, 10) ?? 'OMR';
  const allowsManualCost = Boolean(input.allowsManualCost);

  const result = await query(
    `INSERT INTO inventory_items (
       name, sku, unit, reorder_level, currency, allows_manual_cost, created_by_user_id, updated_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())
     RETURNING *`,
    [name, sku, unit, reorderLevel, currency, allowsManualCost, input.adminUserId]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create inventory item');
  }

  return mapInventoryItem(row);
}

export async function deleteInventoryItem(itemId: string, adminUserId?: string): Promise<boolean> {
  await ensureInventorySchema();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemResult = await client.query(
      `SELECT current_stock
       FROM inventory_items
       WHERE id = $1
       FOR UPDATE`,
      [itemId]
    );

    if (!itemResult.rows[0]) {
      await client.query('ROLLBACK');
      return false;
    }

    const currentStock = toMoney(itemResult.rows[0].current_stock);

    const eventUsageTableExistsResult = await client.query(
      `SELECT to_regclass('public.event_inventory_usages') IS NOT NULL AS exists`
    );

    const eventUsageTableExists = Boolean(eventUsageTableExistsResult.rows[0]?.exists);

    const referencesResult = await client.query(
      `SELECT (
          (SELECT COUNT(*) FROM inventory_purchase_lines WHERE inventory_item_id = $1) +
          (SELECT COUNT(*) FROM inventory_movements WHERE inventory_item_id = $1) +
          (SELECT COUNT(*) FROM class_inventory_usages WHERE inventory_item_id = $1)
        )::int AS reference_count`,
      [itemId]
    );

    let referenceCount = referencesResult.rows[0]?.reference_count ?? 0;

    if (eventUsageTableExists) {
      const eventReferencesResult = await client.query(
        `SELECT COUNT(*)::int AS reference_count
         FROM event_inventory_usages
         WHERE inventory_item_id = $1`,
        [itemId]
      );
      referenceCount += eventReferencesResult.rows[0]?.reference_count ?? 0;
    }

    if (referenceCount > 0) {
      if (currentStock > 0) {
        const averageUnitCostResult = await client.query(
          `SELECT average_unit_cost
           FROM inventory_items
           WHERE id = $1
           LIMIT 1`,
          [itemId]
        );
        const averageUnitCost = toMoney(averageUnitCostResult.rows[0]?.average_unit_cost);
        const totalCost = toMoney(currentStock * averageUnitCost);

        await client.query(
          `INSERT INTO inventory_movements (
             inventory_item_id, movement_type, direction, quantity, unit_cost, total_cost,
             reference_type, notes, occurred_at, created_by_user_id, created_at
           ) VALUES (
             $1, 'ADJUSTMENT_OUT', 'OUT', $2, $3, $4,
             'ADMIN_DELETE_ARCHIVE', 'Inventory item archived during delete request.', NOW(), $5, NOW()
           )`,
          [itemId, currentStock, averageUnitCost, totalCost, adminUserId ?? null]
        );

        await client.query(
          `UPDATE inventory_items
           SET current_stock = 0,
               updated_by_user_id = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [itemId, adminUserId ?? null]
        );
      }

      const archiveResult = await client.query(
        `UPDATE inventory_items
         SET is_active = FALSE,
             updated_by_user_id = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [itemId, adminUserId ?? null]
      );
      await client.query('COMMIT');
      return (archiveResult.rowCount ?? 0) > 0;
    }

    if (currentStock > 0) {
      throw new Error('Inventory item still has stock. Clear its stock before deleting it.');
    }

    const deleteResult = await client.query(`DELETE FROM inventory_items WHERE id = $1`, [itemId]);
    await client.query('COMMIT');
    return (deleteResult.rowCount ?? 0) > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function clearInventoryStock(adminUserId: string): Promise<number> {
  await ensureInventorySchema();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemsResult = await client.query(
      `SELECT id, current_stock, average_unit_cost, currency
       FROM inventory_items
       WHERE current_stock > 0
       FOR UPDATE`
    );

    for (const row of itemsResult.rows) {
      const currentStock = toMoney(row.current_stock);
      const averageUnitCost = toMoney(row.average_unit_cost);
      const totalCost = toMoney(currentStock * averageUnitCost);

      await client.query(
        `INSERT INTO inventory_movements (
           inventory_item_id, movement_type, direction, quantity, unit_cost, total_cost,
           reference_type, notes, occurred_at, created_by_user_id, created_at
         ) VALUES (
           $1, 'ADJUSTMENT_OUT', 'OUT', $2, $3, $4,
           'ADMIN_CLEAR_STOCK', 'Inventory stock cleared by admin.', NOW(), $5, NOW()
         )`,
        [String(row.id), currentStock, averageUnitCost, totalCost, adminUserId]
      );
    }

    await client.query(
      `UPDATE inventory_items
       SET current_stock = 0,
           updated_by_user_id = $1,
           updated_at = NOW()
       WHERE current_stock > 0`,
      [adminUserId]
    );

    await client.query('COMMIT');
    return itemsResult.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createInventoryPurchase(input: {
  supplierName?: string | null;
  invoiceNumber?: string | null;
  occurredAt?: string | null;
  notes?: string | null;
  lines: InventoryPurchaseLineInput[];
  adminUserId: string;
}): Promise<InventoryPurchase> {
  await ensureInventorySchema();

  const normalizedLines = input.lines
    .map((line) => ({
      inventoryItemId: String(line.inventoryItemId || '').trim(),
      quantity: toMoney(line.quantity),
      unitCost: toMoney(line.unitCost),
      notes: sanitizeText(line.notes, 800),
    }))
    .filter((line) => line.inventoryItemId && line.quantity > 0 && line.unitCost >= 0);

  if (normalizedLines.length === 0) {
    throw new Error('At least one valid purchase line is required');
  }

  const supplierName = sanitizeText(input.supplierName, 255);
  const invoiceNumber = sanitizeText(input.invoiceNumber, 120);
  const notes = sanitizeText(input.notes, 4000);
  const occurredAtDate = input.occurredAt ? new Date(input.occurredAt) : new Date();

  if (Number.isNaN(occurredAtDate.getTime())) {
    throw new Error('Invalid purchase date');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const purchaseResult = await client.query(
      `INSERT INTO inventory_purchases (
         supplier_name, invoice_number, occurred_at, notes, total_cost, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())
       RETURNING id, supplier_name, invoice_number, occurred_at, notes, total_cost, created_at`,
      [supplierName, invoiceNumber, occurredAtDate.toISOString(), notes, input.adminUserId]
    );

    const purchaseRow = purchaseResult.rows[0];
    if (!purchaseRow) {
      throw new Error('Failed to create purchase header');
    }

    const purchaseId = String(purchaseRow.id);
    const lines: InventoryPurchaseLine[] = [];
    let totalCost = 0;

    for (const line of normalizedLines) {
      const itemResult = await client.query(
        `SELECT id, name, unit, current_stock, average_unit_cost, total_purchase_cost
         FROM inventory_items
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [line.inventoryItemId]
      );

      const itemRow = itemResult.rows[0];
      if (!itemRow) {
        throw new Error('One of the selected inventory items does not exist');
      }

      const currentStock = toMoney(itemRow.current_stock);
      const currentAverage = toMoney(itemRow.average_unit_cost);
      const lineTotalCost = toMoney(line.quantity * line.unitCost);

      const nextStock = toMoney(currentStock + line.quantity);
      const nextAverage = nextStock <= 0 ? 0 : toMoney(((currentStock * currentAverage) + lineTotalCost) / nextStock);

      await client.query(
        `UPDATE inventory_items
         SET current_stock = $1,
             average_unit_cost = $2,
             total_purchase_cost = total_purchase_cost + $3,
             updated_by_user_id = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [nextStock, nextAverage, lineTotalCost, input.adminUserId, line.inventoryItemId]
      );

      const lineResult = await client.query(
        `INSERT INTO inventory_purchase_lines (
           purchase_id, inventory_item_id, quantity, unit_cost, total_cost, notes, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [purchaseId, line.inventoryItemId, line.quantity, line.unitCost, lineTotalCost, line.notes]
      );

      await client.query(
        `INSERT INTO inventory_movements (
           inventory_item_id, movement_type, direction, quantity, unit_cost, total_cost,
           reference_type, reference_id, class_id, notes, occurred_at, created_by_user_id, created_at
         ) VALUES ($1, 'PURCHASE', 'IN', $2, $3, $4, 'PURCHASE', $5, NULL, $6, $7, $8, NOW())`,
        [line.inventoryItemId, line.quantity, line.unitCost, lineTotalCost, purchaseId, line.notes, occurredAtDate.toISOString(), input.adminUserId]
      );

      totalCost = toMoney(totalCost + lineTotalCost);
      lines.push({
        id: lineResult.rows[0] ? String(lineResult.rows[0].id) : `${purchaseId}-${line.inventoryItemId}`,
        inventoryItemId: line.inventoryItemId,
        itemName: String(itemRow.name),
        itemUnit: String(itemRow.unit || 'unit'),
        quantity: line.quantity,
        unitCost: line.unitCost,
        totalCost: lineTotalCost,
        notes: line.notes,
      });
    }

    await client.query(
      `UPDATE inventory_purchases
       SET total_cost = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [totalCost, purchaseId]
    );

    await client.query('COMMIT');

    return {
      id: purchaseId,
      supplierName,
      invoiceNumber,
      occurredAt: occurredAtDate.toISOString(),
      notes,
      totalCost,
      lines,
      createdAt: String(purchaseRow.created_at),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listRecentInventoryPurchases(limit = 12): Promise<InventoryPurchase[]> {
  await ensureInventorySchema();

  const normalizedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));

  const headerResult = await query(
    `SELECT id, supplier_name, invoice_number, occurred_at, notes, total_cost, created_at
     FROM inventory_purchases
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT $1`,
    [normalizedLimit]
  );

  const headers = headerResult.rows;
  if (headers.length === 0) return [];

  const purchaseIds = headers.map((row) => String(row.id));

  const linesResult = await query(
    `SELECT pl.id,
            pl.purchase_id,
            pl.inventory_item_id,
            pl.quantity,
            pl.unit_cost,
            pl.total_cost,
            pl.notes,
            i.name AS item_name,
            i.unit AS item_unit
     FROM inventory_purchase_lines pl
     INNER JOIN inventory_items i ON i.id = pl.inventory_item_id
     WHERE pl.purchase_id = ANY($1::uuid[])
     ORDER BY pl.created_at ASC`,
    [purchaseIds]
  );

  const linesByPurchase = new Map<string, InventoryPurchaseLine[]>();
  for (const row of linesResult.rows) {
    const purchaseId = String(row.purchase_id);
    const bucket = linesByPurchase.get(purchaseId) ?? [];
    bucket.push({
      id: String(row.id),
      inventoryItemId: String(row.inventory_item_id),
      itemName: String(row.item_name),
      itemUnit: String(row.item_unit || 'unit'),
      quantity: toMoney(row.quantity),
      unitCost: toMoney(row.unit_cost),
      totalCost: toMoney(row.total_cost),
      notes: row.notes ? String(row.notes) : null,
    });
    linesByPurchase.set(purchaseId, bucket);
  }

  return headers.map((row) => {
    const purchaseId = String(row.id);
    return {
      id: purchaseId,
      supplierName: row.supplier_name ? String(row.supplier_name) : null,
      invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
      occurredAt: String(row.occurred_at),
      notes: row.notes ? String(row.notes) : null,
      totalCost: toMoney(row.total_cost),
      lines: linesByPurchase.get(purchaseId) ?? [],
      createdAt: String(row.created_at),
    };
  });
}

export async function getInventoryOverview(): Promise<InventoryOverview> {
  await ensureInventorySchema();

  const [summaryResult, workshopCostResult, purchases] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS items_count,
              COALESCE(SUM(current_stock), 0) AS total_stock_quantity,
              COALESCE(SUM(current_stock * average_unit_cost), 0) AS total_stock_value,
              COALESCE(SUM(total_purchase_cost), 0) AS total_purchased_cost,
              COALESCE(SUM(total_consumed_cost), 0) AS total_consumed_cost,
              COUNT(*) FILTER (WHERE reorder_level > 0 AND current_stock <= reorder_level)::int AS low_stock_count
       FROM inventory_items
       WHERE is_active = TRUE`
    ),
    query(
      `SELECT u.class_id,
              COALESCE(c.title, 'Workshop') AS class_title,
              c.title_ar AS class_title_ar,
              trainer.full_name AS trainer_name,
              MIN(cs.start_date_time) AS session_date,
              COALESCE(SUM(u.total_cost), 0) AS total_cost,
              COUNT(*)::int AS lines_count
       FROM class_inventory_usages u
       LEFT JOIN classes c ON c.id = u.class_id
       LEFT JOIN users trainer ON trainer.id = c.trainer_id
       LEFT JOIN class_sessions cs ON cs.class_id = c.id
       WHERE u.status = 'POSTED'
       GROUP BY u.class_id, c.title, c.title_ar, trainer.full_name
       ORDER BY MAX(u.posted_at) DESC NULLS LAST, MAX(u.created_at) DESC
       LIMIT 30`
    ),
    listRecentInventoryPurchases(10),
  ]);

  const summaryRow = summaryResult.rows[0] || {};

  return {
    summary: {
      itemsCount: Number(summaryRow.items_count || 0),
      totalStockQuantity: toMoney(summaryRow.total_stock_quantity),
      totalStockValue: toMoney(summaryRow.total_stock_value),
      totalPurchasedCost: toMoney(summaryRow.total_purchased_cost),
      totalConsumedCost: toMoney(summaryRow.total_consumed_cost),
      lowStockCount: Number(summaryRow.low_stock_count || 0),
    },
    workshopCosts: workshopCostResult.rows.map((row) => ({
      classId: String(row.class_id),
      classTitle: String(row.class_title || 'Workshop'),
      classTitleAr: row.class_title_ar ? String(row.class_title_ar) : null,
      trainerName: row.trainer_name ? String(row.trainer_name) : null,
      sessionDate: row.session_date ? String(row.session_date) : null,
      totalCost: toMoney(row.total_cost),
      linesCount: Number(row.lines_count || 0),
    })),
    recentPurchases: purchases,
  };
}

export async function listClassInventoryUsageItems(classId: string, db: Queryable = { query }): Promise<ClassInventoryUsageItem[]> {
  await ensureInventorySchema();

  const result = await db.query(
    `SELECT u.id,
            u.class_id,
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
     FROM class_inventory_usages u
     INNER JOIN inventory_items i ON i.id = u.inventory_item_id
     WHERE u.class_id = $1
     ORDER BY u.created_at ASC`,
    [classId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    classId: String(row.class_id),
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

export async function replaceClassInventoryUsagePlans(params: {
  db: Queryable;
  classId: string;
  adminUserId: string;
  usageItems: ClassInventoryUsageInput[];
}): Promise<void> {
  await ensureInventorySchema();

  const normalized = normalizeUsageItems(params.usageItems);

  await params.db.query(`DELETE FROM class_inventory_usages WHERE class_id = $1 AND status = 'PLANNED'`, [params.classId]);

  if (normalized.length === 0) {
    return;
  }

  const itemIds = normalized.map((item) => item.inventoryItemId);
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

  for (const item of normalized) {
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
      `INSERT INTO class_inventory_usages (
         class_id, inventory_item_id, quantity, unit_cost, total_cost, manual_cost_amount, notes,
         status, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PLANNED', $8, NOW(), NOW())`,
      [
        params.classId,
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

export async function finalizeClassInventoryUsagePlans(params: {
  db: Queryable;
  classId: string;
  adminUserId: string;
}): Promise<void> {
  await ensureInventorySchema();

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
     FROM class_inventory_usages u
     INNER JOIN inventory_items i ON i.id = u.inventory_item_id
     WHERE u.class_id = $1
       AND u.status = 'PLANNED'
     ORDER BY u.created_at ASC
     FOR UPDATE OF u, i`,
    [params.classId]
  );

  for (const usageRow of usageResult.rows) {
    const usageId = String(usageRow.id);
    const inventoryItemId = String(usageRow.inventory_item_id);
    const quantity = toMoney(usageRow.quantity);
    const availableStock = toMoney(usageRow.current_stock);

    if (quantity <= 0) {
      continue;
    }

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
         reference_type, reference_id, class_id, notes, occurred_at, created_by_user_id, created_at
       ) VALUES (
         $1, 'WORKSHOP_USAGE', 'OUT', $2, $3, $4,
         'CLASS_SETTLEMENT', $5, $5, $6, NOW(), $7, NOW()
       )
       RETURNING id`,
      [inventoryItemId, quantity, unitCost, totalCost, params.classId, usageRow.notes || null, params.adminUserId]
    );

    await params.db.query(
      `UPDATE class_inventory_usages
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
