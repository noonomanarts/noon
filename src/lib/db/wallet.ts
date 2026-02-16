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
    };
  }
  return null;
}

export async function createWallet(userId: string, currency = 'OMR'): Promise<Wallet> {
  const result = await pool.query(
    'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, $2) RETURNING *',
    [userId, currency]
  );
  return {
    ...result.rows[0],
    balance: parseFloat(result.rows[0].balance as string),
  };
}

export async function updateWalletBalance(walletId: string, newBalance: number): Promise<void> {
  await pool.query(
    'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
    [newBalance, walletId]
  );
}

export async function addWalletTransaction(
  walletId: string,
  amount: number,
  type: string,
  reason?: string
): Promise<WalletTransaction> {
  const result = await pool.query(
    'INSERT INTO wallet_transactions (wallet_id, amount, type, reason) VALUES ($1, $2, $3, $4) RETURNING *',
    [walletId, amount, type, reason]
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
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
      [amount, fromUserId]
    );
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
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

  await updateWalletBalance(wallet.id, wallet.balance + amount);
  await addWalletTransaction(wallet.id, amount, 'DEPOSIT', reason);
}

export async function withdrawFromWallet(userId: string, amount: number, reason?: string): Promise<void> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance < amount) throw new Error('Insufficient balance');

  await updateWalletBalance(wallet.id, wallet.balance - amount);
  await addWalletTransaction(wallet.id, -amount, 'WITHDRAWAL', reason);
}

// Admin functions
export async function adminAddWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');

  const newBalance = wallet.balance + amount;
  await updateWalletBalance(wallet.id, newBalance);
  const transaction = await addWalletTransaction(wallet.id, amount, 'ADMIN_CREDIT', reason);

  return {
    wallet: { ...wallet, balance: newBalance },
    transaction
  };
}

export async function adminDeductWalletCredit(userId: string, amount: number, reason?: string): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
  const wallet = await getWalletByUserId(userId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.balance < amount) throw new Error('Insufficient balance');

  const newBalance = wallet.balance - amount;
  await updateWalletBalance(wallet.id, newBalance);
  const transaction = await addWalletTransaction(wallet.id, -amount, 'ADMIN_DEDUCT', reason);

  return {
    wallet: { ...wallet, balance: newBalance },
    transaction
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
  }));
}