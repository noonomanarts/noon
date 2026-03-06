import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ParticipantPayload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
};

function parseSafeString(value: unknown, maxLength = 255): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseParticipants(value: unknown): ParticipantPayload[] {
  if (!Array.isArray(value)) return [];

  const participants: ParticipantPayload[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rawParticipant of value) {
    if (!rawParticipant || typeof rawParticipant !== 'object') continue;
    const row = rawParticipant as Record<string, unknown>;
    const firstName = parseSafeString(row.firstName, 120);
    const middleName = parseSafeString(row.middleName, 120);
    const lastName = parseSafeString(row.lastName, 120);
    const dateOfBirth = parseSafeString(row.dateOfBirth, 20);
    const preferredLanguage = parseSafeString(row.preferredLanguage, 10);

    if (!firstName || !lastName || !dateOfBirth) {
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
      firstName,
      middleName: middleName || undefined,
      lastName,
      dateOfBirth,
      preferredLanguage: preferredLanguage as 'en' | 'ar',
    });

    if (participants.length >= 10) break;
  }

  return participants;
}

function normalizeParticipantCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function generateBookingNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLS-${y}${m}${d}-${random}`;
}

type ParticipantWithFullName = ParticipantPayload & { fullName: string };

async function insertBookingWithRetry(args: {
  client: {
    query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  };
  userId: string;
  classId: string;
  sessionId: string;
  participants: ParticipantWithFullName[];
  numberOfParticipants: number;
  totalAmount: number;
  currency: string;
  specialRequests: string | null;
}): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await args.client.query(
        `INSERT INTO bookings (
           booking_number, user_id, class_id, session_id, participants, number_of_participants,
           total_amount, currency, status, payment_method, payment_status, paid_at,
           terms_accepted, terms_accepted_at, special_requests, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5::jsonb, $6, $7, $8, 'CONFIRMED', 'WALLET', 'PAID', NOW(),
           TRUE, NOW(), $9, NOW(), NOW()
         )
         RETURNING id, booking_number, total_amount, currency, number_of_participants`,
        [
          generateBookingNumber(),
          args.userId,
          args.classId,
          args.sessionId,
          JSON.stringify(args.participants),
          args.numberOfParticipants,
          args.totalAmount,
          args.currency,
          args.specialRequests,
        ]
      );

      return result.rows[0];
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      const isBookingNumberConflict =
        pgError.code === '23505' && pgError.constraint === 'bookings_booking_number_key';
      if (isBookingNumberConflict && attempt < 4) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError('Unable to generate booking number', 500);
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(sessionId);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const classId = parseSafeString(body.classId, 64);
  const sessionIdInput = parseSafeString(body.sessionId, 64);
  const numberOfParticipants = normalizeParticipantCount(body.numberOfParticipants);
  const termsAccepted = body.termsAccepted === true;
  const specialRequests = parseSafeString(body.specialRequests, 3000);
  const participants = parseParticipants(body.participants);

  if (!UUID_PATTERN.test(classId) || !UUID_PATTERN.test(sessionIdInput)) {
    return NextResponse.json({ error: 'Invalid class/session identifier' }, { status: 400 });
  }

  if (!Number.isInteger(numberOfParticipants) || numberOfParticipants < 1 || numberOfParticipants > 10) {
    return NextResponse.json({ error: 'Invalid number of participants' }, { status: 400 });
  }

  if (participants.length !== numberOfParticipants) {
    return NextResponse.json({ error: 'Participants data is incomplete' }, { status: 400 });
  }

  if (!termsAccepted) {
    return NextResponse.json({ error: 'You must accept terms and conditions' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const classSessionResult = await client.query(
      `SELECT c.id AS class_id, c.title, c.title_ar, c.price, c.currency, c.seats_total AS class_seats_total, c.status AS class_status,
              s.id AS session_id, s.start_date_time, s.seats_total AS session_seats_total, s.seats_booked, s.is_cancelled
       FROM classes c
       JOIN class_sessions s ON s.class_id = c.id
       WHERE c.id = $1 AND s.id = $2
       FOR UPDATE OF s`,
      [classId, sessionIdInput]
    );

    const classSession = classSessionResult.rows[0];
    if (!classSession) {
      throw new ApiError('Class session not found', 404);
    }

    if (classSession.class_status !== 'PUBLISHED') {
      throw new ApiError('Class is not available for booking', 409);
    }

    if (classSession.is_cancelled) {
      throw new ApiError('Selected session is cancelled', 409);
    }

    const sessionStart = new Date(classSession.start_date_time as string);
    if (sessionStart.getTime() < Date.now()) {
      throw new ApiError('Selected session has already started', 409);
    }

    const sessionSeatsTotal =
      classSession.session_seats_total !== null
        ? Number(classSession.session_seats_total)
        : Number(classSession.class_seats_total);
    const sessionSeatsBooked = Number(classSession.seats_booked ?? 0);

    if (!Number.isFinite(sessionSeatsTotal) || sessionSeatsTotal <= 0) {
      throw new ApiError('Selected session cannot be booked right now', 409);
    }

    const seatsAvailable = Math.max(0, sessionSeatsTotal - sessionSeatsBooked);

    if (numberOfParticipants > seatsAvailable) {
      throw new ApiError('Not enough seats available in this session', 409);
    }

    let walletResult = await client.query(
      `SELECT id, user_id, balance, available_balance, currency
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [user.id]
    );

    if (walletResult.rows.length === 0) {
      walletResult = await client.query(
        `INSERT INTO wallets (user_id, balance, available_balance, currency)
         VALUES ($1, 0, 0, 'OMR')
         RETURNING id, user_id, balance, available_balance, currency`,
        [user.id]
      );
    }

    const wallet = walletResult.rows[0];
    const walletBalance = Number(wallet.balance ?? 0);
    const walletAvailable = Number(wallet.available_balance ?? wallet.balance ?? 0);
    const unitPrice = Number(classSession.price ?? 0);
    const bookingCurrency = (classSession.currency as string) || 'OMR';
    const totalAmount = Number((unitPrice * numberOfParticipants).toFixed(3));

    if ((wallet.currency as string) !== bookingCurrency) {
      throw new ApiError('Wallet currency does not match class currency', 409);
    }

    if (walletBalance < totalAmount || walletAvailable < totalAmount) {
      throw new ApiError('Insufficient wallet balance', 409);
    }

    const newBalance = Number((walletBalance - totalAmount).toFixed(3));
    const newAvailable = Number((walletAvailable - totalAmount).toFixed(3));

    const walletTxResult = await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [wallet.id, -totalAmount, 'CLASS_BOOKING', 'Class booking payment', 'COMPLETED']
    );

    await client.query(
      `UPDATE wallets
       SET balance = $1, available_balance = $2, updated_at = NOW()
       WHERE id = $3`,
      [newBalance, newAvailable, wallet.id]
    );

    const normalizedParticipants: ParticipantWithFullName[] = participants.map((participant) => ({
      ...participant,
      fullName: [participant.firstName, participant.middleName, participant.lastName].filter(Boolean).join(' '),
    }));

    const booking = await insertBookingWithRetry({
      client,
      userId: user.id,
      classId,
      sessionId: sessionIdInput,
      participants: normalizedParticipants,
      numberOfParticipants,
      totalAmount,
      currency: bookingCurrency,
      specialRequests: specialRequests || null,
    });

    await client.query(
      `UPDATE class_sessions
       SET seats_booked = seats_booked + $1, updated_at = NOW()
       WHERE id = $2`,
      [numberOfParticipants, sessionIdInput]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id as string,
        bookingNumber: booking.booking_number as string,
        totalAmount: Number(booking.total_amount ?? totalAmount),
        currency: (booking.currency as string) || 'OMR',
        numberOfParticipants: Number(booking.number_of_participants ?? numberOfParticipants),
        classTitle: (classSession.title_ar as string | null) || (classSession.title as string),
      },
      wallet: {
        balance: newBalance,
        available_balance: newAvailable,
        currency: (wallet.currency as string) || 'OMR',
      },
      transactionId: walletTxResult.rows[0]?.id ?? null,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error creating class booking:', error);
    return NextResponse.json({ error: 'Failed to create class booking' }, { status: 500 });
  } finally {
    client.release();
  }
}
