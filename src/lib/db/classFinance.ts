import { calculateWorkshopFinanceBreakdown, type TrainerShareTier, type WorkshopCostSettings } from '@/lib/classFinanceRules';
import {
  defaultClassFinanceAdminSettings,
  getAdminSettingsByKey,
  type ClassFinanceAdminSettings,
} from '@/lib/db/adminSettings';
import {
  finalizeClassInventoryUsagePlans,
  listClassInventoryUsageItems,
  listInventoryCatalog,
  replaceClassInventoryUsagePlans,
  type ClassInventoryUsageInput,
  type ClassInventoryUsageItem,
  type InventoryCatalogItem,
} from '@/lib/db/inventory';
import { ensureAdminFinanceSchema } from './finance';
import { pool, query } from './pool';

type QueryResultRow = Record<string, unknown>;
type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount?: number | null }>;
};

type AdminFinanceEntryType = 'INCOME' | 'EXPENSE';

export type ClassExpenseItemInput = {
  id?: string;
  title: string;
  amount: number;
  notes?: string | null;
};

export type ClassExpenseItem = {
  id: string;
  title: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClassParticipantRow = {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  classStartTime: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  participantIndex: number;
  participantName: string;
  participantDateOfBirth: string | null;
  participantPreferredLanguage: string | null;
};

export type ClassSettlementSnapshot = {
  classId: string;
  currency: string;
  trainer: {
    id: string;
    fullName: string;
  } | null;
  finance: {
    fixedCosts: {
      kitchenUsageRatePerHour: number;
      workshopContentRatePerParticipant: number;
      durationHours: number;
      kitchenUsageAmount: number;
      workshopContentAmount: number;
      total: number;
    };
    materialsCostAmount: number;
    trainerFee: {
      percent: number;
      baseAmount: number;
      amount: number;
    };
    noonFeeAmount: number;
    totalCostsAmount: number;
  };
  summary: {
    bookingsCount: number;
    participantsCount: number;
    grossRevenue: number;
    fixedCostsAmount: number;
    materialsCostAmount: number;
    trainerFeePercent: number;
    trainerFeeBaseAmount: number;
    trainerFeeAmount: number;
    noonFeeAmount: number;
    totalCostsAmount: number;
  };
  participants: ClassParticipantRow[];
  expenses: ClassExpenseItem[];
  inventoryUsageItems: ClassInventoryUsageItem[];
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

type FinanceClassRow = {
  id: string;
  title: string;
  trainerId: string | null;
  trainerName: string | null;
  category: 'COOKING' | 'ARTS_CRAFTS';
  currency: string;
  durationMinutes: number;
  trainerShareTiers: TrainerShareTier[];
  trainerSharePercent: number;
  noonSharePercent: number;
  expenseSharePercent: number;
  closedAt: string | null;
  closedByUserId: string | null;
};

let classFinanceSchemaReady: Promise<void> | null = null;

function toMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function toPercent(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function sanitizeExpenseItems(value: unknown): ClassExpenseItemInput[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((row): ClassExpenseItemInput | null => {
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
    .filter((item): item is ClassExpenseItemInput => Boolean(item));

  return normalized;
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

export async function ensureClassFinanceSchema(): Promise<void> {
  if (classFinanceSchemaReady) {
    return classFinanceSchemaReady;
  }

  classFinanceSchemaReady = (async () => {
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS trainer_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS noon_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS expense_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS class_expense_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (amount >= 0),
        notes TEXT,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS class_settlements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL UNIQUE REFERENCES classes(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CLOSED')),
        gross_revenue DECIMAL(10, 3) NOT NULL DEFAULT 0,
        participants_count INTEGER NOT NULL DEFAULT 0,
        trainer_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        noon_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        expense_share_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        trainer_payout_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        admin_share_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        expense_budget_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        admin_total_payout_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        actual_expenses_total DECIMAL(10, 3) NOT NULL DEFAULT 0,
        expense_variance_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        kitchen_usage_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        workshop_content_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        fixed_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        materials_cost_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        trainer_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
        trainer_fee_base_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        noon_fee_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        total_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
        trainer_wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
        admin_share_wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
        expense_budget_wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
        notes TEXT,
        settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        settled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_class_expense_items_class_id ON class_expense_items(class_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_settlements_class_id ON class_settlements(class_id)`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS kitchen_usage_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS workshop_content_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS fixed_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS materials_cost_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS trainer_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS trainer_fee_base_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS noon_fee_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE class_settlements ADD COLUMN IF NOT EXISTS total_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
  })().catch((error) => {
    classFinanceSchemaReady = null;
    throw error;
  });

  return classFinanceSchemaReady;
}

async function getClassFinanceRow(classId: string, db: Queryable): Promise<FinanceClassRow | null> {
  const result = await db.query(
    `SELECT c.id,
            c.title,
            c.category,
            c.currency,
            c.duration_minutes,
            c.trainer_id,
            c.trainer_share_percent,
            c.noon_share_percent,
            c.expense_share_percent,
            c.closed_at,
            c.closed_by_user_id,
            u.full_name AS trainer_name,
            tp.share_tiers
     FROM classes c
     LEFT JOIN users u ON u.id = c.trainer_id
     LEFT JOIN trainer_profiles tp ON tp.user_id = c.trainer_id
     WHERE c.id = $1
     LIMIT 1`,
    [classId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    title: String(row.title || 'Workshop'),
    trainerId: row.trainer_id ? String(row.trainer_id) : null,
    trainerName: row.trainer_name ? String(row.trainer_name) : null,
    category: String(row.category) === 'ARTS_CRAFTS' ? 'ARTS_CRAFTS' : 'COOKING',
    currency: String(row.currency || 'OMR'),
    durationMinutes: Number(row.duration_minutes || 0),
    trainerShareTiers: Array.isArray(row.share_tiers)
      ? (row.share_tiers as Array<Record<string, unknown>>)
          .map((item) => ({
            minParticipants: Math.max(0, Math.trunc(Number(item.minParticipants ?? 0) || 0)),
            maxParticipants:
              item.maxParticipants === null || item.maxParticipants === undefined || item.maxParticipants === ''
                ? null
                : Math.max(0, Math.trunc(Number(item.maxParticipants) || 0)),
            percent: Number((Math.min(100, Math.max(0, Number(item.percent ?? 0) || 0))).toFixed(2)),
          }))
          .sort((left, right) => left.minParticipants - right.minParticipants)
      : [],
    trainerSharePercent: toPercent(row.trainer_share_percent),
    noonSharePercent: toPercent(row.noon_share_percent),
    expenseSharePercent: toPercent(row.expense_share_percent),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    closedByUserId: row.closed_by_user_id ? String(row.closed_by_user_id) : null,
  };
}

async function getClassFinanceSettings(): Promise<ClassFinanceAdminSettings> {
  const saved = await getAdminSettingsByKey<ClassFinanceAdminSettings>('class-finance');

  return {
    ...defaultClassFinanceAdminSettings,
    ...(saved ?? {}),
    cooking: {
      ...defaultClassFinanceAdminSettings.cooking,
      ...(saved?.cooking ?? {}),
    },
    artsCrafts: {
      ...defaultClassFinanceAdminSettings.artsCrafts,
      ...(saved?.artsCrafts ?? {}),
    },
    defaultTrainerShareTiers:
      Array.isArray(saved?.defaultTrainerShareTiers) && saved.defaultTrainerShareTiers.length > 0
        ? saved.defaultTrainerShareTiers
        : defaultClassFinanceAdminSettings.defaultTrainerShareTiers,
  };
}

async function getExpenseItems(classId: string, db: Queryable): Promise<ClassExpenseItem[]> {
  const result = await db.query(
    `SELECT id, title, amount, notes, created_at, updated_at
     FROM class_expense_items
     WHERE class_id = $1
     ORDER BY created_at ASC`,
    [classId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    amount: toMoney(row.amount),
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

async function getSettlementRow(classId: string, db: Queryable) {
  const result = await db.query(
    `SELECT status, notes, settled_at, settled_by_user_id
     FROM class_settlements
     WHERE class_id = $1
     LIMIT 1`,
    [classId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    status: String(row.status) as 'DRAFT' | 'CLOSED',
    notes: row.notes ? String(row.notes) : null,
    settledAt: row.settled_at ? String(row.settled_at) : null,
    settledByUserId: row.settled_by_user_id ? String(row.settled_by_user_id) : null,
  };
}

async function getParticipantRows(classId: string, db: Queryable): Promise<ClassParticipantRow[]> {
  const result = await db.query(
    `SELECT b.id AS booking_id,
            b.booking_number,
            b.status AS booking_status,
            b.payment_status,
            b.total_amount,
            b.participants,
            c.start_date_time,
            u.id AS customer_id,
            u.full_name AS customer_name,
            u.email AS customer_email
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     INNER JOIN users u ON u.id = b.user_id
     WHERE b.class_id = $1
       AND b.payment_status = 'PAID'
       AND b.status IN ('CONFIRMED', 'COMPLETED')
     ORDER BY c.start_date_time ASC, b.created_at ASC`,
    [classId]
  );

  const rows: ClassParticipantRow[] = [];

  for (const row of result.rows) {
    const rawParticipants = Array.isArray(row.participants) ? row.participants : [];
    const bookingId = String(row.booking_id);
    const bookingNumber = String(row.booking_number);
    const customerId = String(row.customer_id);
    const customerName = String(row.customer_name);
    const customerEmail = row.customer_email ? String(row.customer_email) : null;
    const classStartTime = String(row.start_date_time);
    const bookingStatus = String(row.booking_status);
    const paymentStatus = String(row.payment_status);
    const totalAmount = toMoney(row.total_amount);

    if (rawParticipants.length === 0) {
      rows.push({
        bookingId,
        bookingNumber,
        customerId,
        customerName,
        customerEmail,
        classStartTime,
        bookingStatus,
        paymentStatus,
        totalAmount,
        participantIndex: 1,
        participantName: customerName,
        participantDateOfBirth: null,
        participantPreferredLanguage: null,
      });
      continue;
    }

    rawParticipants.forEach((participant, index) => {
      const item = participant && typeof participant === 'object' ? (participant as Record<string, unknown>) : {};
      if (item.isFreePartner === true) {
        return;
      }
      rows.push({
        bookingId,
        bookingNumber,
        customerId,
        customerName,
        customerEmail,
        classStartTime,
        bookingStatus,
        paymentStatus,
        totalAmount,
        participantIndex: index + 1,
        participantName: String(item.fullName || customerName),
        participantDateOfBirth: item.dateOfBirth ? String(item.dateOfBirth) : null,
        participantPreferredLanguage: item.preferredLanguage ? String(item.preferredLanguage) : null,
      });
    });
  }

  return rows;
}

function buildSettlementSnapshot(args: {
  financeRow: FinanceClassRow;
  classFinanceSettings: ClassFinanceAdminSettings;
  participants: ClassParticipantRow[];
  expenses: ClassExpenseItem[];
  inventoryUsageItems: ClassInventoryUsageItem[];
  inventoryCatalog: InventoryCatalogItem[];
  settlement: {
    status: 'DRAFT' | 'CLOSED';
    notes: string | null;
    settledAt: string | null;
    settledByUserId: string | null;
  } | null;
}): ClassSettlementSnapshot {
  const grossRevenue = toMoney(args.participants.reduce((sum, row) => sum + (row.participantIndex === 1 ? row.totalAmount : 0), 0));
  const participantsCount = args.participants.length;
  const manualMaterialsCostAmount = toMoney(args.expenses.reduce((sum, item) => sum + item.amount, 0));
  const inventoryMaterialsCostAmount = toMoney(args.inventoryUsageItems.reduce((sum, item) => sum + item.totalCost, 0));
  const materialsCostAmount = toMoney(manualMaterialsCostAmount + inventoryMaterialsCostAmount);
  const categorySettings: WorkshopCostSettings =
    args.financeRow.category === 'ARTS_CRAFTS'
      ? args.classFinanceSettings.artsCrafts
      : args.classFinanceSettings.cooking;
  const trainerShareTiers =
    args.financeRow.trainerShareTiers.length > 0
      ? args.financeRow.trainerShareTiers
      : args.classFinanceSettings.defaultTrainerShareTiers;

  const finance = calculateWorkshopFinanceBreakdown({
    grossRevenue,
    participantsCount,
    durationMinutes: args.financeRow.durationMinutes,
    materialsCostAmount,
    costSettings: categorySettings,
    trainerShareTiers,
  });

  const warnings: string[] = [];
  if (participantsCount === 0) {
    warnings.push('No paid participants were found for this class.');
  }
  if (!args.financeRow.trainerId) {
    warnings.push('Trainer is missing for this class.');
  }
  if (finance.noonFeeAmount < 0) {
    warnings.push('Noon fee is negative. Reduce material costs or review the workshop revenue before closing.');
  }
  if (args.financeRow.closedAt) {
    warnings.push('This class has already been closed and settled.');
  }
  for (const usage of args.inventoryUsageItems) {
    if (usage.status === 'PLANNED' && usage.quantity > usage.availableStock) {
      warnings.push(
        `Insufficient inventory stock for "${usage.itemName}" (${usage.quantity.toFixed(3)} ${usage.itemUnit} required, ${usage.availableStock.toFixed(3)} available).`
      );
    }
  }

  return {
    classId: args.financeRow.id,
    currency: args.financeRow.currency,
    trainer: args.financeRow.trainerId
      ? {
          id: args.financeRow.trainerId,
          fullName: args.financeRow.trainerName || 'Trainer',
        }
      : null,
    finance,
    summary: {
      bookingsCount: new Set(args.participants.map((row) => row.bookingId)).size,
      participantsCount,
      grossRevenue,
      fixedCostsAmount: finance.fixedCosts.total,
      materialsCostAmount: finance.materialsCostAmount,
      trainerFeePercent: finance.trainerFee.percent,
      trainerFeeBaseAmount: finance.trainerFee.baseAmount,
      trainerFeeAmount: finance.trainerFee.amount,
      noonFeeAmount: finance.noonFeeAmount,
      totalCostsAmount: finance.totalCostsAmount,
    },
    participants: args.participants,
    expenses: args.expenses,
    inventoryUsageItems: args.inventoryUsageItems,
    inventoryCatalog: args.inventoryCatalog,
    settlement: args.settlement,
    warnings,
    canClose: warnings.length === 0,
  };
}

export async function getClassSettlementSnapshot(classId: string): Promise<ClassSettlementSnapshot | null> {
  await ensureClassFinanceSchema();

  const financeRow = await getClassFinanceRow(classId, { query });
  if (!financeRow) return null;

  const [classFinanceSettings, participants, expenses, settlement, inventoryUsageItems, inventoryCatalog] = await Promise.all([
    getClassFinanceSettings(),
    getParticipantRows(classId, { query }),
    getExpenseItems(classId, { query }),
    getSettlementRow(classId, { query }),
    listClassInventoryUsageItems(classId, { query }),
    listInventoryCatalog({ query }),
  ]);

  return buildSettlementSnapshot({
    financeRow,
    classFinanceSettings,
    participants,
    expenses,
    inventoryUsageItems,
    inventoryCatalog,
    settlement,
  });
}

async function replaceExpenseItems(params: {
  db: Queryable;
  classId: string;
  adminUserId: string;
  expenseItems: ClassExpenseItemInput[];
}) {
  await params.db.query(`DELETE FROM class_expense_items WHERE class_id = $1`, [params.classId]);

  for (const item of params.expenseItems) {
    await params.db.query(
      `INSERT INTO class_expense_items (class_id, title, amount, notes, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [params.classId, item.title, item.amount, item.notes || null, params.adminUserId]
    );
  }
}

async function upsertSettlementRow(params: {
  db: Queryable;
  classId: string;
  adminUserId: string;
  snapshot: ClassSettlementSnapshot;
  notes: string | null;
  status: 'DRAFT' | 'CLOSED';
  trainerWalletTransactionId?: string | null;
  adminShareWalletTransactionId?: string | null;
  expenseBudgetWalletTransactionId?: string | null;
}) {
  await params.db.query(
    `INSERT INTO class_settlements (
       class_id, status, gross_revenue, participants_count,
       trainer_share_percent, noon_share_percent, expense_share_percent,
       trainer_payout_amount, admin_share_amount, expense_budget_amount,
       admin_total_payout_amount, actual_expenses_total, expense_variance_amount,
       kitchen_usage_amount, workshop_content_amount, fixed_costs_amount, materials_cost_amount,
       trainer_fee_percent, trainer_fee_base_amount, noon_fee_amount, total_costs_amount,
       currency, trainer_wallet_transaction_id, admin_share_wallet_transaction_id, expense_budget_wallet_transaction_id,
       notes, settled_by_user_id, settled_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, $21,
       $22, $23, $24, $25,
       $26, $27, $28, NOW(), NOW()
     )
     ON CONFLICT (class_id) DO UPDATE SET
       status = EXCLUDED.status,
       gross_revenue = EXCLUDED.gross_revenue,
       participants_count = EXCLUDED.participants_count,
       trainer_share_percent = EXCLUDED.trainer_share_percent,
       noon_share_percent = EXCLUDED.noon_share_percent,
       expense_share_percent = EXCLUDED.expense_share_percent,
       trainer_payout_amount = EXCLUDED.trainer_payout_amount,
       admin_share_amount = EXCLUDED.admin_share_amount,
       expense_budget_amount = EXCLUDED.expense_budget_amount,
       admin_total_payout_amount = EXCLUDED.admin_total_payout_amount,
       actual_expenses_total = EXCLUDED.actual_expenses_total,
       expense_variance_amount = EXCLUDED.expense_variance_amount,
      kitchen_usage_amount = EXCLUDED.kitchen_usage_amount,
      workshop_content_amount = EXCLUDED.workshop_content_amount,
      fixed_costs_amount = EXCLUDED.fixed_costs_amount,
      materials_cost_amount = EXCLUDED.materials_cost_amount,
      trainer_fee_percent = EXCLUDED.trainer_fee_percent,
      trainer_fee_base_amount = EXCLUDED.trainer_fee_base_amount,
      noon_fee_amount = EXCLUDED.noon_fee_amount,
      total_costs_amount = EXCLUDED.total_costs_amount,
       currency = EXCLUDED.currency,
       trainer_wallet_transaction_id = COALESCE(EXCLUDED.trainer_wallet_transaction_id, class_settlements.trainer_wallet_transaction_id),
       admin_share_wallet_transaction_id = COALESCE(EXCLUDED.admin_share_wallet_transaction_id, class_settlements.admin_share_wallet_transaction_id),
       expense_budget_wallet_transaction_id = COALESCE(EXCLUDED.expense_budget_wallet_transaction_id, class_settlements.expense_budget_wallet_transaction_id),
       notes = EXCLUDED.notes,
       settled_by_user_id = EXCLUDED.settled_by_user_id,
       settled_at = EXCLUDED.settled_at,
       updated_at = NOW()`,
    [
      params.classId,
      params.status,
      params.snapshot.summary.grossRevenue,
      params.snapshot.summary.participantsCount,
      params.snapshot.summary.trainerFeePercent,
      params.snapshot.summary.grossRevenue === 0
        ? 0
        : toPercent((params.snapshot.summary.noonFeeAmount / params.snapshot.summary.grossRevenue) * 100),
      params.snapshot.summary.grossRevenue === 0
        ? 0
        : toPercent(
            ((params.snapshot.summary.fixedCostsAmount + params.snapshot.summary.materialsCostAmount) /
              params.snapshot.summary.grossRevenue) *
              100
          ),
      params.snapshot.summary.trainerFeeAmount,
      params.snapshot.summary.noonFeeAmount,
      params.snapshot.summary.fixedCostsAmount,
      params.snapshot.summary.noonFeeAmount,
      params.snapshot.summary.materialsCostAmount,
      0,
      params.snapshot.finance.fixedCosts.kitchenUsageAmount,
      params.snapshot.finance.fixedCosts.workshopContentAmount,
      params.snapshot.summary.fixedCostsAmount,
      params.snapshot.summary.materialsCostAmount,
      params.snapshot.summary.trainerFeePercent,
      params.snapshot.summary.trainerFeeBaseAmount,
      params.snapshot.summary.noonFeeAmount,
      params.snapshot.summary.totalCostsAmount,
      params.snapshot.currency,
      params.trainerWalletTransactionId || null,
      params.adminShareWalletTransactionId || null,
      params.expenseBudgetWalletTransactionId || null,
      params.notes,
      params.adminUserId,
      params.status === 'CLOSED' ? new Date() : null,
    ]
  );
}

async function getOrCreateWalletForUser(db: Queryable, userId: string, currency: string) {
  let walletResult = await db.query(`SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
  let wallet = walletResult.rows[0];

  if (!wallet) {
    walletResult = await db.query(
      `INSERT INTO wallets (user_id, balance, available_balance, currency, created_at, updated_at)
       VALUES ($1, 0, 0, $2, NOW(), NOW())
       RETURNING *`,
      [userId, currency]
    );
    wallet = walletResult.rows[0];
  }

  return {
    id: String(wallet.id),
    balance: toMoney(wallet.balance),
    availableBalance: toMoney(wallet.available_balance),
    currency: String(wallet.currency || currency),
  };
}

async function creditWallet(params: {
  db: Queryable;
  userId: string;
  amount: number;
  currency: string;
  type: string;
  reason: string;
}) {
  const wallet = await getOrCreateWalletForUser(params.db, params.userId, params.currency);
  const nextBalance = toMoney(wallet.balance + params.amount);
  const nextAvailableBalance = toMoney(wallet.availableBalance + params.amount);

  await params.db.query(
    `UPDATE wallets
     SET balance = $1, available_balance = $2, updated_at = NOW()
     WHERE id = $3`,
    [nextBalance, nextAvailableBalance, wallet.id]
  );

  const result = await params.db.query(
    `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
     VALUES ($1, $2, $3, $4, 'COMPLETED')
     RETURNING id`,
    [wallet.id, params.amount, params.type, params.reason]
  );

  return {
    transactionId: result.rows[0] ? String(result.rows[0].id) : null,
    walletId: wallet.id,
    balance: nextBalance,
    availableBalance: nextAvailableBalance,
  };
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
      return {
        reasonId,
        reasonName,
        category: reasonName,
      };
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
    return {
      reasonId: null,
      reasonName: 'General',
      category: 'General',
    };
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
  if (params.amount <= 0) {
    return;
  }

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

function buildWorkshopFinanceTitle(workshopTitle: string | null | undefined, classId: string): string {
  const normalizedTitle = typeof workshopTitle === 'string' ? workshopTitle.trim() : '';
  return normalizedTitle || `Workshop ${classId}`;
}

export async function saveClassSettlementDraft(args: {
  classId: string;
  adminUserId: string;
  expenseItems: unknown;
  inventoryUsageItems?: unknown;
  notes?: unknown;
}): Promise<ClassSettlementSnapshot> {
  await ensureClassFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
  const inventoryUsageItems = sanitizeInventoryUsageItems(args.inventoryUsageItems);
  const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 4000) || null : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const financeRow = await getClassFinanceRow(args.classId, client);
    if (!financeRow) {
      throw new Error('Class not found');
    }

    if (financeRow.closedAt) {
      throw new Error('Class has already been closed');
    }

    await replaceExpenseItems({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      expenseItems,
    });

    await replaceClassInventoryUsagePlans({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      usageItems: inventoryUsageItems,
    });

    const [classFinanceSettings, participants, expenses, savedInventoryUsageItems, inventoryCatalog] = await Promise.all([
      getClassFinanceSettings(),
      getParticipantRows(args.classId, client),
      getExpenseItems(args.classId, client),
      listClassInventoryUsageItems(args.classId, client),
      listInventoryCatalog(client),
    ]);

    const snapshot = buildSettlementSnapshot({
      financeRow,
      classFinanceSettings,
      participants,
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
      classId: args.classId,
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

export async function closeClassSettlement(args: {
  classId: string;
  adminUserId: string;
  expenseItems: unknown;
  inventoryUsageItems?: unknown;
  notes?: unknown;
}): Promise<ClassSettlementSnapshot> {
  await ensureClassFinanceSchema();
  await ensureAdminFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
  const inventoryUsageItems = sanitizeInventoryUsageItems(args.inventoryUsageItems);
  const notes = typeof args.notes === 'string' ? args.notes.trim().slice(0, 4000) || null : null;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const classLockResult = await client.query(`SELECT id FROM classes WHERE id = $1 FOR UPDATE`, [args.classId]);
    if (!classLockResult.rows[0]) {
      throw new Error('Class not found');
    }

    const financeRow = await getClassFinanceRow(args.classId, client);
    if (!financeRow) {
      throw new Error('Class not found');
    }

    if (financeRow.closedAt) {
      throw new Error('Class has already been closed');
    }

    await replaceExpenseItems({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      expenseItems,
    });

    await replaceClassInventoryUsagePlans({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      usageItems: inventoryUsageItems,
    });

    const [classFinanceSettings, participants, expenses, draftInventoryUsageItems, inventoryCatalog] = await Promise.all([
      getClassFinanceSettings(),
      getParticipantRows(args.classId, client),
      getExpenseItems(args.classId, client),
      listClassInventoryUsageItems(args.classId, client),
      listInventoryCatalog(client),
    ]);

    const draftSnapshot = buildSettlementSnapshot({
      financeRow,
      classFinanceSettings,
      participants,
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

    if (draftSnapshot.summary.participantsCount === 0) {
      throw new Error('Cannot close a class with no paid participants');
    }

    if (!draftSnapshot.trainer?.id) {
      throw new Error('Trainer is missing for this class');
    }

    if (draftSnapshot.summary.noonFeeAmount < 0) {
      throw new Error('Noon fee is negative. Review fixed and material costs before closing this workshop.');
    }

    await finalizeClassInventoryUsagePlans({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
    });

    const [postedInventoryUsageItems, refreshedInventoryCatalog] = await Promise.all([
      listClassInventoryUsageItems(args.classId, client),
      listInventoryCatalog(client),
    ]);
    const snapshot = buildSettlementSnapshot({
      financeRow,
      classFinanceSettings,
      participants,
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

    if (!snapshot.trainer?.id) {
      throw new Error('Trainer is missing for this class');
    }

    if (snapshot.summary.noonFeeAmount < 0) {
      throw new Error('Noon fee is negative. Review fixed and material costs before closing this workshop.');
    }

    const settledAt = new Date().toISOString();
    const workshopFinanceTitle = buildWorkshopFinanceTitle(financeRow.title, args.classId);

    const trainerCredit =
      snapshot.summary.trainerFeeAmount > 0
        ? await creditWallet({
            db: client,
            userId: snapshot.trainer.id,
            amount: snapshot.summary.trainerFeeAmount,
            currency: snapshot.currency,
            type: 'CLASS_SETTLEMENT_TRAINER',
            reason: `Trainer payout for ${workshopFinanceTitle}`,
          })
        : { transactionId: null };

    const adminShareCredit =
      snapshot.summary.noonFeeAmount > 0
        ? await creditWallet({
            db: client,
            userId: args.adminUserId,
            amount: snapshot.summary.noonFeeAmount,
            currency: snapshot.currency,
            type: 'CLASS_SETTLEMENT_NOON_SHARE',
            reason: `Noon fee for ${workshopFinanceTitle}`,
          })
        : { transactionId: null };

    const [trainerSalaryReason, netProfitReason, inventoryMaterialsReason] = await Promise.all([
      resolveAutoFinanceReason({
        db: client,
        type: 'EXPENSE',
        preferredNames: ['Salaries', 'Other Expense'],
      }),
      resolveAutoFinanceReason({
        db: client,
        type: 'INCOME',
        preferredNames: ['Net Profit', 'Classes Revenue', 'Other Income'],
      }),
      resolveAutoFinanceReason({
        db: client,
        type: 'EXPENSE',
        preferredNames: ['Workshop Materials', 'Supplies', 'Other Expense'],
      }),
    ]);

    await insertAutoFinanceEntry({
      db: client,
      type: 'EXPENSE',
      title: workshopFinanceTitle,
      amount: snapshot.summary.trainerFeeAmount,
      currency: snapshot.currency,
      occurredAtIso: settledAt,
      createdByUserId: args.adminUserId,
      reason: trainerSalaryReason,
      counterparty: snapshot.trainer.fullName,
      notes: 'Trainer fee auto-generated from workshop close settlement.',
      metadata: {
        source: 'CLASS_SETTLEMENT_CLOSE',
        classId: args.classId,
        component: 'TRAINER_FEE',
        trainerUserId: snapshot.trainer.id,
      },
    });

    await insertAutoFinanceEntry({
      db: client,
      type: 'INCOME',
      title: workshopFinanceTitle,
      amount: snapshot.summary.noonFeeAmount,
      currency: snapshot.currency,
      occurredAtIso: settledAt,
      createdByUserId: args.adminUserId,
      reason: netProfitReason,
      counterparty: 'Noon',
      notes: 'Noon fee auto-generated from workshop close settlement.',
      metadata: {
        source: 'CLASS_SETTLEMENT_CLOSE',
        classId: args.classId,
        component: 'NOON_NET_PROFIT',
      },
    });

    for (const expense of expenses) {
      if (expense.amount <= 0) {
        continue;
      }

      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: workshopFinanceTitle,
        amount: expense.amount,
        currency: snapshot.currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: inventoryMaterialsReason,
        notes: expense.notes
          ? `Material cost: ${expense.title}. ${expense.notes}`
          : `Material cost: ${expense.title}.`,
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'MANUAL_MATERIAL_COST',
          expenseItemId: expense.id,
          expenseTitle: expense.title,
        },
      });
    }

    for (const usageItem of postedInventoryUsageItems) {
      if (usageItem.status !== 'POSTED' || usageItem.totalCost <= 0) {
        continue;
      }

      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: workshopFinanceTitle,
        amount: usageItem.totalCost,
        currency: snapshot.currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: inventoryMaterialsReason,
        notes: `Inventory material usage: ${usageItem.itemName} (${usageItem.quantity.toFixed(3)} ${usageItem.itemUnit}).`,
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'INVENTORY_MATERIAL_USAGE',
          inventoryUsageId: usageItem.id,
          inventoryItemId: usageItem.inventoryItemId,
          quantity: usageItem.quantity,
          unitCost: usageItem.unitCost,
        },
      });
    }

    await upsertSettlementRow({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      snapshot,
      notes,
      status: 'CLOSED',
      trainerWalletTransactionId: trainerCredit.transactionId,
      adminShareWalletTransactionId: adminShareCredit.transactionId,
      expenseBudgetWalletTransactionId: null,
    });

    await client.query(
      `UPDATE classes
       SET status = 'COMPLETED',
           closed_at = NOW(),
           closed_by_user_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [args.classId, args.adminUserId]
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

/**
 * Reprocess wallet credits for a closed settlement that may have been closed
 * before the wallet-credit code was deployed. Safe to call repeatedly — it only
 * credits wallets when the settlement row has NULL transaction IDs.
 */
export async function reprocessSettlementWalletCredits(args: {
  classId: string;
  adminUserId: string;
}): Promise<{ trainerCredited: boolean; adminCredited: boolean; trainerAmount: number; adminAmount: number; trainerExpenseCreated: boolean; noonIncomeCreated: boolean }> {
  await ensureClassFinanceSchema();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settlementResult = await client.query(
      `SELECT cs.*, c.trainer_id, c.currency, c.title, u.full_name AS trainer_name
       FROM class_settlements cs
       JOIN classes c ON c.id = cs.class_id
       LEFT JOIN users u ON u.id = c.trainer_id
       WHERE cs.class_id = $1
       FOR UPDATE`,
      [args.classId]
    );

    const row = settlementResult.rows[0];
    if (!row) {
      throw new Error('Settlement not found for this class');
    }

    if (String(row.status) !== 'CLOSED') {
      throw new Error('Settlement is not closed yet');
    }

    const trainerId = row.trainer_id ? String(row.trainer_id) : null;
    const workshopFinanceTitle = buildWorkshopFinanceTitle(
      typeof row.title === 'string' ? row.title : null,
      args.classId
    );
    const currency = String(row.currency || 'OMR');
    const trainerPayoutAmount = toMoney(row.trainer_payout_amount);
    const noonFeeAmount = toMoney(row.noon_fee_amount);

    let trainerCredited = false;
    let adminCredited = false;
    let trainerWalletTransactionId = row.trainer_wallet_transaction_id ? String(row.trainer_wallet_transaction_id) : null;
    let adminShareWalletTransactionId = row.admin_share_wallet_transaction_id ? String(row.admin_share_wallet_transaction_id) : null;

    if (!trainerWalletTransactionId && trainerId && trainerPayoutAmount > 0) {
      const credit = await creditWallet({
        db: client,
        userId: trainerId,
        amount: trainerPayoutAmount,
        currency,
        type: 'CLASS_SETTLEMENT_TRAINER',
        reason: `Trainer payout for ${workshopFinanceTitle} (reprocessed)`,
      });
      trainerWalletTransactionId = credit.transactionId;
      trainerCredited = true;
    }

    if (!adminShareWalletTransactionId && noonFeeAmount > 0) {
      const credit = await creditWallet({
        db: client,
        userId: args.adminUserId,
        amount: noonFeeAmount,
        currency,
        type: 'CLASS_SETTLEMENT_NOON_SHARE',
        reason: `Noon fee for ${workshopFinanceTitle} (reprocessed)`,
      });
      adminShareWalletTransactionId = credit.transactionId;
      adminCredited = true;
    }

    // --- Also reprocess missing finance entries ---
    const settledAt = row.settled_at ? new Date(row.settled_at).toISOString() : new Date().toISOString();
    const trainerName = row.trainer_name ? String(row.trainer_name) : 'Trainer';

    const [manualExpenses, inventoryUsageItems, inventoryMaterialsReason] = await Promise.all([
      getExpenseItems(args.classId, client),
      listClassInventoryUsageItems(args.classId, client),
      resolveAutoFinanceReason({
        db: client,
        type: 'EXPENSE',
        preferredNames: ['Workshop Materials', 'Supplies', 'Other Expense'],
      }),
    ]);

    // Check if finance entries already exist for this class from a previous close
    const existingEntries = await client.query(
      `SELECT entry_type,
              metadata->>'component' AS component,
              metadata->>'expenseItemId' AS expense_item_id,
              metadata->>'inventoryUsageId' AS inventory_usage_id
       FROM admin_finance_entries
       WHERE metadata->>'source' = 'CLASS_SETTLEMENT_CLOSE'
         AND metadata->>'classId' = $1`,
      [args.classId]
    );
    const existingComponents = new Set(existingEntries.rows.map((r: Record<string, unknown>) => String(r.component)));
    const existingManualExpenseIds = new Set(
      existingEntries.rows
        .map((r: Record<string, unknown>) => (r.expense_item_id ? String(r.expense_item_id) : null))
        .filter((value): value is string => Boolean(value))
    );
    const existingInventoryUsageIds = new Set(
      existingEntries.rows
        .map((r: Record<string, unknown>) => (r.inventory_usage_id ? String(r.inventory_usage_id) : null))
        .filter((value): value is string => Boolean(value))
    );

    let trainerExpenseCreated = false;
    let noonIncomeCreated = false;

    // Create trainer salary expense if missing
    if (!existingComponents.has('TRAINER_FEE') && trainerPayoutAmount > 0) {
      const trainerSalaryReason = await resolveAutoFinanceReason({
        db: client,
        type: 'EXPENSE',
        preferredNames: ['Salaries', 'Other Expense'],
      });
      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: workshopFinanceTitle,
        amount: trainerPayoutAmount,
        currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: trainerSalaryReason,
        counterparty: trainerName,
        notes: 'Trainer fee auto-generated from settlement reprocess.',
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'TRAINER_FEE',
          trainerUserId: trainerId,
        },
      });
      trainerExpenseCreated = true;
    }

    // Create Noon net profit income if missing
    if (!existingComponents.has('NOON_NET_PROFIT') && noonFeeAmount > 0) {
      const netProfitReason = await resolveAutoFinanceReason({
        db: client,
        type: 'INCOME',
        preferredNames: ['Net Profit', 'Classes Revenue', 'Other Income'],
      });
      await insertAutoFinanceEntry({
        db: client,
        type: 'INCOME',
        title: workshopFinanceTitle,
        amount: noonFeeAmount,
        currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: netProfitReason,
        counterparty: 'Noon',
        notes: 'Noon fee auto-generated from settlement reprocess.',
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'NOON_NET_PROFIT',
        },
      });
      noonIncomeCreated = true;
    }

    for (const expense of manualExpenses) {
      if (expense.amount <= 0 || existingManualExpenseIds.has(expense.id)) {
        continue;
      }

      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: workshopFinanceTitle,
        amount: expense.amount,
        currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: inventoryMaterialsReason,
        notes: expense.notes
          ? `Material cost: ${expense.title}. ${expense.notes}`
          : `Material cost: ${expense.title}.`,
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'MANUAL_MATERIAL_COST',
          expenseItemId: expense.id,
          expenseTitle: expense.title,
        },
      });
    }

    for (const usageItem of inventoryUsageItems) {
      if (usageItem.status !== 'POSTED' || usageItem.totalCost <= 0 || existingInventoryUsageIds.has(usageItem.id)) {
        continue;
      }

      await insertAutoFinanceEntry({
        db: client,
        type: 'EXPENSE',
        title: workshopFinanceTitle,
        amount: usageItem.totalCost,
        currency,
        occurredAtIso: settledAt,
        createdByUserId: args.adminUserId,
        reason: inventoryMaterialsReason,
        notes: `Inventory material usage: ${usageItem.itemName} (${usageItem.quantity.toFixed(3)} ${usageItem.itemUnit}).`,
        metadata: {
          source: 'CLASS_SETTLEMENT_CLOSE',
          classId: args.classId,
          component: 'INVENTORY_MATERIAL_USAGE',
          inventoryUsageId: usageItem.id,
          inventoryItemId: usageItem.inventoryItemId,
          quantity: usageItem.quantity,
          unitCost: usageItem.unitCost,
        },
      });
    }

    if (trainerCredited || adminCredited) {
      await client.query(
        `UPDATE class_settlements
         SET trainer_wallet_transaction_id = COALESCE($1, trainer_wallet_transaction_id),
             admin_share_wallet_transaction_id = COALESCE($2, admin_share_wallet_transaction_id),
             updated_at = NOW()
         WHERE class_id = $3`,
        [trainerWalletTransactionId, adminShareWalletTransactionId, args.classId]
      );
    }

    await client.query('COMMIT');
    return {
      trainerCredited,
      adminCredited,
      trainerAmount: trainerCredited ? trainerPayoutAmount : 0,
      adminAmount: adminCredited ? noonFeeAmount : 0,
      trainerExpenseCreated,
      noonIncomeCreated,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reverseSettlementWalletCredit(params: {
  db: Queryable;
  transactionId: string | null;
  insufficientFundsMessage: string;
}): Promise<boolean> {
  if (!params.transactionId) {
    return false;
  }

  const result = await params.db.query(
    `SELECT wt.id,
            wt.wallet_id,
            ABS(wt.amount) AS amount,
            w.balance,
            w.available_balance
     FROM wallet_transactions wt
     INNER JOIN wallets w ON w.id = wt.wallet_id
     WHERE wt.id = $1
     FOR UPDATE OF wt, w`,
    [params.transactionId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const row = result.rows[0];
  const amount = toMoney(row.amount);
  const balance = toMoney(row.balance);
  const availableBalance = toMoney(row.available_balance);

  if (balance < amount || availableBalance < amount) {
    throw new Error(params.insufficientFundsMessage);
  }

  await params.db.query(
    `UPDATE wallets
     SET balance = $1,
         available_balance = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [toMoney(balance - amount), toMoney(availableBalance - amount), String(row.wallet_id)]
  );

  await params.db.query(`DELETE FROM wallet_transactions WHERE id = $1`, [params.transactionId]);
  return true;
}

export async function cleanupClosedClassSettlement(args: {
  classId: string;
}): Promise<{
  trainerWalletCreditReversed: boolean;
  adminWalletCreditReversed: boolean;
  deletedFinanceEntries: number;
  restoredInventoryLines: number;
}> {
  await ensureClassFinanceSchema();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settlementResult = await client.query(
      `SELECT status,
              trainer_wallet_transaction_id,
              admin_share_wallet_transaction_id
       FROM class_settlements
       WHERE class_id = $1
       FOR UPDATE`,
      [args.classId]
    );

    const settlementRow = settlementResult.rows[0] ?? null;

    if (settlementRow?.status === 'CLOSED') {
      await reverseSettlementWalletCredit({
        db: client,
        transactionId: settlementRow.trainer_wallet_transaction_id
          ? String(settlementRow.trainer_wallet_transaction_id)
          : null,
        insufficientFundsMessage: 'Cannot delete this closed workshop because the trainer fee was already used from the wallet.',
      });

      await reverseSettlementWalletCredit({
        db: client,
        transactionId: settlementRow.admin_share_wallet_transaction_id
          ? String(settlementRow.admin_share_wallet_transaction_id)
          : null,
        insufficientFundsMessage: 'Cannot delete this closed workshop because the Noon share was already used from the wallet.',
      });
    }

    const financeDeleteResult = await client.query(
      `DELETE FROM admin_finance_entries
       WHERE metadata->>'source' = 'CLASS_SETTLEMENT_CLOSE'
         AND metadata->>'classId' = $1`,
      [args.classId]
    );

    const usageResult = await client.query(
      `SELECT inventory_item_id, quantity, total_cost, posted_movement_id
       FROM class_inventory_usages
       WHERE class_id = $1
         AND status = 'POSTED'
       FOR UPDATE`,
      [args.classId]
    );

    for (const usageRow of usageResult.rows) {
      const inventoryItemId = String(usageRow.inventory_item_id);
      const quantity = toMoney(usageRow.quantity);
      const totalCost = toMoney(usageRow.total_cost);

      const itemResult = await client.query(
        `SELECT current_stock, total_consumed_cost
         FROM inventory_items
         WHERE id = $1
         FOR UPDATE`,
        [inventoryItemId]
      );

      if (itemResult.rows[0]) {
        const currentStock = toMoney(itemResult.rows[0].current_stock);
        const totalConsumedCost = toMoney(itemResult.rows[0].total_consumed_cost);

        await client.query(
          `UPDATE inventory_items
           SET current_stock = $1,
               total_consumed_cost = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [
            toMoney(currentStock + quantity),
            Math.max(0, toMoney(totalConsumedCost - totalCost)),
            inventoryItemId,
          ]
        );
      }

      if (usageRow.posted_movement_id) {
        await client.query(`DELETE FROM inventory_movements WHERE id = $1`, [String(usageRow.posted_movement_id)]);
      }
    }

    await client.query('COMMIT');
    return {
      trainerWalletCreditReversed: Boolean(settlementRow?.trainer_wallet_transaction_id),
      adminWalletCreditReversed: Boolean(settlementRow?.admin_share_wallet_transaction_id),
      deletedFinanceEntries: financeDeleteResult.rowCount ?? 0,
      restoredInventoryLines: usageResult.rowCount ?? 0,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
