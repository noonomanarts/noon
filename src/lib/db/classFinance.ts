import { pool, query } from './pool';

type QueryResultRow = Record<string, unknown>;
type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount?: number | null }>;
};

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
  sessionId: string;
  sessionStartTime: string;
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
    trainerSharePercent: number;
    noonSharePercent: number;
    expenseSharePercent: number;
    totalPercent: number;
  };
  summary: {
    bookingsCount: number;
    participantsCount: number;
    grossRevenue: number;
    trainerPayoutAmount: number;
    adminShareAmount: number;
    expenseBudgetAmount: number;
    adminTotalPayoutAmount: number;
    actualExpensesTotal: number;
    expenseVarianceAmount: number;
  };
  participants: ClassParticipantRow[];
  expenses: ClassExpenseItem[];
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
  trainerId: string | null;
  trainerName: string | null;
  currency: string;
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

function validateFinancePercentages(input: {
  trainerSharePercent: number;
  noonSharePercent: number;
  expenseSharePercent: number;
}) {
  const trainerSharePercent = toPercent(input.trainerSharePercent);
  const noonSharePercent = toPercent(input.noonSharePercent);
  const expenseSharePercent = toPercent(input.expenseSharePercent);
  const totalPercent = toPercent(trainerSharePercent + noonSharePercent + expenseSharePercent);

  if (
    trainerSharePercent < 0 ||
    noonSharePercent < 0 ||
    expenseSharePercent < 0 ||
    trainerSharePercent > 100 ||
    noonSharePercent > 100 ||
    expenseSharePercent > 100
  ) {
    throw new Error('Finance percentages must be between 0 and 100');
  }

  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error('Trainer, Noon, and expense percentages must total exactly 100%');
  }

  return {
    trainerSharePercent,
    noonSharePercent,
    expenseSharePercent,
    totalPercent,
  };
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
  })().catch((error) => {
    classFinanceSchemaReady = null;
    throw error;
  });

  return classFinanceSchemaReady;
}

