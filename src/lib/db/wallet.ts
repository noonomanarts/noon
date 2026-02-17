import { pool } from './pool';
import { emitAdminEvent, emitUserEvent } from '@/lib/realtime/adminEvents';
import { notifyRole, notifyUser } from '@/lib/notificationService';
import type { Wallet, WalletTransaction, LoyaltyCard } from './types';

let walletDecisionColumnsCache: boolean | null = null;

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
  const newAvailableBalance = wallet.available_balance + amount;
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

  return {
    wallet: { ...wallet, available_balance: newAvailableBalance }
  };
}

export async function getAllWallets(): Promise<(Wallet & { user_full_name: string; user_email: string; user_phone_number: string })[]> {
  const result = await pool.query(
    `SELECT w.*, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone_number,
            COALESCE(SUM(CASE WHEN wt.type = 'WITHDRAWAL_REQUEST' AND wt.status = 'PENDING' THEN ABS(wt.amount) ELSE 0 END), 0)::numeric AS blocked_balance
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
     GROUP BY w.id, u.full_name, u.email, u.phone_number
     ORDER BY u.full_name`
  );
  return result.rows.map(row => ({
    ...row,
    balance: parseFloat(row.balance as string),
    available_balance: parseFloat(row.available_balance as string),
    blocked_balance: parseFloat(row.blocked_balance as string),
  }));
}