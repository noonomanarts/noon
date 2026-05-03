import { query } from './pool';

export type AdminFinanceEntryType = 'INCOME' | 'EXPENSE';

export type AdminFinanceEntry = {
  id: string;
  type: AdminFinanceEntryType;
  title: string;
  category: string;
  reasonId: string | null;
  reasonName: string | null;
  reasonIsActive: boolean | null;
  amount: number;
  currency: string;
  occurredAt: string;
  paymentMethod: string | null;
  reference: string | null;
  counterparty: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdByUserName: string | null;
  updatedByUserId: string | null;
  updatedByUserName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFinanceReason = {
  id: string;
  type: AdminFinanceEntryType;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  isSystem: boolean;
  createdByUserId: string | null;
  createdByUserName: string | null;
  updatedByUserId: string | null;
  updatedByUserName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminFinanceSettings = {
  defaultCurrency: string;
  requireReasonSelection: boolean;
  allowCustomReason: boolean;
  updatedByUserId: string | null;
  updatedByUserName: string | null;
  updatedAt: string;
};

export type AdminFinanceEntryCreateInput = {
  type: AdminFinanceEntryType;
  title: string;
  category?: string | null;
  reasonId?: string | null;
  amount: number;
  currency?: string | null;
  occurredAt?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  counterparty?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdByUserId: string;
};

export type AdminFinanceEntryUpdateInput = {
  type?: AdminFinanceEntryType;
  title?: string;
  category?: string | null;
  reasonId?: string | null;
  amount?: number;
  currency?: string | null;
  occurredAt?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  counterparty?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  updatedByUserId: string;
};

export type AdminFinanceReasonCreateInput = {
  type: AdminFinanceEntryType;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdByUserId: string;
};

export type AdminFinanceReasonUpdateInput = {
  type?: AdminFinanceEntryType;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  updatedByUserId: string;
};

export type AdminFinanceSettingsUpdateInput = {
  defaultCurrency?: string;
  requireReasonSelection?: boolean;
  allowCustomReason?: boolean;
  updatedByUserId: string;
};

export type AdminFinanceReasonFilters = {
  type?: AdminFinanceEntryType | 'ALL';
  includeInactive?: boolean;
  search?: string;
};

export type AdminFinanceListFilters = {
  type?: AdminFinanceEntryType | 'ALL';
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type AdminFinanceSummary = {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  entriesCount: number;
  incomeCount: number;
  expenseCount: number;
};

export type AdminFinanceCategoryBreakdown = {
  category: string;
  income: number;
  expense: number;
  net: number;
  entriesCount: number;
};

export type AdminFinanceMonthlyBreakdown = {
  month: string;
  income: number;
  expense: number;
  net: number;
  entriesCount: number;
};

export type AdminFinanceReport = {
  summary: AdminFinanceSummary;
  byCategory: AdminFinanceCategoryBreakdown[];
  monthly: AdminFinanceMonthlyBreakdown[];
  recentEntries: AdminFinanceEntry[];
};

let adminFinanceSchemaReady: Promise<void> | null = null;

function toMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function toInteger(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? Math.trunc(value) : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true' || value === 't' || value === '1') return true;
    if (value === 'false' || value === 'f' || value === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeCurrency(value: unknown): string {
  const code = sanitizeText(value, 10);
  return (code ?? 'OMR').toUpperCase();
}

function normalizeType(value: unknown): AdminFinanceEntryType {
  if (value === 'INCOME' || value === 'EXPENSE') {
    return value;
  }
  throw new Error('Invalid finance entry type. Use INCOME or EXPENSE.');
}

function normalizeOccurredAt(value: unknown): Date {
  if (!value) return new Date();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid occurredAt date.');
  }
  return parsed;
}

function sanitizeReasonId(value: unknown): string | null {
  const normalized = sanitizeText(value, 64);
  if (!normalized) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(normalized)) {
    throw new Error('Invalid reason id.');
  }
  return normalized;
}

function mapFinanceEntryRow(row: Record<string, unknown>): AdminFinanceEntry {
  const reasonName = row.reason_name ? String(row.reason_name) : row.category ? String(row.category) : null;

  return {
    id: String(row.id),
    type: String(row.entry_type) as AdminFinanceEntryType,
    title: String(row.title),
    category: String(row.category || 'General'),
    reasonId: row.reason_id ? String(row.reason_id) : null,
    reasonName,
    reasonIsActive: row.reason_is_active === undefined || row.reason_is_active === null ? null : toBoolean(row.reason_is_active),
    amount: toMoney(row.amount),
    currency: String(row.currency || 'OMR'),
    occurredAt: String(row.occurred_at),
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    reference: row.reference ? String(row.reference) : null,
    counterparty: row.counterparty ? String(row.counterparty) : null,
    notes: row.notes ? String(row.notes) : null,
    metadata: row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {},
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdByUserName: row.created_by_user_name ? String(row.created_by_user_name) : null,
    updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
    updatedByUserName: row.updated_by_user_name ? String(row.updated_by_user_name) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapFinanceReasonRow(row: Record<string, unknown>): AdminFinanceReason {
  return {
    id: String(row.id),
    type: String(row.entry_type) as AdminFinanceEntryType,
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    isActive: toBoolean(row.is_active, true),
    sortOrder: toInteger(row.sort_order, 0),
    isSystem: toBoolean(row.is_system, false),
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdByUserName: row.created_by_user_name ? String(row.created_by_user_name) : null,
    updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
    updatedByUserName: row.updated_by_user_name ? String(row.updated_by_user_name) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapFinanceSettingsRow(row: Record<string, unknown>): AdminFinanceSettings {
  return {
    defaultCurrency: String(row.default_currency || 'OMR'),
    requireReasonSelection: toBoolean(row.require_reason_selection, false),
    allowCustomReason: toBoolean(row.allow_custom_reason, false),
    updatedByUserId: row.updated_by_user_id ? String(row.updated_by_user_id) : null,
    updatedByUserName: row.updated_by_user_name ? String(row.updated_by_user_name) : null,
    updatedAt: String(row.updated_at),
  };
}

function sanitizeCreateInput(input: AdminFinanceEntryCreateInput) {
  const title = sanitizeText(input.title, 200);
  if (!title) {
    throw new Error('Title is required.');
  }

  const amount = toMoney(input.amount);
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  return {
    type: normalizeType(input.type),
    title,
    category: sanitizeText(input.category, 120),
    reasonId: sanitizeReasonId(input.reasonId),
    amount,
    currency: normalizeCurrency(input.currency),
    occurredAt: normalizeOccurredAt(input.occurredAt),
    paymentMethod: sanitizeText(input.paymentMethod, 80),
    reference: sanitizeText(input.reference, 120),
    counterparty: sanitizeText(input.counterparty, 160),
    notes: sanitizeText(input.notes, 4000),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
}

function sanitizeUpdateInput(input: AdminFinanceEntryUpdateInput) {
  const patch: Record<string, unknown> = {};

  if (input.type !== undefined) {
    patch.entry_type = normalizeType(input.type);
  }

  if (input.title !== undefined) {
    const title = sanitizeText(input.title, 200);
    if (!title) throw new Error('Title cannot be empty.');
    patch.title = title;
  }

  if (input.amount !== undefined) {
    const amount = toMoney(input.amount);
    if (amount <= 0) throw new Error('Amount must be greater than zero.');
    patch.amount = amount;
  }

  if (input.currency !== undefined) {
    patch.currency = normalizeCurrency(input.currency);
  }

  if (input.occurredAt !== undefined) {
    patch.occurred_at = normalizeOccurredAt(input.occurredAt);
  }

  if (input.paymentMethod !== undefined) {
    patch.payment_method = sanitizeText(input.paymentMethod, 80);
  }

  if (input.reference !== undefined) {
    patch.reference = sanitizeText(input.reference, 120);
  }

  if (input.counterparty !== undefined) {
    patch.counterparty = sanitizeText(input.counterparty, 160);
  }

  if (input.notes !== undefined) {
    patch.notes = sanitizeText(input.notes, 4000);
  }

  if (input.metadata !== undefined) {
    patch.metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  }

  if (input.category !== undefined) {
    patch.category = sanitizeText(input.category, 120);
  }

  if (input.reasonId !== undefined) {
    patch.reason_id = sanitizeReasonId(input.reasonId);
  }

  return patch;
}

function sanitizeReasonCreateInput(input: AdminFinanceReasonCreateInput) {
  const name = sanitizeText(input.name, 120);
  if (!name) {
    throw new Error('Reason name is required.');
  }

  return {
    type: normalizeType(input.type),
    name,
    description: sanitizeText(input.description, 500),
    sortOrder: toInteger(input.sortOrder, 0),
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
  };
}

function sanitizeReasonUpdateInput(input: AdminFinanceReasonUpdateInput) {
  const patch: Record<string, unknown> = {};

  if (input.type !== undefined) {
    patch.entry_type = normalizeType(input.type);
  }

  if (input.name !== undefined) {
    const name = sanitizeText(input.name, 120);
    if (!name) throw new Error('Reason name cannot be empty.');
    patch.name = name;
  }

  if (input.description !== undefined) {
    patch.description = sanitizeText(input.description, 500);
  }

  if (input.sortOrder !== undefined) {
    patch.sort_order = toInteger(input.sortOrder, 0);
  }

  if (input.isActive !== undefined) {
    patch.is_active = Boolean(input.isActive);
  }

  return patch;
}

function sanitizeSettingsUpdateInput(input: AdminFinanceSettingsUpdateInput) {
  const patch: Record<string, unknown> = {};

  if (input.defaultCurrency !== undefined) {
    patch.default_currency = normalizeCurrency(input.defaultCurrency);
  }

  if (input.requireReasonSelection !== undefined) {
    patch.require_reason_selection = Boolean(input.requireReasonSelection);
  }

  if (input.allowCustomReason !== undefined) {
    patch.allow_custom_reason = Boolean(input.allowCustomReason);
  }

  return patch;
}

function buildFinanceWhereClause(
  filters: Pick<AdminFinanceListFilters, 'type' | 'search' | 'category' | 'startDate' | 'endDate'>,
  alias: string
): { whereSql: string; params: unknown[] } {
  const clauses: string[] = [`${alias}.is_archived = FALSE`];
  const params: unknown[] = [];

  if (filters.type && filters.type !== 'ALL') {
    params.push(filters.type);
    clauses.push(`${alias}.entry_type = $${params.length}`);
  }

  const category = sanitizeText(filters.category, 120);
  if (category) {
    params.push(category);
    clauses.push(`(
      ${alias}.category = $${params.length}
      OR COALESCE(${alias}.reason_name, '') = $${params.length}
    )`);
  }

  const search = sanitizeText(filters.search, 200);
  if (search) {
    params.push(`%${search}%`);
    const token = `$${params.length}`;
    clauses.push(`(
      ${alias}.title ILIKE ${token}
      OR ${alias}.category ILIKE ${token}
      OR COALESCE(${alias}.reason_name, '') ILIKE ${token}
      OR COALESCE(${alias}.payment_method, '') ILIKE ${token}
      OR COALESCE(${alias}.reference, '') ILIKE ${token}
      OR COALESCE(${alias}.counterparty, '') ILIKE ${token}
      OR COALESCE(${alias}.notes, '') ILIKE ${token}
    )`);
  }

  if (filters.startDate) {
    const parsed = new Date(filters.startDate);
    if (!Number.isNaN(parsed.getTime())) {
      params.push(parsed.toISOString());
      clauses.push(`${alias}.occurred_at >= $${params.length}`);
    }
  }

  if (filters.endDate) {
    const parsed = new Date(filters.endDate);
    if (!Number.isNaN(parsed.getTime())) {
      params.push(parsed.toISOString());
      clauses.push(`${alias}.occurred_at <= $${params.length}`);
    }
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function seedDefaultReasons() {
  await query(`
    INSERT INTO admin_finance_reasons (entry_type, name, description, sort_order, is_active, is_system)
    VALUES
      ('INCOME', 'Classes Revenue', 'Income from classes and workshops', 10, TRUE, TRUE),
      ('INCOME', 'Net Profit', 'Net workshop profit retained by Noon', 15, TRUE, TRUE),
      ('INCOME', 'Events Revenue', 'Income from private events and bookings', 20, TRUE, TRUE),
      ('INCOME', 'Shop Sales', 'Income from product sales', 30, TRUE, TRUE),
      ('INCOME', 'Other Income', 'Other income sources', 999, TRUE, TRUE),
      ('EXPENSE', 'Salaries', 'Team and trainer payments', 10, TRUE, TRUE),
      ('EXPENSE', 'Rent & Utilities', 'Rent, electricity, internet and utilities', 20, TRUE, TRUE),
      ('EXPENSE', 'Supplies', 'Class and operations supplies', 30, TRUE, TRUE),
      ('EXPENSE', 'Cost of Goods Sold', 'Product cost recognized when shop inventory is sold', 32, TRUE, TRUE),
      ('EXPENSE', 'Workshop Materials', 'Inventory materials consumed by workshop execution', 35, TRUE, TRUE),
      ('EXPENSE', 'Marketing', 'Marketing and advertising costs', 40, TRUE, TRUE),
      ('EXPENSE', 'Other Expense', 'Other expenses', 999, TRUE, TRUE)
    ON CONFLICT (entry_type, name) DO NOTHING
  `);
}

async function resolveAutoFinanceReason(params: {
  db: { query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> };
  type: AdminFinanceEntryType;
  preferredNames: string[];
  fallbackName: string;
}): Promise<{ reasonId: string | null; reasonName: string; category: string }> {
  const preferredNames = params.preferredNames.filter((value) => value.trim().length > 0);

  if (preferredNames.length > 0) {
    const preferredResult = await params.db.query(
      `SELECT id, name
       FROM admin_finance_reasons
       WHERE entry_type = $1
         AND is_archived = FALSE
         AND name = ANY($2::text[])
       ORDER BY CASE WHEN is_active THEN 0 ELSE 1 END,
                array_position($2::text[], name),
                sort_order ASC
       LIMIT 1`,
      [params.type, preferredNames]
    );

    const preferredRow = preferredResult.rows[0];
    if (preferredRow) {
      const reasonName = String(preferredRow.name || params.fallbackName);
      return {
        reasonId: preferredRow.id ? String(preferredRow.id) : null,
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
      reasonName: params.fallbackName,
      category: params.fallbackName,
    };
  }

  const reasonName = String(fallbackRow.name || params.fallbackName);
  return {
    reasonId: fallbackRow.id ? String(fallbackRow.id) : null,
    reasonName,
    category: reasonName,
  };
}

async function insertAutoFinanceEntry(params: {
  db: { query: (sql: string, values?: unknown[]) => Promise<unknown> };
  type: AdminFinanceEntryType;
  title: string;
  amount: number;
  currency: string;
  occurredAt: Date;
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
       entry_type, title, category, reason_id, reason_name,
       amount, currency, occurred_at, counterparty, notes, metadata,
       created_by_user_id, updated_by_user_id, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10, $11,
       NULL, NULL, NOW(), NOW()
     )`,
    [
      params.type,
      params.title,
      params.reason.category,
      params.reason.reasonId,
      params.reason.reasonName,
      params.amount,
      params.currency,
      params.occurredAt.toISOString(),
      params.counterparty || null,
      params.notes || null,
      params.metadata ?? {},
    ]
  );
}

export async function ensureAdminFinanceSchema(): Promise<void> {
  if (adminFinanceSchemaReady) {
    return adminFinanceSchemaReady;
  }

  adminFinanceSchemaReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_finance_reasons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entry_type VARCHAR(10) NOT NULL,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(500),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(entry_type, name)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_finance_settings (
        id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
        default_currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
        require_reason_selection BOOLEAN NOT NULL DEFAULT TRUE,
        allow_custom_reason BOOLEAN NOT NULL DEFAULT FALSE,
        updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_finance_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        entry_type VARCHAR(10) NOT NULL,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(120) NOT NULL DEFAULT 'General',
        reason_id UUID,
        reason_name VARCHAR(120),
        amount DECIMAL(12, 3) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
        occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        payment_method VARCHAR(80),
        reference VARCHAR(120),
        counterparty VARCHAR(160),
        notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS entry_type VARCHAR(10)`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS name VARCHAR(120)`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS description VARCHAR(500)`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
    await query(`ALTER TABLE admin_finance_reasons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);

    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10) NOT NULL DEFAULT 'OMR'`);
    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS require_reason_selection BOOLEAN NOT NULL DEFAULT TRUE`);
    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS allow_custom_reason BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
    await query(`ALTER TABLE admin_finance_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);

    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS entry_type VARCHAR(10)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS title VARCHAR(200)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT 'General'`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reason_id UUID`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reason_name VARCHAR(120)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 3)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'OMR'`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS reference VARCHAR(120)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS counterparty VARCHAR(160)`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS notes TEXT`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
    await query(`ALTER TABLE admin_finance_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);

    await query(`UPDATE admin_finance_entries SET metadata = '{}'::jsonb WHERE metadata IS NULL`);
    await query(`ALTER TABLE admin_finance_entries ALTER COLUMN metadata SET DEFAULT '{}'::jsonb`);
    await query(`ALTER TABLE admin_finance_entries ALTER COLUMN metadata SET NOT NULL`);
    await query(`ALTER TABLE admin_finance_entries ALTER COLUMN category SET DEFAULT 'General'`);
    await query(`ALTER TABLE admin_finance_entries ALTER COLUMN currency SET DEFAULT 'OMR'`);

    await query(`ALTER TABLE admin_finance_reasons DROP CONSTRAINT IF EXISTS admin_finance_reasons_entry_type_check`);
    await query(`ALTER TABLE admin_finance_reasons ADD CONSTRAINT admin_finance_reasons_entry_type_check CHECK (entry_type IN ('INCOME', 'EXPENSE'))`);

    await query(`ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_entry_type_check`);
    await query(`ALTER TABLE admin_finance_entries ADD CONSTRAINT admin_finance_entries_entry_type_check CHECK (entry_type IN ('INCOME', 'EXPENSE'))`);

    await query(`ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_amount_check`);
    await query(`ALTER TABLE admin_finance_entries ADD CONSTRAINT admin_finance_entries_amount_check CHECK (amount > 0)`);

    await query(`ALTER TABLE admin_finance_entries DROP CONSTRAINT IF EXISTS admin_finance_entries_reason_id_fkey`);
    await query(`ALTER TABLE admin_finance_entries ADD CONSTRAINT admin_finance_entries_reason_id_fkey FOREIGN KEY(reason_id) REFERENCES admin_finance_reasons(id) ON DELETE SET NULL`);

    await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_finance_reasons_type_name ON admin_finance_reasons(entry_type, name)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_type ON admin_finance_reasons(entry_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_active ON admin_finance_reasons(is_active, is_archived)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_reasons_sort_order ON admin_finance_reasons(entry_type, sort_order, name)`);

    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_occurred_at ON admin_finance_entries(occurred_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_entry_type ON admin_finance_entries(entry_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_category ON admin_finance_entries(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_reason_id ON admin_finance_entries(reason_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_created_by ON admin_finance_entries(created_by_user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_finance_entries_is_archived ON admin_finance_entries(is_archived)`);

    await query(`
      INSERT INTO admin_finance_settings (id, default_currency, require_reason_selection, allow_custom_reason)
      VALUES (TRUE, 'OMR', TRUE, FALSE)
      ON CONFLICT (id) DO NOTHING
    `);

    await seedDefaultReasons();
  })().catch((error) => {
    adminFinanceSchemaReady = null;
    throw error;
  });

  return adminFinanceSchemaReady;
}

export async function getAdminFinanceSettings(): Promise<AdminFinanceSettings> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `SELECT s.*, updater.full_name AS updated_by_user_name
     FROM admin_finance_settings s
     LEFT JOIN users updater ON updater.id = s.updated_by_user_id
     WHERE s.id = TRUE
     LIMIT 1`
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    await query(`INSERT INTO admin_finance_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING`);
    return getAdminFinanceSettings();
  }

  return mapFinanceSettingsRow(row);
}

export async function updateAdminFinanceSettings(input: AdminFinanceSettingsUpdateInput): Promise<AdminFinanceSettings> {
  await ensureAdminFinanceSchema();

  const patch = sanitizeSettingsUpdateInput(input);
  const keys = Object.keys(patch);

  if (keys.length === 0) {
    throw new Error('No settings changes provided.');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];

  keys.forEach((key) => {
    params.push(patch[key]);
    setClauses.push(`${key} = $${params.length}`);
  });

  params.push(input.updatedByUserId);
  setClauses.push(`updated_by_user_id = $${params.length}`);
  setClauses.push('updated_at = NOW()');

  await query(
    `UPDATE admin_finance_settings
     SET ${setClauses.join(', ')}
     WHERE id = TRUE`,
    params
  );

  return getAdminFinanceSettings();
}

export async function listAdminFinanceReasons(filters: AdminFinanceReasonFilters = {}): Promise<AdminFinanceReason[]> {
  await ensureAdminFinanceSchema();

  const params: unknown[] = [];
  const clauses: string[] = ['fr.is_archived = FALSE'];

  if (!filters.includeInactive) {
    clauses.push('fr.is_active = TRUE');
  }

  if (filters.type && filters.type !== 'ALL') {
    params.push(filters.type);
    clauses.push(`fr.entry_type = $${params.length}`);
  }

  const search = sanitizeText(filters.search, 120);
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(fr.name ILIKE $${params.length} OR COALESCE(fr.description, '') ILIKE $${params.length})`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await query(
    `SELECT fr.*, creator.full_name AS created_by_user_name, updater.full_name AS updated_by_user_name
     FROM admin_finance_reasons fr
     LEFT JOIN users creator ON creator.id = fr.created_by_user_id
     LEFT JOIN users updater ON updater.id = fr.updated_by_user_id
     ${whereSql}
     ORDER BY fr.entry_type ASC, fr.sort_order ASC, fr.name ASC`,
    params
  );

  return result.rows.map((row) => mapFinanceReasonRow(row as Record<string, unknown>));
}

export async function getAdminFinanceReasonById(reasonId: string): Promise<AdminFinanceReason | null> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `SELECT fr.*, creator.full_name AS created_by_user_name, updater.full_name AS updated_by_user_name
     FROM admin_finance_reasons fr
     LEFT JOIN users creator ON creator.id = fr.created_by_user_id
     LEFT JOIN users updater ON updater.id = fr.updated_by_user_id
     WHERE fr.id = $1 AND fr.is_archived = FALSE
     LIMIT 1`,
    [reasonId]
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return mapFinanceReasonRow(row);
}

export async function createAdminFinanceReason(input: AdminFinanceReasonCreateInput): Promise<AdminFinanceReason> {
  await ensureAdminFinanceSchema();

  const normalized = sanitizeReasonCreateInput(input);

  const result = await query(
    `INSERT INTO admin_finance_reasons (
      entry_type,
      name,
      description,
      sort_order,
      is_active,
      created_by_user_id,
      updated_by_user_id,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $6, NOW(), NOW())
    RETURNING id`,
    [
      normalized.type,
      normalized.name,
      normalized.description,
      normalized.sortOrder,
      normalized.isActive,
      input.createdByUserId,
    ]
  );

  const createdId = result.rows[0]?.id;
  if (!createdId) {
    throw new Error('Failed to create finance reason.');
  }

  const reason = await getAdminFinanceReasonById(String(createdId));
  if (!reason) {
    throw new Error('Failed to load created finance reason.');
  }

  return reason;
}

export async function updateAdminFinanceReason(reasonId: string, input: AdminFinanceReasonUpdateInput): Promise<AdminFinanceReason | null> {
  await ensureAdminFinanceSchema();

  const patch = sanitizeReasonUpdateInput(input);
  const keys = Object.keys(patch);

  if (keys.length === 0) {
    throw new Error('No changes provided.');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];

  keys.forEach((key) => {
    params.push(patch[key]);
    setClauses.push(`${key} = $${params.length}`);
  });

  params.push(input.updatedByUserId);
  setClauses.push(`updated_by_user_id = $${params.length}`);
  setClauses.push('updated_at = NOW()');

  params.push(reasonId);

  const result = await query(
    `UPDATE admin_finance_reasons
     SET ${setClauses.join(', ')}
     WHERE id = $${params.length} AND is_archived = FALSE
     RETURNING id`,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0] as Record<string, unknown>;
  return getAdminFinanceReasonById(String(row.id));
}

export async function archiveAdminFinanceReason(reasonId: string, updatedByUserId: string): Promise<boolean> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `UPDATE admin_finance_reasons
     SET is_archived = TRUE,
         is_active = FALSE,
         updated_by_user_id = $2,
         updated_at = NOW()
     WHERE id = $1 AND is_archived = FALSE`,
    [reasonId, updatedByUserId]
  );

  return Number(result.rowCount ?? 0) > 0;
}

async function resolveReasonAndCategory(input: {
  type: AdminFinanceEntryType;
  reasonId: string | null;
  category: string | null;
  settings: AdminFinanceSettings;
  allowInactiveReason: boolean;
}): Promise<{ reasonId: string | null; reasonName: string | null; category: string }> {
  const category = sanitizeText(input.category, 120);
  const reasonId = sanitizeReasonId(input.reasonId);

  if (reasonId) {
    const reason = await getAdminFinanceReasonById(reasonId);
    if (!reason) {
      throw new Error('Selected finance reason was not found.');
    }

    if (reason.type !== input.type) {
      throw new Error('Selected reason does not match the entry type.');
    }

    if (!reason.isActive && !input.allowInactiveReason) {
      throw new Error('Selected reason is inactive. Please choose another one.');
    }

    return {
      reasonId: reason.id,
      reasonName: reason.name,
      category: reason.name,
    };
  }

  if (input.settings.requireReasonSelection && !input.settings.allowCustomReason) {
    if (category && input.allowInactiveReason) {
      return {
        reasonId: null,
        reasonName: category,
        category,
      };
    }
    throw new Error('Selecting an income source / expense reason is required by finance settings.');
  }

  if (input.settings.requireReasonSelection && input.settings.allowCustomReason && !category) {
    throw new Error('Select a reason or enter a custom reason before saving.');
  }

  if (category) {
    return {
      reasonId: null,
      reasonName: category,
      category,
    };
  }

  return {
    reasonId: null,
    reasonName: null,
    category: 'General',
  };
}

export async function createAdminFinanceEntry(input: AdminFinanceEntryCreateInput): Promise<AdminFinanceEntry> {
  await ensureAdminFinanceSchema();

  const normalized = sanitizeCreateInput(input);
  const settings = await getAdminFinanceSettings();
  const resolved = await resolveReasonAndCategory({
    type: normalized.type,
    reasonId: normalized.reasonId,
    category: normalized.category,
    settings,
    allowInactiveReason: false,
  });

  const result = await query(
    `INSERT INTO admin_finance_entries (
      entry_type,
      title,
      category,
      reason_id,
      reason_name,
      amount,
      currency,
      occurred_at,
      payment_method,
      reference,
      counterparty,
      notes,
      metadata,
      created_by_user_id,
      updated_by_user_id,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13,
      $14, $14, NOW(), NOW()
    )
    RETURNING id`,
    [
      normalized.type,
      normalized.title,
      resolved.category,
      resolved.reasonId,
      resolved.reasonName,
      normalized.amount,
      normalized.currency || settings.defaultCurrency,
      normalized.occurredAt,
      normalized.paymentMethod,
      normalized.reference,
      normalized.counterparty,
      normalized.notes,
      normalized.metadata,
      input.createdByUserId,
    ]
  );

  const createdId = result.rows[0]?.id;
  if (!createdId) {
    throw new Error('Failed to create finance entry.');
  }

  const entry = await getAdminFinanceEntryById(String(createdId));
  if (!entry) {
    throw new Error('Failed to load created finance entry.');
  }

  return entry;
}

export async function updateAdminFinanceEntry(entryId: string, input: AdminFinanceEntryUpdateInput): Promise<AdminFinanceEntry | null> {
  await ensureAdminFinanceSchema();

  const currentResult = await query(
    `SELECT *
     FROM admin_finance_entries
     WHERE id = $1 AND is_archived = FALSE
     LIMIT 1`,
    [entryId]
  );

  const currentRow = currentResult.rows[0] as Record<string, unknown> | undefined;
  if (!currentRow) {
    return null;
  }

  const settings = await getAdminFinanceSettings();
  const sanitizedPatch = sanitizeUpdateInput(input);
  const patchKeys = Object.keys(sanitizedPatch);

  if (patchKeys.length === 0) {
    throw new Error('No changes provided.');
  }

  const currentType = String(currentRow.entry_type) as AdminFinanceEntryType;
  const currentReasonId = currentRow.reason_id ? String(currentRow.reason_id) : null;
  const currentCategory = currentRow.category ? String(currentRow.category) : null;

  const nextType = (sanitizedPatch.entry_type ? String(sanitizedPatch.entry_type) : currentType) as AdminFinanceEntryType;
  const reasonIdWasProvided = Object.prototype.hasOwnProperty.call(sanitizedPatch, 'reason_id');
  const categoryWasProvided = Object.prototype.hasOwnProperty.call(sanitizedPatch, 'category');

  const nextReasonId = reasonIdWasProvided
    ? (sanitizedPatch.reason_id ? String(sanitizedPatch.reason_id) : null)
    : currentReasonId;

  const nextCategory = categoryWasProvided
    ? (sanitizedPatch.category ? String(sanitizedPatch.category) : null)
    : currentCategory;

  const resolved = await resolveReasonAndCategory({
    type: nextType,
    reasonId: nextReasonId,
    category: nextCategory,
    settings,
    allowInactiveReason: !reasonIdWasProvided,
  });

  sanitizedPatch.entry_type = nextType;
  sanitizedPatch.reason_id = resolved.reasonId;
  sanitizedPatch.reason_name = resolved.reasonName;
  sanitizedPatch.category = resolved.category;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  Object.keys(sanitizedPatch).forEach((key) => {
    params.push(sanitizedPatch[key]);
    setClauses.push(`${key} = $${params.length}`);
  });

  params.push(input.updatedByUserId);
  setClauses.push(`updated_by_user_id = $${params.length}`);
  setClauses.push('updated_at = NOW()');

  params.push(entryId);

  const result = await query(
    `UPDATE admin_finance_entries
     SET ${setClauses.join(', ')}
     WHERE id = $${params.length} AND is_archived = FALSE
     RETURNING id`,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0] as Record<string, unknown>;
  return getAdminFinanceEntryById(String(row.id));
}

export async function archiveAdminFinanceEntry(entryId: string, updatedByUserId: string): Promise<boolean> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `UPDATE admin_finance_entries
     SET is_archived = TRUE,
         updated_by_user_id = $2,
         updated_at = NOW()
     WHERE id = $1 AND is_archived = FALSE`,
    [entryId, updatedByUserId]
  );

  return Number(result.rowCount ?? 0) > 0;
}

export async function getAdminFinanceEntryById(entryId: string): Promise<AdminFinanceEntry | null> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `SELECT fe.*, fr.is_active AS reason_is_active,
            creator.full_name AS created_by_user_name,
            updater.full_name AS updated_by_user_name
     FROM admin_finance_entries fe
     LEFT JOIN admin_finance_reasons fr ON fr.id = fe.reason_id
     LEFT JOIN users creator ON creator.id = fe.created_by_user_id
     LEFT JOIN users updater ON updater.id = fe.updated_by_user_id
     WHERE fe.id = $1 AND fe.is_archived = FALSE
     LIMIT 1`,
    [entryId]
  );

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return mapFinanceEntryRow(row);
}

export async function listAdminFinanceCategories(): Promise<string[]> {
  await ensureAdminFinanceSchema();

  const result = await query(
    `SELECT category_name
     FROM (
       SELECT DISTINCT fr.name AS category_name
       FROM admin_finance_reasons fr
       WHERE fr.is_archived = FALSE

       UNION

       SELECT DISTINCT fe.category AS category_name
       FROM admin_finance_entries fe
       WHERE fe.is_archived = FALSE
     ) all_categories
     WHERE category_name IS NOT NULL AND category_name <> ''
     ORDER BY category_name ASC
     LIMIT 150`
  );

  return result.rows
    .map((row) => (row.category_name ? String(row.category_name) : null))
    .filter((value): value is string => Boolean(value));
}

export async function listAdminFinanceEntries(filters: AdminFinanceListFilters): Promise<{
  entries: AdminFinanceEntry[];
  total: number;
  page: number;
  limit: number;
}> {
  await ensureAdminFinanceSchema();

  const page = Number.isFinite(filters.page) ? Math.max(1, Number(filters.page)) : 1;
  const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(100, Number(filters.limit))) : 20;
  const offset = (page - 1) * limit;

  const { whereSql, params } = buildFinanceWhereClause(filters, 'fe');

  const rowsResult = await query(
    `SELECT fe.*, fr.is_active AS reason_is_active,
            creator.full_name AS created_by_user_name,
            updater.full_name AS updated_by_user_name
     FROM admin_finance_entries fe
     LEFT JOIN admin_finance_reasons fr ON fr.id = fe.reason_id
     LEFT JOIN users creator ON creator.id = fe.created_by_user_id
     LEFT JOIN users updater ON updater.id = fe.updated_by_user_id
     ${whereSql}
     ORDER BY fe.occurred_at DESC, fe.created_at DESC
     LIMIT $${params.length + 1}
     OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*)::int AS count
     FROM admin_finance_entries fe
     ${whereSql}`,
    params
  );

  return {
    entries: rowsResult.rows.map((row) => mapFinanceEntryRow(row as Record<string, unknown>)),
    total: Number(countResult.rows[0]?.count ?? 0),
    page,
    limit,
  };
}

export async function getAdminFinanceReport(
  filters: Pick<AdminFinanceListFilters, 'type' | 'search' | 'category' | 'startDate' | 'endDate'>
): Promise<AdminFinanceReport> {
  await ensureAdminFinanceSchema();

  const { whereSql, params } = buildFinanceWhereClause(filters, 'fe');

  const summaryResult = await query(
    `SELECT
      COALESCE(SUM(CASE WHEN fe.entry_type = 'INCOME' THEN fe.amount ELSE 0 END), 0)::numeric AS total_income,
      COALESCE(SUM(CASE WHEN fe.entry_type = 'EXPENSE' THEN fe.amount ELSE 0 END), 0)::numeric AS total_expense,
      COUNT(*)::int AS entries_count,
      COUNT(*) FILTER (WHERE fe.entry_type = 'INCOME')::int AS income_count,
      COUNT(*) FILTER (WHERE fe.entry_type = 'EXPENSE')::int AS expense_count
     FROM admin_finance_entries fe
     ${whereSql}`,
    params
  );

  const categoryResult = await query(
    `SELECT
      COALESCE(fe.reason_name, fe.category, 'General') AS report_category,
      COALESCE(SUM(CASE WHEN fe.entry_type = 'INCOME' THEN fe.amount ELSE 0 END), 0)::numeric AS income_total,
      COALESCE(SUM(CASE WHEN fe.entry_type = 'EXPENSE' THEN fe.amount ELSE 0 END), 0)::numeric AS expense_total,
      COUNT(*)::int AS entries_count
     FROM admin_finance_entries fe
     ${whereSql}
     GROUP BY COALESCE(fe.reason_name, fe.category, 'General')
     ORDER BY (COALESCE(SUM(fe.amount), 0)) DESC, report_category ASC
     LIMIT 25`,
    params
  );

  const monthlyResult = await query(
    `SELECT
      TO_CHAR(DATE_TRUNC('month', fe.occurred_at), 'YYYY-MM') AS month_key,
      COALESCE(SUM(CASE WHEN fe.entry_type = 'INCOME' THEN fe.amount ELSE 0 END), 0)::numeric AS income_total,
      COALESCE(SUM(CASE WHEN fe.entry_type = 'EXPENSE' THEN fe.amount ELSE 0 END), 0)::numeric AS expense_total,
      COUNT(*)::int AS entries_count
     FROM admin_finance_entries fe
     ${whereSql}
     GROUP BY DATE_TRUNC('month', fe.occurred_at)
     ORDER BY DATE_TRUNC('month', fe.occurred_at) DESC
     LIMIT 18`,
    params
  );

  const recentEntriesResult = await query(
    `SELECT fe.*, fr.is_active AS reason_is_active,
            creator.full_name AS created_by_user_name,
            updater.full_name AS updated_by_user_name
     FROM admin_finance_entries fe
     LEFT JOIN admin_finance_reasons fr ON fr.id = fe.reason_id
     LEFT JOIN users creator ON creator.id = fe.created_by_user_id
     LEFT JOIN users updater ON updater.id = fe.updated_by_user_id
     ${whereSql}
     ORDER BY fe.occurred_at DESC, fe.created_at DESC
     LIMIT 8`,
    params
  );

  const summaryRow = summaryResult.rows[0] as Record<string, unknown> | undefined;
  const totalIncome = toMoney(summaryRow?.total_income);
  const totalExpense = toMoney(summaryRow?.total_expense);

  return {
    summary: {
      totalIncome,
      totalExpense,
      netAmount: toMoney(totalIncome - totalExpense),
      entriesCount: Number(summaryRow?.entries_count ?? 0),
      incomeCount: Number(summaryRow?.income_count ?? 0),
      expenseCount: Number(summaryRow?.expense_count ?? 0),
    },
    byCategory: categoryResult.rows.map((row) => {
      const income = toMoney(row.income_total);
      const expense = toMoney(row.expense_total);
      return {
        category: String(row.report_category || 'General'),
        income,
        expense,
        net: toMoney(income - expense),
        entriesCount: Number(row.entries_count ?? 0),
      };
    }),
    monthly: monthlyResult.rows.map((row) => {
      const income = toMoney(row.income_total);
      const expense = toMoney(row.expense_total);
      return {
        month: String(row.month_key),
        income,
        expense,
        net: toMoney(income - expense),
        entriesCount: Number(row.entries_count ?? 0),
      };
    }),
    recentEntries: recentEntriesResult.rows.map((row) => mapFinanceEntryRow(row as Record<string, unknown>)),
  };
}

// Helper types for transactional finance entries
type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

/**
 * Create a shop sale finance entry inside an existing transaction.
 * Call this when a shop order is successfully paid.
 */
export async function createShopRevenueFinanceEntry(params: {
  db: Queryable;
  saleType: 'SHOP_ORDER' | 'IN_SHOP_SALE';
  referenceId: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  customerName?: string | null;
  occurredAt?: Date;
}): Promise<void> {
  await ensureAdminFinanceSchema();

  if (params.amount <= 0) {
    return;
  }

  // Find Shop Sales reason
  const reasonResult = await params.db.query(
    `SELECT id, name FROM admin_finance_reasons
     WHERE entry_type = 'INCOME'
       AND is_archived = FALSE
       AND name = ANY($1::text[])
     ORDER BY CASE WHEN is_active THEN 0 ELSE 1 END,
              array_position($1::text[], name),
              sort_order ASC
     LIMIT 1`,
    [['Shop Sales', 'Other Income']]
  );

  const reasonRow = reasonResult.rows[0];
  const reasonId = reasonRow?.id ? String(reasonRow.id) : null;
  const reasonName = reasonRow?.name ? String(reasonRow.name) : 'Shop Sales';

  await insertAutoFinanceEntry({
    db: params.db,
    type: 'INCOME',
    title: `Shop sale: ${params.referenceNumber}`,
    amount: params.amount,
    currency: params.currency,
    occurredAt: params.occurredAt ?? new Date(),
    reason: {
      reasonId,
      reasonName,
      category: reasonName,
    },
    counterparty: params.customerName || null,
    notes: params.saleType === 'SHOP_ORDER'
      ? 'Auto-generated from shop checkout.'
      : 'Auto-generated from in-shop sale.',
    metadata: {
      source: params.saleType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      component: 'SALE_REVENUE',
    },
  });
}

export async function createShopSaleFinanceEntry(params: {
  db: Queryable;
  orderNumber: string;
  orderId: string;
  amount: number;
  currency: string;
  customerName?: string | null;
  occurredAt?: Date;
}): Promise<void> {
  await createShopRevenueFinanceEntry({
    db: params.db,
    saleType: 'SHOP_ORDER',
    referenceId: params.orderId,
    referenceNumber: `Order #${params.orderNumber}`,
    amount: params.amount,
    currency: params.currency,
    customerName: params.customerName,
    occurredAt: params.occurredAt,
  });
}

export async function createShopRestockExpenseEntry(params: {
  db: Queryable;
  restockId: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  totalCost: number;
  currency: string;
  workerName?: string | null;
  notes?: string | null;
  occurredAt?: Date;
}): Promise<void> {
  await ensureAdminFinanceSchema();

  if (params.totalCost <= 0) {
    return;
  }

  const expenseReason = await resolveAutoFinanceReason({
    db: params.db,
    type: 'EXPENSE',
    preferredNames: ['Supplies', 'Other Expense'],
    fallbackName: 'Supplies',
  });

  await insertAutoFinanceEntry({
    db: params.db,
    type: 'EXPENSE',
    title: `Shop restock bill: ${params.productName} x${params.quantityAdded}`,
    amount: params.totalCost,
    currency: params.currency,
    occurredAt: params.occurredAt ?? new Date(),
    reason: expenseReason,
    counterparty: params.workerName || null,
    notes: params.notes?.trim() || 'Auto-generated bill for shop product restocking.',
    metadata: {
      source: 'SHOP_RESTOCK',
      restockId: params.restockId,
      productId: params.productId,
      productName: params.productName,
      quantityAdded: params.quantityAdded,
      component: 'RESTOCK_BILL',
    },
  });
}

export async function createShopSaleCostExpenseEntry(params: {
  db: Queryable;
  saleType: 'SHOP_ORDER' | 'IN_SHOP_SALE';
  referenceId: string;
  referenceNumber: string;
  totalCost: number;
  currency: string;
  customerName?: string | null;
  occurredAt?: Date;
}): Promise<void> {
  await ensureAdminFinanceSchema();

  if (params.totalCost <= 0) {
    return;
  }

  const expenseReason = await resolveAutoFinanceReason({
    db: params.db,
    type: 'EXPENSE',
    preferredNames: ['Cost of Goods Sold', 'Supplies', 'Other Expense'],
    fallbackName: 'Cost of Goods Sold',
  });

  await insertAutoFinanceEntry({
    db: params.db,
    type: 'EXPENSE',
    title: `Shop sale cost: ${params.referenceNumber}`,
    amount: params.totalCost,
    currency: params.currency,
    occurredAt: params.occurredAt ?? new Date(),
    reason: expenseReason,
    counterparty: params.customerName || null,
    notes: 'Auto-generated product cost for a completed shop sale.',
    metadata: {
      source: params.saleType,
      referenceId: params.referenceId,
      referenceNumber: params.referenceNumber,
      component: 'PRODUCT_COST',
    },
  });
}
