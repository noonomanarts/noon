import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import type { PaymentMethod } from '@/lib/db/types';
import { getUserById } from '@/lib/db/users';
import { adminAddWalletCredit, adminDeductWalletCredit, addBonusPoints } from '@/lib/db/wallet';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

type ActionType = 'TOPUP' | 'DEDUCT' | 'ENROLL_AND_DEDUCT';

type ParticipantPayload = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
  isFreePartner?: boolean;
};

type Payload = {
  action?: ActionType;
  paymentMethod?: PaymentMethod;
  userId?: string;
  amount?: number;
  description?: string;
  numberOfParticipants?: number;
  participants?: unknown;
  freePartners?: unknown;
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

function normalizePaymentMethod(value: unknown): PaymentMethod {
  if (value === 'CASH' || value === 'ONLINE' || value === 'BANK_TRANSFER' || value === 'WALLET') {
    return value;
  }

  return 'WALLET';
}

function parseParticipants(value: unknown, isFreePartner = false): ParticipantPayload[] {
  if (!Array.isArray(value)) return [];

  const participants: ParticipantPayload[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rawParticipant of value) {
    if (!rawParticipant || typeof rawParticipant !== 'object') continue;
    const row = rawParticipant as Record<string, unknown>;
    const fullName = normalizeText(row.fullName, 240);
    const dateOfBirth = normalizeText(row.dateOfBirth, 20);
    const preferredLanguage = normalizeText(row.preferredLanguage, 10);

    if (!fullName || !dateOfBirth) {
      continue;
    }

    if (preferredLanguage !== 'en' && preferredLanguage !== 'ar') {
      continue;
    }

    const dob = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime()) || dob.getTime() > today.getTime()) {
      continue;
    }

    participants.push({
      fullName,
      dateOfBirth,
      preferredLanguage: preferredLanguage as 'en' | 'ar',
      isFreePartner,
    });

    if (participants.length >= 10) break;
  }

  return participants;
}

function normalizeParticipantCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function calculateAgeFromDateString(dateOfBirth: string, today: Date): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
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
  const paymentMethod = normalizePaymentMethod(body.paymentMethod);
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

    const numberOfParticipants = normalizeParticipantCount(body.numberOfParticipants);
    const participants = parseParticipants(body.participants);
    const freePartners = parseParticipants(body.freePartners, true);
    const storedParticipants = [...participants, ...freePartners];
    const specialRequests = normalizeText(body.specialRequests, 2000) || null;

    if (!Number.isInteger(numberOfParticipants) || numberOfParticipants < 1 || numberOfParticipants > 10) {
      return NextResponse.json({ error: 'Invalid number of participants' }, { status: 400 });
    }

    if (participants.length !== numberOfParticipants) {
      return NextResponse.json({ error: 'Participants data is incomplete' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const classResult = await client.query(
        `SELECT id, title, title_ar, price, currency, seats_total, seats_booked, status, start_date_time, sub_category, minimum_age
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
        throw new ApiError('Class is not available for admin enrollment', 409);
      }

      const seatsTotal = Number(classRow.seats_total ?? 0);
      const seatsBooked = Number(classRow.seats_booked ?? 0);
      if (seatsBooked + numberOfParticipants > seatsTotal) {
        throw new ApiError('No available seats', 409);
      }

      const minimumAge = classRow.minimum_age != null ? Number(classRow.minimum_age) : null;
      if (minimumAge != null && minimumAge > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const participant of participants) {
          const age = calculateAgeFromDateString(participant.dateOfBirth, today);
          if (age < minimumAge) {
            throw new ApiError(`A participant is below the minimum age requirement (${minimumAge} years).`, 400);
          }
        }
      }

      if (String(classRow.sub_category || '') === 'MOM_AND_KID') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ages = participants.map((participant) => calculateAgeFromDateString(participant.dateOfBirth, today));
        if (ages.some((age) => age < 5)) {
          throw new ApiError('Children under 5 are not accepted in this workshop.', 400);
        }
        const childrenNeedingPartnerCount = ages.filter((age) => age >= 5 && age <= 9).length;
        const partnerAges = freePartners.map((participant) => calculateAgeFromDateString(participant.dateOfBirth, today));
        if (childrenNeedingPartnerCount > 0 && (
          freePartners.length < childrenNeedingPartnerCount
          || partnerAges.some((age) => age < 10)
        )) {
          throw new ApiError('Children aged 5-9 must be registered with a 10+ partner, and both names must be provided.', 400);
        }
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

      let newBalance: number | null = null;
      let newAvailable: number | null = null;

      if (paymentMethod === 'WALLET') {
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

        newBalance = Number((walletBalance - amount).toFixed(3));
        newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));

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
      }

      let bookingRow: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const bookingResult = await client.query(
            `INSERT INTO bookings (
               booking_number, user_id, class_id, participants, number_of_participants,
               total_amount, currency, status, payment_method, payment_status, paid_at,
               terms_accepted, terms_accepted_at, special_requests, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4::jsonb, $5,
               $6, $7, 'CONFIRMED', $8, 'PAID', NOW(),
               TRUE, NOW(), $9, NOW(), NOW()
             )
             RETURNING id, booking_number`,
            [
              generateBookingNumber(),
              userId,
              params.classId,
              JSON.stringify(storedParticipants),
              numberOfParticipants,
              amount,
              classCurrency,
              paymentMethod,
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
         SET seats_booked = seats_booked + $2,
             seats_available = GREATEST(0, seats_total - (seats_booked + $2)),
             updated_at = NOW()
         WHERE id = $1`,
        [params.classId, numberOfParticipants]
      );

      await client.query('COMMIT');

      void addBonusPoints(userId, amount).catch(() => {});

      void sendUserTransactionWhatsApp({
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
          paymentMethod,
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
