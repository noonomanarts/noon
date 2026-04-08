import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { adminAddWalletCredit, adminDeductWalletCredit, addBonusPoints } from '@/lib/db/wallet';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

type ActionType = 'TOPUP' | 'DEDUCT' | 'ENROLL_AND_DEDUCT';

type Payload = {
  action?: ActionType;
  userId?: string;
  amount?: number;
  description?: string;
  participantName?: string;
  participantDateOfBirth?: string;
  participantPreferredLanguage?: 'en' | 'ar';
  specialRequests?: string;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function generateBookingNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ADM-CLS-${y}${m}${d}-${random}`;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

export async function POST(request: NextRequest, props: { params: Promise<{ classId: string }> }) {
  const params = await props.params;

  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Payload;

    const action = body.action;
    const userId = normalizeText(body.userId, 64);
    const amount = Number(body.amount);

    if (!action || (action !== 'TOPUP' && action !== 'DEDUCT' && action !== 'ENROLL_AND_DEDUCT')) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User is required' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    if (action === 'TOPUP') {
      const result = await adminAddWalletCredit(
        userId,
        amount,
        normalizeText(body.description, 300) || `Admin class-context top-up (${params.classId})`
      );

      return NextResponse.json({
        success: true,
        action,
        wallet: {
          balance: result.wallet.balance,
          available_balance: result.wallet.available_balance,
          currency: result.wallet.currency,
        },
      });
    }

    if (action === 'DEDUCT') {
      const result = await adminDeductWalletCredit(
        userId,
        amount,
        normalizeText(body.description, 300) || `Admin class-context deduction (${params.classId})`
      );

      return NextResponse.json({
        success: true,
        action,
        wallet: {
          balance: result.wallet.balance,
          available_balance: result.wallet.available_balance,
          currency: result.wallet.currency,
        },
      });
    }

    const participantName = normalizeText(body.participantName, 240);
    const participantDateOfBirth = normalizeText(body.participantDateOfBirth, 20);
    const preferredLanguage = body.participantPreferredLanguage === 'ar' ? 'ar' : 'en';
    const specialRequests = normalizeText(body.specialRequests, 2000) || null;

    if (!participantName || !participantDateOfBirth) {
      return NextResponse.json({ error: 'Participant name and date of birth are required' }, { status: 400 });
    }

    const dob = new Date(`${participantDateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime()) || dob.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Invalid participant date of birth' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const classResult = await client.query(
        `SELECT id, title, title_ar, price, currency, seats_total, seats_booked, status, start_date_time
         FROM classes
         WHERE id = $1
         FOR UPDATE`,
        [params.classId]
      );

      const classRow = classResult.rows[0];
      if (!classRow) {
        throw new ApiError('Class not found', 404);
      }

      if (classRow.status !== 'PUBLISHED') {
        throw new ApiError('Class is not published', 409);
      }

      if (classRow.start_date_time) {
        const startTime = new Date(classRow.start_date_time as string);
        if (startTime.getTime() < Date.now()) {
          throw new ApiError('Cannot enroll in a class that already started', 409);
        }
      }

      const seatsTotal = Number(classRow.seats_total ?? 0);
      const seatsBooked = Number(classRow.seats_booked ?? 0);
      if (seatsBooked + 1 > seatsTotal) {
        throw new ApiError('No available seats', 409);
      }

      const classCurrency = String(classRow.currency || 'OMR');

      const userResult = await client.query(
        `SELECT id, full_name, preferred_language
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [userId]
      );
      const targetUser = userResult.rows[0];
      if (!targetUser) {
        throw new ApiError('User not found', 404);
      }

      const duplicateBookingResult = await client.query(
        `SELECT 1
         FROM bookings
         WHERE class_id = $1
           AND user_id = $2
           AND status IN ('PENDING', 'CONFIRMED', 'COMPLETED')
           AND payment_status = 'PAID'
         LIMIT 1`,
        [params.classId, userId]
      );

      if ((duplicateBookingResult.rowCount ?? 0) > 0) {
        throw new ApiError('This user is already enrolled in this class', 409);
      }

      let walletResult = await client.query(
        `SELECT id, balance, available_balance, currency
         FROM wallets
         WHERE user_id = $1
         FOR UPDATE`,
        [userId]
      );

      if (walletResult.rows.length === 0) {
        walletResult = await client.query(
          `INSERT INTO wallets (user_id, balance, available_balance, currency)
           VALUES ($1, 0, 0, $2)
           RETURNING id, balance, available_balance, currency`,
          [userId, classCurrency]
        );
      }

      const wallet = walletResult.rows[0];
      const walletBalance = Number(wallet.balance ?? 0);
      const walletAvailable = Number(wallet.available_balance ?? wallet.balance ?? 0);
      const walletCurrency = String(wallet.currency || classCurrency);

      if (walletCurrency !== classCurrency) {
        throw new ApiError('Wallet currency does not match class currency', 409);
      }

      if (walletBalance < amount) {
        throw new ApiError('Insufficient wallet balance', 409);
      }

      const newBalance = Number((walletBalance - amount).toFixed(3));
      const newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));

      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
         VALUES ($1, $2, 'CLASS_BOOKING', $3, 'COMPLETED')`,
        [wallet.id, -amount, `Admin class enrollment payment - ${String(classRow.title)}`]
      );

      await client.query(
        `UPDATE wallets
         SET balance = $1, available_balance = $2, updated_at = NOW()
         WHERE id = $3`,
        [newBalance, newAvailable, wallet.id]
      );

      const participants = [
        {
          fullName: participantName,
          dateOfBirth: participantDateOfBirth,
          preferredLanguage,
        },
      ];

      let bookingRow: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const bookingResult = await client.query(
            `INSERT INTO bookings (
               booking_number, user_id, class_id, participants, number_of_participants,
               total_amount, currency, status, payment_method, payment_status, paid_at,
               terms_accepted, terms_accepted_at, special_requests, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4::jsonb, 1,
               $5, $6, 'CONFIRMED', 'WALLET', 'PAID', NOW(),
               TRUE, NOW(), $7, NOW(), NOW()
             )
             RETURNING id, booking_number`,
            [
              generateBookingNumber(),
              userId,
              params.classId,
              JSON.stringify(participants),
              amount,
              classCurrency,
              specialRequests,
            ]
          );
          bookingRow = bookingResult.rows[0];
          break;
        } catch (error) {
          const pgError = error as { code?: string; constraint?: string };
          const duplicate = pgError.code === '23505' && pgError.constraint === 'bookings_booking_number_key';
          if (!duplicate || attempt === 4) {
            throw error;
          }
        }
      }

      await client.query(
        `UPDATE classes
         SET seats_booked = seats_booked + 1,
             seats_available = GREATEST(0, seats_total - (seats_booked + 1)),
             updated_at = NOW()
         WHERE id = $1`,
        [params.classId]
      );

      await client.query('COMMIT');

      void addBonusPoints(userId, amount).catch(() => {});

      await sendUserTransactionWhatsApp({
        userId,
        key: 'class_booking_paid',
        vars: {
          amount,
          currency: classCurrency,
          balance: newBalance,
          classTitle: (classRow.title_ar as string | null) || String(classRow.title || ''),
        },
      }).catch((error) => {
        console.error('Failed to send admin class booking WhatsApp message:', error);
      });

      return NextResponse.json({
        success: true,
        action,
        booking: {
          id: bookingRow?.id ?? null,
          bookingNumber: bookingRow?.booking_number ?? null,
          amount,
          currency: classCurrency,
        },
        wallet: {
          balance: newBalance,
          available_balance: newAvailable,
          currency: classCurrency,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Failed class member-wallet operation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
