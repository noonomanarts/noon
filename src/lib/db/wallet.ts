import { pool } from './pool';
import { emitAdminEvent, emitUserEvent } from '@/lib/realtime/adminEvents';
import { notifyRole, notifyUser } from '@/lib/notificationService';
import { getUserById } from '@/lib/db/users';
import { sendPaymentAdminNotifications } from '@/lib/paymentAdminNotifications';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';
import type { Wallet, WalletTransaction, LoyaltyCard, WalletTopupPayment, WalletTopupPaymentStatus } from './types';

let walletDecisionColumnsCache: boolean | null = null;
let walletTopupPaymentsTableCache: boolean | null = null;

async function hasWalletDecisionTimestampColumns(): Promise<boolean> {
  if (walletDecisionColumnsCache !== null) {
    return walletDecisionColumnsCache;
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'wallet_transactions'
       AND column_name IN ('approved_at', 'rejected_at')`
  );

  walletDecisionColumnsCache = (result.rows[0]?.count ?? 0) >= 2;
  return walletDecisionColumnsCache;
}

async function ensureWalletTopupPaymentsTable(): Promise<void> {
  if (walletTopupPaymentsTableCache) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_topup_payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reference VARCHAR(80) UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      amount DECIMAL(10, 3) NOT NULL CHECK (amount > 0),
      currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
      gateway VARCHAR(50) NOT NULL DEFAULT 'PENDING_GATEWAY',
      gateway_transaction_id VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
      payment_url TEXT,
      failure_reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      paid_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS reference VARCHAR(80)`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 3)`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'OMR'`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) NOT NULL DEFAULT 'PENDING_GATEWAY'`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(120)`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS payment_url TEXT`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS failure_reason TEXT`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE wallet_topup_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);

  await pool.query(`UPDATE wallet_topup_payments SET metadata = '{}'::jsonb WHERE metadata IS NULL`);
  await pool.query(`ALTER TABLE wallet_topup_payments ALTER COLUMN metadata SET DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE wallet_topup_payments ALTER COLUMN metadata SET NOT NULL`);

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_topup_payments_reference ON wallet_topup_payments(reference)`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_user_id ON wallet_topup_payments(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_status ON wallet_topup_payments(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_created_at ON wallet_topup_payments(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_topup_payments_reference ON wallet_topup_payments(reference)`);

  walletTopupPaymentsTableCache = true;
}

export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const result = await pool.query(
    `SELECT w.*, COALESCE(SUM(CASE WHEN wt.type = 'WITHDRAWAL_REQUEST' AND wt.status = 'PENDING' THEN ABS(wt.amount) ELSE 0 END), 0)::numeric AS blocked_balance
     FROM wallets w
     LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
     WHERE w.user_id = $1
     GROUP BY w.id`,
    [userId]
  );
  if (result.rows[0]) {
    return {
      ...result.rows[0],
      balance: parseFloat(result.rows[0].balance as string),
      available_balance: parseFloat(result.rows[0].available_balance as string),
      blocked_balance: parseFloat(result.rows[0].blocked_balance as string),
    };
  }
  return null;
}

export async function createWallet(userId: string, currency = 'OMR'): Promise<Wallet> {
  const result = await pool.query(
    'INSERT INTO wallets (user_id, balance, available_balance, currency) VALUES ($1, 0, 0, $2) RETURNING *',
    [userId, currency]
  );
  return {
    ...result.rows[0],
    balance: parseFloat(result.rows[0].balance as string),
    available_balance: parseFloat(result.rows[0].available_balance as string),
    blocked_balance: 0,
  };
}

export async function updateWalletBalance(walletId: string, newBalance: number): Promise<void> {
  await pool.query(
    'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
    [newBalance, walletId]
  );
}

export async function updateWalletAvailableBalance(walletId: string, newAvailableBalance: number): Promise<void> {
  await pool.query(
    'UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE id = $2',
    [newAvailableBalance, walletId]
  );
}

export async function updateWalletBalances(walletId: string, newBalance: number, newAvailableBalance: number): Promise<void> {
  await pool.query(
    'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3',
    [newBalance, newAvailableBalance, walletId]
  );
}

export async function addWalletTransaction(
  walletId: string,
  amount: number,
  type: string,
  reason?: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' = 'COMPLETED'
): Promise<WalletTransaction> {
  const result = await pool.query(
    'INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [walletId, amount, type, reason, status]
  );
  return result.rows[0];
}

export async function getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  const result = await pool.query(
    'SELECT * FROM wallet_transactions WHERE wallet_id = $1 ORDER BY created_at DESC',
    [walletId]
  );
  return result.rows.map(row => ({
    ...row,
    amount: parseFloat(row.amount as string),
  }));
}

