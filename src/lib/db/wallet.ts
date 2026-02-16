import { pool } from './pool';
import type { Wallet, WalletTransaction, LoyaltyCard } from './types';

export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  const result = await pool.query(
    'SELECT * FROM wallets WHERE user_id = $1',
    [userId]
  );
  if (result.rows[0]) {
    return {
      ...result.rows[0],
      balance: parseFloat(result.rows[0].balance as string),
      available_balance: parseFloat(result.rows[0].available_balance as string),
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
    await client.query(
      'UPDATE wallets SET balance = balance - $1, available_balance = available_balance - $1, updated_at = NOW() WHERE user_id = $2',
      [amount, fromUserId]
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
}

export async function requestWalletWithdrawal(userId: string, amount: number, reason?: string): Promise<WalletTransaction> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.available_balance < amount) throw new Error('Insufficient available balance');

  // Create a withdrawal request transaction with PENDING status
  const transaction = await addWalletTransaction(wallet.id, -amount, 'WITHDRAWAL_REQUEST', reason, 'PENDING');
  return transaction;
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
      'SELECT * FROM wallets WHERE id = $1 FOR UPDATE',
      [transaction.wallet_id]
    );
    const wallet = walletResult.rows[0];
    if (!wallet || parseFloat(wallet.available_balance as string) < amount) {
      throw new Error('Insufficient available balance');
    }

    // Update wallet balances
    const newBalance = parseFloat(wallet.balance as string) - amount;
    const newAvailableBalance = parseFloat(wallet.available_balance as string) - amount;
    await client.query(
      'UPDATE wallets SET balance = $1, available_balance = $2, updated_at = NOW() WHERE id = $3',
      [newBalance, newAvailableBalance, wallet.id]
    );

    // Update transaction status
    const reason = adminReason ? `${transaction.reason || ''} - Approved: ${adminReason}` : transaction.reason;
    await client.query(
      'UPDATE wallet_transactions SET status = $1, reason = $2, updated_at = NOW() WHERE id = $3',
      ['APPROVED', reason, transactionId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectWithdrawalRequest(transactionId: string, adminReason?: string): Promise<void> {
  const reason = adminReason ? `Rejected: ${adminReason}` : 'Rejected by admin';
  await pool.query(
    'UPDATE wallet_transactions SET status = $1, reason = $2, updated_at = NOW() WHERE id = $3',
    ['REJECTED', reason, transactionId]
  );
}

export async function adminAddWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');

  const newBalance = wallet.balance + amount;
  const newAvailableBalance = wallet.available_balance + amount;
  await updateWalletBalances(wallet.id, newBalance, newAvailableBalance);
  const transaction = await addWalletTransaction(wallet.id, amount, 'ADMIN_CREDIT', reason);

  return {
    wallet: { ...wallet, balance: newBalance, available_balance: newAvailableBalance },
    transaction
  };
}

export async function adminDeductWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.available_balance < amount) throw new Error('Insufficient available balance');

  const newBalance = wallet.balance - amount;
  const newAvailableBalance = wallet.available_balance - amount;
  await updateWalletBalances(wallet.id, newBalance, newAvailableBalance);
  const transaction = await addWalletTransaction(wallet.id, -amount, 'ADMIN_DEDUCT', reason);

  return {
    wallet: { ...wallet, balance: newBalance, available_balance: newAvailableBalance },
    transaction
  };
}

export async function adminUpdateWalletAvailableBalance(userId: string, newAvailableBalance: number): Promise<{ wallet: Wallet }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (newAvailableBalance < 0) throw new Error('Available balance cannot be negative');
  if (newAvailableBalance > wallet.balance) throw new Error('Available balance cannot exceed total balance');

  await updateWalletAvailableBalance(wallet.id, newAvailableBalance);

  return {
    wallet: { ...wallet, available_balance: newAvailableBalance }
  };
}

export async function getAllWallets(): Promise<(Wallet & { user_full_name: string; user_email: string; user_phone_number: string })[]> {
  const result = await pool.query(
    `SELECT w.*, u.full_name as user_full_name, u.email as user_email, u.phone_number as user_phone_number
     FROM wallets w
     JOIN users u ON w.user_id = u.id
     ORDER BY u.full_name`
  );
  return result.rows.map(row => ({
    ...row,
    balance: parseFloat(row.balance as string),
    available_balance: parseFloat(row.available_balance as string),
  }));
}