async function getClassFinanceRow(classId: string, db: Queryable): Promise<FinanceClassRow | null> {
  const result = await db.query(
    `SELECT c.id,
            c.currency,
            c.trainer_id,
            c.trainer_share_percent,
            c.noon_share_percent,
            c.expense_share_percent,
            c.closed_at,
            c.closed_by_user_id,
            u.full_name AS trainer_name
     FROM classes c
     LEFT JOIN users u ON u.id = c.trainer_id
     WHERE c.id = $1
     LIMIT 1`,
    [classId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    trainerId: row.trainer_id ? String(row.trainer_id) : null,
    trainerName: row.trainer_name ? String(row.trainer_name) : null,
    currency: String(row.currency || 'OMR'),
    trainerSharePercent: toPercent(row.trainer_share_percent),
    noonSharePercent: toPercent(row.noon_share_percent),
    expenseSharePercent: toPercent(row.expense_share_percent),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    closedByUserId: row.closed_by_user_id ? String(row.closed_by_user_id) : null,
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
            b.session_id,
            cs.start_date_time,
            u.id AS customer_id,
            u.full_name AS customer_name,
            u.email AS customer_email
     FROM bookings b
     INNER JOIN class_sessions cs ON cs.id = b.session_id
     INNER JOIN users u ON u.id = b.user_id
     WHERE b.class_id = $1
       AND b.payment_status = 'PAID'
       AND b.status IN ('CONFIRMED', 'COMPLETED')
     ORDER BY cs.start_date_time ASC, b.created_at ASC`,
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
    const sessionId = String(row.session_id);
    const sessionStartTime = String(row.start_date_time);
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
        sessionId,
        sessionStartTime,
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
      rows.push({
        bookingId,
        bookingNumber,
        customerId,
        customerName,
        customerEmail,
        sessionId,
        sessionStartTime,
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
  participants: ClassParticipantRow[];
  expenses: ClassExpenseItem[];
  settlement: {
    status: 'DRAFT' | 'CLOSED';
    notes: string | null;
    settledAt: string | null;
    settledByUserId: string | null;
  } | null;
}): ClassSettlementSnapshot {
  const finance = {
    trainerSharePercent: args.financeRow.trainerSharePercent,
    noonSharePercent: args.financeRow.noonSharePercent,
    expenseSharePercent: args.financeRow.expenseSharePercent,
    totalPercent: toPercent(
      args.financeRow.trainerSharePercent + args.financeRow.noonSharePercent + args.financeRow.expenseSharePercent
    ),
  };

  const grossRevenue = toMoney(args.participants.reduce((sum, row) => sum + (row.participantIndex === 1 ? row.totalAmount : 0), 0));
  const participantsCount = args.participants.length;
  const actualExpensesTotal = toMoney(args.expenses.reduce((sum, item) => sum + item.amount, 0));
  const trainerPayoutAmount = toMoney((grossRevenue * finance.trainerSharePercent) / 100);
  const adminShareAmount = toMoney((grossRevenue * finance.noonSharePercent) / 100);
  const expenseBudgetAmount = toMoney((grossRevenue * finance.expenseSharePercent) / 100);
  const adminTotalPayoutAmount = toMoney(adminShareAmount + expenseBudgetAmount);
  const expenseVarianceAmount = toMoney(expenseBudgetAmount - actualExpensesTotal);

  const warnings: string[] = [];
  if (Math.abs(finance.totalPercent - 100) > 0.01) {
    warnings.push('Finance percentages must total 100% before the class can be closed.');
  }
  if (participantsCount === 0) {
    warnings.push('No paid participants were found for this class.');
  }
  if (args.financeRow.closedAt) {
    warnings.push('This class has already been closed and settled.');
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
      trainerPayoutAmount,
      adminShareAmount,
      expenseBudgetAmount,
      adminTotalPayoutAmount,
      actualExpensesTotal,
      expenseVarianceAmount,
    },
    participants: args.participants,
    expenses: args.expenses,
    settlement: args.settlement,
    warnings,
    canClose: warnings.length === 0,
  };
}

export async function getClassSettlementSnapshot(classId: string): Promise<ClassSettlementSnapshot | null> {
  await ensureClassFinanceSchema();

  const financeRow = await getClassFinanceRow(classId, { query });
  if (!financeRow) return null;

  const [participants, expenses, settlement] = await Promise.all([
    getParticipantRows(classId, { query }),
    getExpenseItems(classId, { query }),
    getSettlementRow(classId, { query }),
  ]);

  return buildSettlementSnapshot({
    financeRow,
    participants,
    expenses,
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
       currency, trainer_wallet_transaction_id, admin_share_wallet_transaction_id, expense_budget_wallet_transaction_id,
       notes, settled_by_user_id, settled_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16, $17,
       $18, $19, $20, NOW(), NOW()
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
      params.snapshot.finance.trainerSharePercent,
      params.snapshot.finance.noonSharePercent,
      params.snapshot.finance.expenseSharePercent,
      params.snapshot.summary.trainerPayoutAmount,
      params.snapshot.summary.adminShareAmount,
      params.snapshot.summary.expenseBudgetAmount,
      params.snapshot.summary.adminTotalPayoutAmount,
      params.snapshot.summary.actualExpensesTotal,
      params.snapshot.summary.expenseVarianceAmount,
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

export async function saveClassSettlementDraft(args: {
  classId: string;
  adminUserId: string;
  expenseItems: unknown;
  notes?: unknown;
}): Promise<ClassSettlementSnapshot> {
  await ensureClassFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
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

    const [participants, expenses] = await Promise.all([
      getParticipantRows(args.classId, client),
      getExpenseItems(args.classId, client),
    ]);

    const snapshot = buildSettlementSnapshot({
      financeRow,
      participants,
      expenses,
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
  notes?: unknown;
}): Promise<ClassSettlementSnapshot> {
  await ensureClassFinanceSchema();

  const expenseItems = sanitizeExpenseItems(args.expenseItems);
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

    validateFinancePercentages({
      trainerSharePercent: financeRow.trainerSharePercent,
      noonSharePercent: financeRow.noonSharePercent,
      expenseSharePercent: financeRow.expenseSharePercent,
    });

    await replaceExpenseItems({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      expenseItems,
    });

    const [participants, expenses] = await Promise.all([
      getParticipantRows(args.classId, client),
      getExpenseItems(args.classId, client),
    ]);

    const snapshot = buildSettlementSnapshot({
      financeRow,
      participants,
      expenses,
      settlement: {
        status: 'CLOSED',
        notes,
        settledAt: new Date().toISOString(),
        settledByUserId: args.adminUserId,
      },
    });

    if (snapshot.summary.participantsCount === 0) {
      throw new Error('Cannot close a class with no paid participants');
    }

    if (!snapshot.trainer?.id) {
      throw new Error('Trainer is missing for this class');
    }

    const trainerCredit = await creditWallet({
      db: client,
      userId: snapshot.trainer.id,
      amount: snapshot.summary.trainerPayoutAmount,
      currency: snapshot.currency,
      type: 'CLASS_SETTLEMENT_TRAINER',
      reason: `Trainer payout for class ${args.classId}`,
    });

    const adminShareCredit = await creditWallet({
      db: client,
      userId: args.adminUserId,
      amount: snapshot.summary.adminShareAmount,
      currency: snapshot.currency,
      type: 'CLASS_SETTLEMENT_NOON_SHARE',
      reason: `Noon share for class ${args.classId}`,
    });

    const expenseBudgetCredit = await creditWallet({
      db: client,
      userId: args.adminUserId,
      amount: snapshot.summary.expenseBudgetAmount,
      currency: snapshot.currency,
      type: 'CLASS_SETTLEMENT_EXPENSE_BUDGET',
      reason: `Expense budget for class ${args.classId}`,
    });

    await upsertSettlementRow({
      db: client,
      classId: args.classId,
      adminUserId: args.adminUserId,
      snapshot,
      notes,
      status: 'CLOSED',
      trainerWalletTransactionId: trainerCredit.transactionId,
      adminShareWalletTransactionId: adminShareCredit.transactionId,
      expenseBudgetWalletTransactionId: expenseBudgetCredit.transactionId,
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