export async function getWalletTransactionsByUserId(userId: string): Promise<WalletTransaction[]> {
  const result = await pool.query(
    `SELECT wt.* FROM wallet_transactions wt
     JOIN wallets w ON wt.wallet_id = w.id
     WHERE w.user_id = $1 ORDER BY wt.created_at DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    ...row,
    amount: parseFloat(row.amount as string),
  }));
}

export async function getLoyaltyCardByUserId(userId: string): Promise<LoyaltyCard | null> {
  const result = await pool.query(
    'SELECT * FROM loyalty_cards WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function createLoyaltyCard(userId: string): Promise<LoyaltyCard> {
  const result = await pool.query(
    'INSERT INTO loyalty_cards (user_id, points, stamps) VALUES ($1, 0, 0) RETURNING *',
    [userId]
  );
  return result.rows[0];
}

export async function updateLoyaltyPoints(userId: string, points: number, stamps: number): Promise<void> {
  await pool.query(
    'UPDATE loyalty_cards SET points = $1, stamps = $2, updated_at = NOW() WHERE user_id = $3',
    [points, stamps, userId]
  );
}

export async function addLoyaltyStamp(userId: string): Promise<void> {
  await pool.query(
    'UPDATE loyalty_cards SET stamps = stamps + 1, updated_at = NOW() WHERE user_id = $1',
    [userId]
  );
}

/**
 * Add bonus points to user's loyalty card (1 OMR spent = 1 point).
 * Creates a loyalty card if one does not exist yet.
 */
export async function addBonusPoints(userId: string, points: number): Promise<void> {
  if (points <= 0) return;
  const roundedPoints = Math.floor(points);
  if (roundedPoints <= 0) return;

  let card = await getLoyaltyCardByUserId(userId);
  if (!card) {
    card = await createLoyaltyCard(userId);
  }

  await pool.query(
    'UPDATE loyalty_cards SET points = points + $1, updated_at = NOW() WHERE user_id = $2',
    [roundedPoints, userId]
  );
}

/**
 * Convert loyalty points to wallet credit.
 * Returns the amount credited and points consumed.
 */
export async function convertPointsToCredit(
  userId: string,
  pointsToConvert: number,
  ratePerPoint: number
): Promise<{ pointsUsed: number; amountCredited: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock loyalty card
    const cardResult = await client.query(
      'SELECT * FROM loyalty_cards WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    const card = cardResult.rows[0];
    if (!card || Number(card.points) < pointsToConvert) {
      throw new Error('Insufficient points');
    }

    const amountCredited = Number((pointsToConvert * ratePerPoint).toFixed(3));
    if (amountCredited <= 0) {
      throw new Error('Conversion amount too small');
    }

    // Deduct points
    await client.query(
      'UPDATE loyalty_cards SET points = points - $1, updated_at = NOW() WHERE user_id = $2',
      [pointsToConvert, userId]
    );

    // Credit wallet (purchase balance only, not withdrawable)
    const walletResult = await client.query(
      'SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    let walletId: string;
    let walletCurrency = 'OMR';
    if (walletResult.rows.length === 0) {
      const newWallet = await client.query(
        `INSERT INTO wallets (user_id, balance, available_balance, currency)
         VALUES ($1, $2, 0, 'OMR') RETURNING id`,
        [userId, amountCredited]
      );
      walletId = newWallet.rows[0].id as string;
      walletCurrency = 'OMR';
    } else {
      walletId = walletResult.rows[0].id as string;
      walletCurrency = String(walletResult.rows[0].currency || 'OMR');
      const newBalance = Number((Number(walletResult.rows[0].balance) + amountCredited).toFixed(3));
      await client.query(
        'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, walletId]
      );
    }

    // Record wallet transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
       VALUES ($1, $2, 'POINTS_CONVERSION', $3, 'COMPLETED')`,
      [walletId, amountCredited, `Converted ${pointsToConvert} bonus points to wallet credit`]
    );

    await client.query('COMMIT');

    void sendUserTransactionWhatsApp({
      userId,
      key: 'wallet_points_conversion',
      vars: {
        amount: amountCredited,
        currency: walletCurrency,
      },
    }).catch((error) => {
      console.error('Failed to send wallet points conversion WhatsApp message:', error);
    });

    return { pointsUsed: pointsToConvert, amountCredited };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Transfer functions
export async function transferWalletFunds(
  fromUserId: string,
  toUserId: string,
  amount: number,
  reason?: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get sender wallet
    const senderWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [fromUserId]
    );
    if (!senderWallet.rows[0] || senderWallet.rows[0].balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Get receiver wallet
    let receiverWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [toUserId]
    );
    if (!receiverWallet.rows[0]) {
      // Create wallet for receiver if doesn't exist
      receiverWallet = await client.query(
        'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, $2) RETURNING *',
        [toUserId, 'OMR']
      );
    }

    // Update balances
    const senderBalance = parseFloat(senderWallet.rows[0].balance as string);
    const senderAvailableBalance = parseFloat(senderWallet.rows[0].available_balance as string);
    const receiverBalance = parseFloat(receiverWallet.rows[0].balance as string);
    const receiverAvailableBalance = parseFloat(receiverWallet.rows[0].available_balance as string);

    const senderNewBalance = senderBalance - amount;
    const senderNewAvailableBalance = Math.min(senderAvailableBalance, senderNewBalance);
    await client.query(
      'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE user_id = $3',
      [senderNewBalance, senderNewAvailableBalance, fromUserId]
    );
    await client.query(
      'UPDATE wallets SET balance = balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2',
      [amount, toUserId]
    );

    // Add transactions
    await client.query(
      'INSERT INTO wallet_transactions (wallet_id, amount, type, reason) VALUES ($1, $2, $3, $4)',
      [senderWallet.rows[0].id, -amount, 'TRANSFER_OUT', reason]
    );
    await client.query(
      'INSERT INTO wallet_transactions (wallet_id, amount, type, reason) VALUES ($1, $2, $3, $4)',
      [receiverWallet.rows[0].id, amount, 'TRANSFER_IN', reason]
    );

    await client.query('COMMIT');

    emitAdminEvent('wallet_updated', {
      user_id: fromUserId,
      balance: senderNewBalance,
      available_balance: senderNewAvailableBalance,
      currency: senderWallet.rows[0].currency,
    });
    emitAdminEvent('wallet_updated', {
      user_id: toUserId,
      balance: receiverBalance + amount,
      available_balance: receiverAvailableBalance + amount,
      currency: receiverWallet.rows[0].currency,
    });

    emitUserEvent(fromUserId, 'wallet_updated', {
      balance: senderNewBalance,
      available_balance: senderNewAvailableBalance,
      currency: senderWallet.rows[0].currency,
    });
    emitUserEvent(toUserId, 'wallet_updated', {
      balance: receiverBalance + amount,
      available_balance: receiverAvailableBalance + amount,
      currency: receiverWallet.rows[0].currency,
    });

    emitUserEvent(fromUserId, 'wallet_notification', {
      type: 'transfer_sent',
      messageEn: 'Transfer completed successfully.',
      messageAr: 'تم التحويل بنجاح.',
    });
    emitUserEvent(toUserId, 'wallet_notification', {
      type: 'transfer_received',
      messageEn: 'You received a wallet transfer.',
      messageAr: 'لقد استلمت تحويلاً إلى المحفظة.',
    });

    await notifyUser(fromUserId, {
      type: 'transfer_sent',
      title: 'Transfer Sent',
      message: 'Your wallet transfer was completed successfully.',
      data: { amount, currency: senderWallet.rows[0].currency },
    });
    await notifyUser(toUserId, {
      type: 'transfer_received',
      title: 'Transfer Received',
      message: 'You received a wallet transfer.',
      data: { amount, currency: receiverWallet.rows[0].currency },
    });

    void sendUserTransactionWhatsApp({
      userId: fromUserId,
      key: 'wallet_transfer_sent',
      vars: {
        amount,
        currency: senderWallet.rows[0].currency,
        balance: senderNewBalance,
      },
    }).catch((error) => {
      console.error('Failed to send wallet transfer sent WhatsApp message:', error);
    });

    void sendUserTransactionWhatsApp({
      userId: toUserId,
      key: 'wallet_transfer_received',
      vars: {
        amount,
        currency: receiverWallet.rows[0].currency,
        balance: receiverBalance + amount,
      },
    }).catch((error) => {
      console.error('Failed to send wallet transfer received WhatsApp message:', error);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Deposit/Withdraw functions
export async function depositToWallet(userId: string, amount: number, reason?: string): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');

  const newBalance = wallet.balance + amount;
  const newAvailableBalance = wallet.available_balance;
  await updateWalletBalances(wallet.id, newBalance, newAvailableBalance);
  await addWalletTransaction(wallet.id, amount, 'DEPOSIT', reason);

  emitAdminEvent('wallet_updated', {
    user_id: wallet.user_id,
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });

  emitUserEvent(userId, 'wallet_updated', {
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(userId, 'wallet_notification', {
    type: 'deposit_success',
    messageEn: 'Deposit completed successfully.',
    messageAr: 'تم الإيداع بنجاح.',
  });

  await notifyUser(userId, {
    type: 'deposit_success',
    title: 'Deposit Successful',
    message: 'Your wallet deposit was completed successfully.',
    data: { amount, currency: wallet.currency },
  });

  void sendUserTransactionWhatsApp({
    userId,
    key: 'wallet_deposit',
    vars: {
      amount,
      currency: wallet.currency,
      balance: newBalance,
    },
  }).catch((error) => {
    console.error('Failed to send wallet deposit WhatsApp message:', error);
  });
}

export async function requestWalletWithdrawal(userId: string, amount: number, reason?: string): Promise<WalletTransaction> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const walletResult = await client.query(
      `SELECT w.*, u.full_name,
              COALESCE((
                SELECT SUM(ABS(wt.amount))
                FROM wallet_transactions wt
                WHERE wt.wallet_id = w.id
                  AND wt.type = 'WITHDRAWAL_REQUEST'
                  AND wt.status = 'PENDING'
              ), 0)::numeric AS blocked_balance
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE w.user_id = $1
       FOR UPDATE`,
      [userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) throw new Error('Wallet not found');

    const currentBalance = parseFloat(wallet.balance as string);
    const availableBalance = parseFloat(wallet.available_balance as string);
    if (currentBalance < amount) throw new Error('Insufficient balance');
    if (availableBalance < amount) throw new Error('Insufficient available balance');

    const newBalance = currentBalance - amount;
    const newAvailableBalance = availableBalance - amount;
    const currentBlockedBalance = parseFloat(wallet.blocked_balance as string);
    const newBlockedBalance = currentBlockedBalance + amount;
    await client.query(
      'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3',
      [newBalance, newAvailableBalance, wallet.id]
    );

    // Create a withdrawal request transaction with PENDING status
    const transactionResult = await client.query(
      'INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [wallet.id, -amount, 'WITHDRAWAL_REQUEST', reason, 'PENDING']
    );

    await client.query('COMMIT');

    emitAdminEvent('wallet_updated', {
      user_id: wallet.user_id,
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitAdminEvent('withdrawal_requests_updated', { wallet_id: wallet.id });
    emitAdminEvent('wallet_notification', {
      type: 'withdrawal_request_submitted',
      user_id: wallet.user_id,
    });

    emitUserEvent(wallet.user_id, 'wallet_updated', {
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitUserEvent(wallet.user_id, 'wallet_notification', {
      type: 'withdrawal_request_submitted',
      messageEn: 'Your withdrawal request was submitted for review.',
      messageAr: 'تم إرسال طلب السحب للمراجعة.',
    });

    await notifyRole('ADMIN', {
      type: 'withdrawal_request_submitted',
      title: 'New Withdrawal Request',
      message: `${wallet.full_name || 'User'} submitted a withdrawal request.`,
      data: { userId: wallet.user_id, walletId: wallet.id, userName: wallet.full_name ?? null },
    });

    await notifyUser(wallet.user_id, {
      type: 'withdrawal_request_submitted',
      title: 'Withdrawal Request Submitted',
      message: 'Your withdrawal request has been submitted and is pending admin review.',
      data: { walletId: wallet.id },
    });

    void sendUserTransactionWhatsApp({
      userId: wallet.user_id,
      key: 'withdrawal_request_submitted',
      vars: {
        amount,
        currency: wallet.currency,
        availableBalance: newAvailableBalance,
      },
    }).catch((error) => {
      console.error('Failed to send withdrawal submitted WhatsApp message:', error);
    });

    return {
      ...transactionResult.rows[0],
      amount: parseFloat(transactionResult.rows[0].amount as string),
    } as WalletTransaction;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withdrawFromWallet(): Promise<void> {
  // This function is now deprecated - use requestWalletWithdrawal instead
  // Keeping for backward compatibility but it will throw an error
  throw new Error('Direct withdrawals are no longer supported. Use requestWalletWithdrawal instead.');
}

export async function getPendingWithdrawalRequests(): Promise<(WalletTransaction & { user_full_name: string; user_email: string; user_phone_number: string })[]> {
  const result = await pool.query(
    `SELECT wt.*, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone_number
     FROM wallet_transactions wt
     JOIN wallets w ON wt.wallet_id = w.id
     JOIN users u ON w.user_id = u.id
     WHERE wt.type = 'WITHDRAWAL_REQUEST' AND wt.status = 'PENDING'
     ORDER BY wt.created_at DESC`
  );
  return result.rows.map(row => ({
    ...row,
    amount: parseFloat(row.amount as string),
  }));
}

type WithdrawalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export async function listWithdrawalRequestsForAdmin(options?: {
  status?: WithdrawalRequestStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  requests: (WalletTransaction & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
    total_count: number;
  })[];
  total: number;
}> {
  const status = options?.status ?? 'ALL';
  const search = options?.search?.trim() ?? '';
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 10));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = [`wt.type = 'WITHDRAWAL_REQUEST'`];
  const params: Array<string | number> = [];

  if (status !== 'ALL') {
    params.push(status);
    whereClauses.push(`wt.status = $${params.length}`);
  }

  if (search.length > 0) {
    params.push(`%${search}%`);
    const searchParamIndex = params.length;
    whereClauses.push(`(
      u.full_name ILIKE $${searchParamIndex}
      OR u.email ILIKE $${searchParamIndex}
      OR u.phone_number ILIKE $${searchParamIndex}
    )`);
  }

  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const result = await pool.query(
      `SELECT wt.*, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone_number,
        u.profile_image as user_profile_image,
            COUNT(*) OVER()::int as total_count
     FROM wallet_transactions wt
     JOIN wallets w ON wt.wallet_id = w.id
     JOIN users u ON w.user_id = u.id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY wt.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params
  );

  const requests = result.rows.map(row => ({
    ...row,
    amount: parseFloat(row.amount as string),
    total_count: Number(row.total_count ?? 0),
  }));

  const total = requests[0]?.total_count ?? 0;
  return { requests, total };
}

export async function cancelWithdrawalRequestByUser(userId: string, transactionId: string, reason?: string): Promise<void> {
  const client = await pool.connect();
  try {
    const hasDecisionColumns = await hasWalletDecisionTimestampColumns();

    await client.query('BEGIN');

    const transactionResult = await client.query(
      `SELECT wt.*, w.user_id
       FROM wallet_transactions wt
       JOIN wallets w ON w.id = wt.wallet_id
       WHERE wt.id = $1
         AND wt.type = 'WITHDRAWAL_REQUEST'
         AND wt.status = 'PENDING'
         AND w.user_id = $2`,
      [transactionId, userId]
    );
    if (!transactionResult.rows[0]) {
      throw new Error('Pending withdrawal request not found');
    }

    const transaction = transactionResult.rows[0];
    const amount = Math.abs(parseFloat(transaction.amount as string));

    const walletResult = await client.query(
      `SELECT w.*, u.full_name,
              COALESCE((
                SELECT SUM(ABS(wt.amount))
                FROM wallet_transactions wt
                WHERE wt.wallet_id = w.id
                  AND wt.type = 'WITHDRAWAL_REQUEST'
                  AND wt.status = 'PENDING'
              ), 0)::numeric AS blocked_balance
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE w.id = $1
       FOR UPDATE`,
      [transaction.wallet_id]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) throw new Error('Wallet not found');

    const currentBalance = parseFloat(wallet.balance as string);
    const currentAvailableBalance = parseFloat(wallet.available_balance as string);
    const currentBlockedBalance = parseFloat(wallet.blocked_balance as string);

    const newBalance = currentBalance + amount;
    const newAvailableBalance = Math.min(newBalance, currentAvailableBalance + amount);
    const newBlockedBalance = Math.max(0, currentBlockedBalance - amount);

    await client.query(
      'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3',
      [newBalance, newAvailableBalance, wallet.id]
    );

    const cancelReason = reason?.trim()
      ? `Cancelled by user: ${reason.trim()}`
      : 'Cancelled by user';

    if (hasDecisionColumns) {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2, approved_at = NULL, rejected_at = NULL WHERE id = $3',
        ['CANCELLED', cancelReason, transactionId]
      );
    } else {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2 WHERE id = $3',
        ['CANCELLED', cancelReason, transactionId]
      );
    }

    await client.query('COMMIT');

    emitAdminEvent('wallet_updated', {
      user_id: wallet.user_id,
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitAdminEvent('withdrawal_requests_updated', { transactionId });

    emitUserEvent(wallet.user_id, 'wallet_updated', {
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitUserEvent(wallet.user_id, 'wallet_notification', {
      type: 'withdrawal_request_cancelled',
      messageEn: 'Your withdrawal request was cancelled and funds were restored.',
      messageAr: 'تم إلغاء طلب السحب وإرجاع المبلغ إلى محفظتك.',
    });

    await notifyRole('ADMIN', {
      type: 'withdrawal_request_cancelled',
      title: 'Withdrawal Cancelled by User',
      message: `${wallet.full_name || 'User'} cancelled a withdrawal request.`,
      data: { transactionId, userId: wallet.user_id, userName: wallet.full_name ?? null },
    });

    await notifyUser(wallet.user_id, {
      type: 'withdrawal_request_cancelled',
      title: 'Withdrawal Cancelled',
      message: 'Your withdrawal request was cancelled and held funds were restored.',
      data: { transactionId },
    });

    void sendUserTransactionWhatsApp({
      userId: wallet.user_id,
      key: 'withdrawal_request_cancelled',
      vars: {
        amount,
        currency: wallet.currency,
        balance: newBalance,
      },
    }).catch((error) => {
      console.error('Failed to send withdrawal cancelled WhatsApp message:', error);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function approveWithdrawalRequest(transactionId: string, adminReason?: string): Promise<void> {
  const client = await pool.connect();
  try {
    const hasDecisionColumns = await hasWalletDecisionTimestampColumns();

    await client.query('BEGIN');

    // Get the transaction
    const transactionResult = await client.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 AND type = $2 AND status = $3',
      [transactionId, 'WITHDRAWAL_REQUEST', 'PENDING']
    );
    if (!transactionResult.rows[0]) {
      throw new Error('Pending withdrawal request not found');
    }

    const transaction = transactionResult.rows[0];
    const amount = Math.abs(parseFloat(transaction.amount as string)); // Convert negative to positive

    // Get wallet
    const walletResult = await client.query(
      `SELECT w.*, u.full_name,
              COALESCE((
                SELECT SUM(ABS(wt.amount))
                FROM wallet_transactions wt
                WHERE wt.wallet_id = w.id
                  AND wt.type = 'WITHDRAWAL_REQUEST'
                  AND wt.status = 'PENDING'
              ), 0)::numeric AS blocked_balance
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE w.id = $1
       FOR UPDATE`,
      [transaction.wallet_id]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance as string);
    const currentAvailableBalance = parseFloat(wallet.available_balance as string);
    const currentBlockedBalance = parseFloat(wallet.blocked_balance as string);
    const newBlockedBalance = Math.max(0, currentBlockedBalance - amount);

    // Update transaction status
    const reason = adminReason ? `${transaction.reason || ''} - Approved: ${adminReason}` : transaction.reason;
    if (hasDecisionColumns) {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2, approved_at = NOW(), rejected_at = NULL WHERE id = $3',
        ['APPROVED', reason, transactionId]
      );
    } else {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2 WHERE id = $3',
        ['APPROVED', reason, transactionId]
      );
    }

    await client.query('COMMIT');

    emitAdminEvent('wallet_updated', {
      user_id: wallet.user_id,
      balance: currentBalance,
      available_balance: currentAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitAdminEvent('withdrawal_requests_updated', { transactionId });
    emitUserEvent(wallet.user_id, 'wallet_updated', {
      balance: currentBalance,
      available_balance: currentAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitUserEvent(wallet.user_id, 'wallet_notification', {
      type: 'withdrawal_request_approved',
      messageEn: 'Your withdrawal request was approved.',
      messageAr: 'تمت الموافقة على طلب السحب الخاص بك.',
    });

    await notifyRole('ADMIN', {
      type: 'withdrawal_request_approved',
      title: 'Withdrawal Approved',
      message: `${wallet.full_name || 'User'} withdrawal was approved.`,
      data: { transactionId, userId: wallet.user_id, userName: wallet.full_name ?? null },
    });

    await notifyUser(wallet.user_id, {
      type: 'withdrawal_request_approved',
      title: 'Withdrawal Approved',
      message: 'Your withdrawal request was approved by admin.',
      data: { transactionId },
    });

    void sendUserTransactionWhatsApp({
      userId: wallet.user_id,
      key: 'withdrawal_request_approved',
      vars: {
        amount,
        currency: wallet.currency,
      },
    }).catch((error) => {
      console.error('Failed to send withdrawal approved WhatsApp message:', error);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectWithdrawalRequest(transactionId: string, adminReason?: string): Promise<void> {
  const client = await pool.connect();
  try {
    const hasDecisionColumns = await hasWalletDecisionTimestampColumns();

    await client.query('BEGIN');

    const transactionResult = await client.query(
      'SELECT * FROM wallet_transactions WHERE id = $1 AND type = $2 AND status = $3',
      [transactionId, 'WITHDRAWAL_REQUEST', 'PENDING']
    );
    if (!transactionResult.rows[0]) {
      throw new Error('Pending withdrawal request not found');
    }

    const transaction = transactionResult.rows[0];
    const amount = Math.abs(parseFloat(transaction.amount as string));

    const walletResult = await client.query(
      `SELECT w.*, u.full_name,
              COALESCE((
                SELECT SUM(ABS(wt.amount))
                FROM wallet_transactions wt
                WHERE wt.wallet_id = w.id
                  AND wt.type = 'WITHDRAWAL_REQUEST'
                  AND wt.status = 'PENDING'
              ), 0)::numeric AS blocked_balance
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE w.id = $1
       FOR UPDATE`,
      [transaction.wallet_id]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Restore deducted balances and release blocked amount.
    const currentBalance = parseFloat(wallet.balance as string);
    const currentAvailableBalance = parseFloat(wallet.available_balance as string);
    const currentBlockedBalance = parseFloat(wallet.blocked_balance as string);
    const newBalance = currentBalance + amount;
    const newAvailableBalance = Math.min(newBalance, currentAvailableBalance + amount);
    const newBlockedBalance = Math.max(0, currentBlockedBalance - amount);
    await client.query(
      'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3',
      [newBalance, newAvailableBalance, wallet.id]
    );

    const reason = adminReason ? `Rejected: ${adminReason}` : 'Rejected by admin';
    if (hasDecisionColumns) {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2, rejected_at = NOW(), approved_at = NULL WHERE id = $3',
        ['REJECTED', reason, transactionId]
      );
    } else {
      await client.query(
        'UPDATE wallet_transactions SET status = $1, reason = $2 WHERE id = $3',
        ['REJECTED', reason, transactionId]
      );
    }

    await client.query('COMMIT');

    emitAdminEvent('wallet_updated', {
      user_id: wallet.user_id,
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitAdminEvent('withdrawal_requests_updated', { transactionId });
    emitUserEvent(wallet.user_id, 'wallet_updated', {
      balance: newBalance,
      available_balance: newAvailableBalance,
      blocked_balance: newBlockedBalance,
      currency: wallet.currency,
    });
    emitUserEvent(wallet.user_id, 'wallet_notification', {
      type: 'withdrawal_request_rejected',
      messageEn: 'Your withdrawal request was rejected and funds were released.',
      messageAr: 'تم رفض طلب السحب وتم تحرير المبلغ المحجوز.',
    });

    await notifyRole('ADMIN', {
      type: 'withdrawal_request_rejected',
      title: 'Withdrawal Rejected',
      message: `${wallet.full_name || 'User'} withdrawal was rejected.`,
      data: { transactionId, userId: wallet.user_id, userName: wallet.full_name ?? null },
    });

    await notifyUser(wallet.user_id, {
      type: 'withdrawal_request_rejected',
      title: 'Withdrawal Rejected',
      message: 'Your withdrawal request was rejected and held funds were released.',
      data: { transactionId },
    });

    void sendUserTransactionWhatsApp({
      userId: wallet.user_id,
      key: 'withdrawal_request_rejected',
      vars: {
        amount,
        currency: wallet.currency,
        balance: newBalance,
      },
    }).catch((error) => {
      console.error('Failed to send withdrawal rejected WhatsApp message:', error);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function adminAddWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');

  const newBalance = wallet.balance + amount;
  const newAvailableBalance = wallet.available_balance + amount;
  await updateWalletBalances(wallet.id, newBalance, newAvailableBalance);
  const transaction = await addWalletTransaction(wallet.id, amount, 'ADMIN_CREDIT', reason);

  emitAdminEvent('wallet_updated', {
    user_id: wallet.user_id,
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_updated', {
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_notification', {
    type: 'admin_credit',
    messageEn: 'An admin added credit to your wallet.',
    messageAr: 'تمت إضافة رصيد إلى محفظتك من الإدارة.',
  });

  await notifyUser(wallet.user_id, {
    type: 'admin_credit',
    title: 'Wallet Credited',
    message: 'An admin added credit to your wallet.',
    data: { amount, currency: wallet.currency },
  });

  void sendUserTransactionWhatsApp({
    userId: wallet.user_id,
    key: 'wallet_admin_credit',
    vars: {
      amount,
      currency: wallet.currency,
      balance: newBalance,
    },
  }).catch((error) => {
    console.error('Failed to send admin wallet credit WhatsApp message:', error);
  });

  return {
    wallet: { ...wallet, balance: newBalance, available_balance: newAvailableBalance },
    transaction
  };
}

export async function adminDeductWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance < amount) throw new Error('Insufficient balance');

  const newBalance = wallet.balance - amount;
  const newAvailableBalance = Math.min(wallet.available_balance, newBalance);
  await updateWalletBalances(wallet.id, newBalance, newAvailableBalance);
  const transaction = await addWalletTransaction(wallet.id, -amount, 'ADMIN_DEDUCT', reason);

  emitAdminEvent('wallet_updated', {
    user_id: wallet.user_id,
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_updated', {
    balance: newBalance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_notification', {
    type: 'admin_deduct',
    messageEn: 'An admin deducted credit from your wallet.',
    messageAr: 'تم خصم رصيد من محفظتك من الإدارة.',
  });

  await notifyUser(wallet.user_id, {
    type: 'admin_deduct',
    title: 'Wallet Deduction',
    message: 'An admin deducted credit from your wallet.',
    data: { amount, currency: wallet.currency },
  });

  void sendUserTransactionWhatsApp({
    userId: wallet.user_id,
    key: 'wallet_admin_deduct',
    vars: {
      amount,
      currency: wallet.currency,
      balance: newBalance,
    },
  }).catch((error) => {
    console.error('Failed to send admin wallet deduction WhatsApp message:', error);
  });

  return {
    wallet: { ...wallet, balance: newBalance, available_balance: newAvailableBalance },
    transaction
  };
}

export async function adminUpdateWalletAvailableBalance(userId: string, newAvailableBalance: number): Promise<{ wallet: Wallet }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (newAvailableBalance < 0) throw new Error('Withdrawable amount cannot be negative');
  if (newAvailableBalance > wallet.balance) throw new Error('Withdrawable amount cannot exceed total balance');

  await updateWalletAvailableBalance(wallet.id, newAvailableBalance);

  emitAdminEvent('wallet_updated', {
    user_id: wallet.user_id,
    balance: wallet.balance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_updated', {
    balance: wallet.balance,
    available_balance: newAvailableBalance,
    currency: wallet.currency,
  });
  emitUserEvent(wallet.user_id, 'wallet_notification', {
    type: 'available_balance_updated',
    messageEn: 'Your withdrawable wallet amount was updated.',
    messageAr: 'تم تحديث المقدار القابل للسحب في محفظتك.',
  });

  await notifyUser(wallet.user_id, {
    type: 'available_balance_updated',
    title: 'Withdrawable Amount Updated',
    message: 'Your withdrawable wallet amount was updated by admin.',
    data: {
      withdrawableAmount: newAvailableBalance,
      currency: wallet.currency,
    },
  });

  return {
    wallet: { ...wallet, available_balance: newAvailableBalance }
  };
}

export async function getAllWallets(): Promise<
  (Wallet & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
  })[]
> {
  await pool.query(
    `INSERT INTO wallets (user_id, balance, available_balance, currency)
     SELECT u.id, 0, 0, 'OMR'
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE w.id IS NULL`
  );

  const result = await pool.query(
    `SELECT w.*, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone_number,
            u.profile_image as user_profile_image,
            COALESCE(SUM(CASE WHEN wt.type = 'WITHDRAWAL_REQUEST' AND wt.status = 'PENDING' THEN ABS(wt.amount) ELSE 0 END), 0)::numeric AS blocked_balance
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
     GROUP BY w.id, u.full_name, u.email, u.phone_number, u.profile_image
     ORDER BY u.full_name`
  );
  return result.rows.map(row => ({
    ...row,
    balance: parseFloat(row.balance as string),
    available_balance: parseFloat(row.available_balance as string),
    blocked_balance: parseFloat(row.blocked_balance as string),
  }));
}

export async function adminResetWallet(userId: string): Promise<Wallet> {
  await ensureWalletTopupPaymentsTable();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (!walletResult.rows[0]) {
      walletResult = await client.query(
        `INSERT INTO wallets (user_id, balance, available_balance, currency)
         VALUES ($1, 0, 0, 'OMR')
         RETURNING *`,
        [userId]
      );
    }

    const wallet = walletResult.rows[0];
    const walletId = String(wallet.id);

    await client.query(`DELETE FROM wallet_topup_payments WHERE wallet_id = $1`, [walletId]);
    await client.query(`DELETE FROM wallet_transactions WHERE wallet_id = $1`, [walletId]);
    await client.query(
      `UPDATE wallets
       SET balance = 0,
           available_balance = 0,
           updated_at = NOW()
       WHERE id = $1`,
      [walletId]
    );

    const refreshedWalletResult = await client.query(
      `SELECT * FROM wallets WHERE id = $1`,
      [walletId]
    );

    await client.query('COMMIT');

    return {
      ...refreshedWalletResult.rows[0],
      balance: 0,
      available_balance: 0,
      blocked_balance: 0,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const generateTopupReference = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TOPUP-${timestamp}-${random}`;
};

export async function createWalletTopupPayment(data: {
  userId: string;
  amount: number;
  currency?: string;
  gateway?: string;
  paymentUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<WalletTopupPayment> {
  await ensureWalletTopupPaymentsTable();

  const wallet = await getWalletByUserId(data.userId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const reference = generateTopupReference();
  const result = await pool.query(
    `INSERT INTO wallet_topup_payments
      (reference, user_id, wallet_id, amount, currency, gateway, status, payment_url, metadata)
     VALUES
      ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
     RETURNING *`,
    [
      reference,
      data.userId,
      wallet.id,
      data.amount,
      data.currency ?? wallet.currency,
      data.gateway ?? 'PENDING_GATEWAY',
      data.paymentUrl ?? null,
      JSON.stringify(data.metadata ?? {}),
    ]
  );

  const row = result.rows[0];
  return {
    ...row,
    amount: parseFloat(row.amount as string),
    metadata: row.metadata ?? {},
  };
}

export async function updateWalletTopupPaymentGatewayData(data: {
  reference: string;
  gateway?: string;
  paymentUrl?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<WalletTopupPayment> {
  await ensureWalletTopupPaymentsTable();

  const result = await pool.query(
    `UPDATE wallet_topup_payments
     SET gateway = COALESCE($2::varchar, gateway),
         payment_url = COALESCE($3::text, payment_url),
         metadata = CASE
           WHEN $4::jsonb IS NULL THEN metadata
           ELSE COALESCE(metadata, '{}'::jsonb) || $4::jsonb
         END,
         updated_at = NOW()
     WHERE reference = $1
     RETURNING *`,
    [
      data.reference,
      data.gateway ?? null,
      data.paymentUrl ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );

  if (!result.rows[0]) {
    throw new Error('Topup payment not found');
  }

  const row = result.rows[0];
  return {
    ...row,
    amount: parseFloat(row.amount as string),
    metadata: row.metadata ?? {},
  };
}

export async function getWalletTopupPaymentByReference(reference: string): Promise<WalletTopupPayment | null> {
  await ensureWalletTopupPaymentsTable();

  const result = await pool.query(
    `SELECT * FROM wallet_topup_payments WHERE reference = $1 LIMIT 1`,
    [reference]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    amount: parseFloat(row.amount as string),
    metadata: row.metadata ?? {},
  };
}

export async function getWalletTopupPaymentForUser(reference: string, userId: string): Promise<WalletTopupPayment | null> {
  await ensureWalletTopupPaymentsTable();

  const result = await pool.query(
    `SELECT * FROM wallet_topup_payments WHERE reference = $1 AND user_id = $2 LIMIT 1`,
    [reference, userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    amount: parseFloat(row.amount as string),
    metadata: row.metadata ?? {},
  };
}

export async function listWalletTopupPaymentsForAdmin(options?: {
  status?: WalletTopupPaymentStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  payments: (WalletTopupPayment & {
    user_full_name: string;
    user_email: string;
    user_phone_number: string;
    user_profile_image: string | null;
    total_count: number;
  })[];
  total: number;
}> {
  await ensureWalletTopupPaymentsTable();

  const status = options?.status ?? 'ALL';
  const search = options?.search?.trim() ?? '';
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 15));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ['1=1'];
  const params: Array<string | number> = [];

  if (status !== 'ALL') {
    params.push(status);
    whereClauses.push(`tp.status = $${params.length}`);
  }

  if (search.length > 0) {
    params.push(`%${search}%`);
    const searchIndex = params.length;
    whereClauses.push(`(
      u.full_name ILIKE $${searchIndex}
      OR u.email ILIKE $${searchIndex}
      OR u.phone_number ILIKE $${searchIndex}
      OR tp.reference ILIKE $${searchIndex}
      OR COALESCE(tp.gateway_transaction_id, '') ILIKE $${searchIndex}
    )`);
  }

  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const result = await pool.query(
    `SELECT tp.*, u.full_name as user_full_name, u.email as user_email,
            u.phone_number as user_phone_number, u.profile_image as user_profile_image,
            COUNT(*) OVER()::int as total_count
     FROM wallet_topup_payments tp
     JOIN users u ON u.id = tp.user_id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY tp.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params
  );

  const payments = result.rows.map((row) => ({
    ...row,
    amount: parseFloat(row.amount as string),
    metadata: row.metadata ?? {},
    total_count: Number(row.total_count ?? 0),
  }));

  const total = payments[0]?.total_count ?? 0;
  return { payments, total };
}

export async function getWalletTopupAnalyticsSummary(): Promise<{
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  failedPayments: number;
  cancelledPayments: number;
  paidAmount: number;
  monthPaidAmount: number;
}> {
  await ensureWalletTopupPaymentsTable();

  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_payments,
       COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_payments,
       COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_payments,
       COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed_payments,
       COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_payments,
       COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)::numeric AS paid_amount,
       COALESCE(SUM(amount) FILTER (WHERE status = 'PAID' AND created_at >= date_trunc('month', NOW())), 0)::numeric AS month_paid_amount
     FROM wallet_topup_payments`
  );

  const row = result.rows[0] ?? {};

  return {
    totalPayments: Number(row.total_payments ?? 0),
    paidPayments: Number(row.paid_payments ?? 0),
    pendingPayments: Number(row.pending_payments ?? 0),
    failedPayments: Number(row.failed_payments ?? 0),
    cancelledPayments: Number(row.cancelled_payments ?? 0),
    paidAmount: parseFloat(String(row.paid_amount ?? 0)),
    monthPaidAmount: parseFloat(String(row.month_paid_amount ?? 0)),
  };
}

export async function updateWalletTopupPaymentStatus(data: {
  reference: string;
  status: WalletTopupPaymentStatus;
  gatewayTransactionId?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}): Promise<WalletTopupPayment> {
  await ensureWalletTopupPaymentsTable();

  const client = await pool.connect();
  let topupWhatsappPayload: {
    userId: string;
    reference: string;
    amount: number;
    currency: string;
    balance: number;
  } | null = null;

  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `SELECT * FROM wallet_topup_payments WHERE reference = $1 FOR UPDATE`,
      [data.reference]
    );

    if (!paymentResult.rows[0]) {
      throw new Error('Topup payment not found');
    }

    const payment = paymentResult.rows[0] as WalletTopupPayment;

    // Idempotency: if already in the same status, return current record
    if (payment.status === data.status) {
      await client.query('COMMIT');
      return {
        ...payment,
        amount: parseFloat((payment as unknown as { amount: string }).amount),
        metadata: payment.metadata ?? {},
      };
    }

    if (payment.status === 'PAID') {
      throw new Error('Paid topup cannot be changed');
    }

    const nextMetadata = {
      ...(payment.metadata ?? {}),
      ...(data.metadata ?? {}),
    };

    const updatedResult = await client.query(
      `UPDATE wallet_topup_payments
       SET status = $1::varchar,
         gateway_transaction_id = COALESCE($2::varchar, gateway_transaction_id),
         failure_reason = $3::text,
         metadata = $4::jsonb,
         paid_at = CASE WHEN $1::varchar = 'PAID' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        data.status,
        data.gatewayTransactionId ?? null,
        data.failureReason ?? null,
        JSON.stringify(nextMetadata),
        payment.id,
      ]
    );

    const updatedPayment = updatedResult.rows[0] as WalletTopupPayment;

    if (data.status === 'PAID') {
      const walletResult = await client.query(
        `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`,
        [updatedPayment.wallet_id]
      );

      const wallet = walletResult.rows[0] as Wallet;
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat((wallet as unknown as { balance: string }).balance);
      const currentAvailableBalance = parseFloat((wallet as unknown as { available_balance: string }).available_balance);
      const paymentAmount = parseFloat((updatedPayment as unknown as { amount: string }).amount);

      const newBalance = currentBalance + paymentAmount;
      const newAvailableBalance = currentAvailableBalance;

      await client.query(
        `UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3`,
        [newBalance, newAvailableBalance, wallet.id]
      );

      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          wallet.id,
          paymentAmount,
          'TOPUP_GATEWAY',
          `Wallet top-up paid (${updatedPayment.reference})`,
          'COMPLETED',
        ]
      );

      try {
        emitAdminEvent('wallet_updated', {
          user_id: wallet.user_id,
          balance: newBalance,
          available_balance: newAvailableBalance,
          currency: wallet.currency,
        });
      } catch (eventError) {
        console.error('Failed to emit admin wallet event after top-up payment:', eventError);
      }

      try {
        emitUserEvent(wallet.user_id, 'wallet_updated', {
          balance: newBalance,
          available_balance: newAvailableBalance,
          currency: wallet.currency,
        });
      } catch (eventError) {
        console.error('Failed to emit user wallet event after top-up payment:', eventError);
      }

      topupWhatsappPayload = {
        userId: wallet.user_id,
        reference: updatedPayment.reference,
        amount: paymentAmount,
        currency: String(wallet.currency || updatedPayment.currency || 'OMR'),
        balance: newBalance,
      };
    }

    await client.query('COMMIT');

    if (topupWhatsappPayload) {
      void sendUserTransactionWhatsApp({
        userId: topupWhatsappPayload.userId,
        key: 'wallet_topup_paid',
        vars: {
          reference: topupWhatsappPayload.reference,
          amount: topupWhatsappPayload.amount,
          currency: topupWhatsappPayload.currency,
          balance: topupWhatsappPayload.balance,
        },
      }).catch((error) => {
        console.error('Failed to send wallet top-up WhatsApp message:', error);
      });

      void (async () => {
        try {
          const owner = await getUserById(topupWhatsappPayload.userId);
          await sendPaymentAdminNotifications({
            source: 'walletTopup',
            entityId: updatedPayment.id,
            reference: updatedPayment.reference,
            amount: topupWhatsappPayload.amount,
            currency: topupWhatsappPayload.currency,
            customerName: owner?.fullName ?? null,
            paymentMethod: updatedPayment.gateway,
            adminPath: '/admin/payments',
          });
        } catch (error) {
          console.error('Failed to send admin wallet top-up alerts:', error);
        }
      })();
    }

    return {
      ...updatedPayment,
      amount: parseFloat((updatedPayment as unknown as { amount: string }).amount),
      metadata: updatedPayment.metadata ?? {},
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
