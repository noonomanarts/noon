import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { addBonusPoints } from '@/lib/db/wallet';
import { sendPaymentAdminNotifications } from '@/lib/paymentAdminNotifications';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';
import { isRegistrationClosed } from '@/lib/classRegistration';
import { prepareAmwalPayment } from '@/lib/amwal';
import { createPromoCode } from '@/lib/db/promoCodes';
import type { Gender } from '@/lib/db/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ParticipantPayload = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
  gender: Gender;
  isFreePartner?: boolean;
};

type BookingPaymentMethod = 'WALLET' | 'ONLINE';

function parsePaymentMethod(value: unknown): BookingPaymentMethod {
  return value === 'WALLET' ? 'WALLET' : 'ONLINE';
}

function parseGender(value: unknown): Gender | null {
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') {
    return value;
  }
  return null;
}

function validateClassAudienceGender(audienceGender: unknown, participantGender: Gender): boolean {
  const normalizedAudience = audienceGender === 'MALE_ONLY' || audienceGender === 'FEMALE_ONLY' || audienceGender === 'MIXED'
    ? audienceGender
    : 'MIXED';

  if (normalizedAudience === 'MIXED') return true;
  if (normalizedAudience === 'MALE_ONLY') return participantGender === 'MALE';
  if (normalizedAudience === 'FEMALE_ONLY') return participantGender === 'FEMALE';
  return true;
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

function parseSafeString(value: unknown, maxLength = 255): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseParticipants(value: unknown, isFreePartner = false): ParticipantPayload[] {
  if (!Array.isArray(value)) return [];

  const participants: ParticipantPayload[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rawParticipant of value) {
    if (!rawParticipant || typeof rawParticipant !== 'object') continue;
    const row = rawParticipant as Record<string, unknown>;
    const fullName = parseSafeString(row.fullName, 240);
    const firstName = parseSafeString(row.firstName, 120);
    const lastName = parseSafeString(row.lastName, 120);
    const dateOfBirth = parseSafeString(row.dateOfBirth, 20);
    const preferredLanguage = parseSafeString(row.preferredLanguage, 10);
    const gender = parseGender(row.gender);
    const normalizedFullName = fullName || [firstName, lastName].filter(Boolean).join(' ').trim();

    if (!normalizedFullName || !dateOfBirth || !gender) {
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
      fullName: normalizedFullName,
      dateOfBirth,
      preferredLanguage: preferredLanguage as 'en' | 'ar',
      gender,
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

function generateBookingNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLS-${y}${m}${d}-${random}`;
}

function generateSummerCampPromoCode(userId: string, bookingNumber: string): string {
  return `SUMMER10-${userId.slice(0, 6)}-${bookingNumber.slice(-6)}`.toUpperCase();
}

async function createSummerCampFuturePromo(userId: string, bookingNumber: string): Promise<string | null> {
  try {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 6);
    const promo = await createPromoCode({
      code: generateSummerCampPromoCode(userId, bookingNumber),
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUses: 1,
      expiresAt: expires.toISOString(),
    });
    return promo.code;
  } catch (error) {
    console.error('Failed to create summer camp promo code:', error);
    return null;
  }
}

async function insertBookingWithRetry(args: {
  client: {
    query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  };
  userId: string;
  classId: string;
  participants: ParticipantPayload[];
  numberOfParticipants: number;
  totalAmount: number;
  currency: string;
  specialRequests: string | null;
  status: 'PENDING' | 'CONFIRMED';
  paymentMethod: BookingPaymentMethod;
  paymentStatus: 'PENDING' | 'PAID';
  paidAt: Date | null;
}): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await args.client.query(
        `INSERT INTO bookings (
           booking_number, user_id, class_id, participants, number_of_participants,
           total_amount, currency, status, payment_method, payment_status, paid_at,
           terms_accepted, terms_accepted_at, special_requests, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11,
           TRUE, NOW(), $12, NOW(), NOW()
         )
         RETURNING id, booking_number, total_amount, currency, number_of_participants, payment_method, payment_status`,
        [
          generateBookingNumber(),
          args.userId,
          args.classId,
          JSON.stringify(args.participants),
          args.numberOfParticipants,
          args.totalAmount,
          args.currency,
          args.status,
          args.paymentMethod,
          args.paymentStatus,
          args.paidAt,
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
  const locale = parseSafeString(body.locale, 5) || 'en';
  const paymentMethod = parsePaymentMethod(body.paymentMethod);
  const numberOfParticipants = normalizeParticipantCount(body.numberOfParticipants);
  const termsAccepted = body.termsAccepted === true;
  const specialRequests = parseSafeString(body.specialRequests, 3000);
  const participants = parseParticipants(body.participants);
  const freePartners = parseParticipants(body.freePartners, true);
  const storedParticipants = [...participants, ...freePartners];

  if (!UUID_PATTERN.test(classId)) {
    return NextResponse.json({ error: 'Invalid class identifier' }, { status: 400 });
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

    const classResult = await client.query(
            `SELECT c.id, c.title, c.title_ar, c.price, c.currency, c.seats_total, c.seats_booked,
              c.status, c.sub_category, c.minimum_age, c.maximum_age, c.start_date_time, c.registration_close_at, c.audience_gender
       FROM classes c
       WHERE c.id = $1
       FOR UPDATE`,
      [classId]
    );

    const classRow = classResult.rows[0];
    if (!classRow) {
      throw new ApiError('Class not found', 404);
    }

    if (classRow.status !== 'PUBLISHED') {
      throw new ApiError('Class is not available for booking', 409);
    }

    if (classRow.start_date_time) {
      const classStart = new Date(classRow.start_date_time as string);
      if (classStart.getTime() < Date.now()) {
        throw new ApiError('This class has already started', 409);
      }
    }

    if (isRegistrationClosed(classRow.start_date_time, classRow.registration_close_at)) {
      throw new ApiError('Registration for this class is closed', 409);
    }

    // Enforce minimum age restriction
    const minimumAge = classRow.minimum_age != null ? Number(classRow.minimum_age) : null;
    const maximumAge = classRow.maximum_age != null ? Number(classRow.maximum_age) : null;
    if ((minimumAge != null && minimumAge > 0) || (maximumAge != null && maximumAge > 0)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const p of participants) {
        const age = calculateAgeFromDateString(p.dateOfBirth, today);
        if (minimumAge != null && minimumAge > 0 && age < minimumAge) {
          throw new ApiError(
            `A participant is below the minimum age requirement (${minimumAge} years).`,
            400
          );
        }
        if (maximumAge != null && maximumAge > 0 && age > maximumAge) {
          throw new ApiError(
            `A participant is above the maximum age limit (${maximumAge} years).`,
            400
          );
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

    for (const participant of participants) {
      if (!validateClassAudienceGender(classRow.audience_gender, participant.gender)) {
        throw new ApiError('This participant does not match the gender eligibility for this class.', 400);
      }
    }

    for (const partner of freePartners) {
      if (!validateClassAudienceGender(classRow.audience_gender, partner.gender)) {
        throw new ApiError('This participant does not match the gender eligibility for this class.', 400);
      }
    }

    const seatsTotal = Number(classRow.seats_total);
    const seatsBooked = Number(classRow.seats_booked ?? 0);

    if (!Number.isFinite(seatsTotal) || seatsTotal <= 0) {
      throw new ApiError('This class cannot be booked right now', 409);
    }

    const seatsAvailable = Math.max(0, seatsTotal - seatsBooked);

    if (numberOfParticipants > seatsAvailable) {
      throw new ApiError('Not enough seats available', 409);
    }

    const isSummerCamp = String(classRow.sub_category || '') === 'SUMMER_CAMP';
    const previousSummerCampResult = isSummerCamp
      ? await client.query(
          `SELECT 1
           FROM bookings b
           INNER JOIN classes c ON c.id = b.class_id
           WHERE b.user_id = $1
             AND b.class_id <> $2
             AND c.sub_category = 'SUMMER_CAMP'
             AND b.payment_status = 'PAID'
             AND b.status IN ('CONFIRMED', 'COMPLETED')
           LIMIT 1`,
          [user.id, classId]
        )
      : { rows: [] };
    const summerCampGetsDiscount = isSummerCamp && (numberOfParticipants >= 2 || previousSummerCampResult.rows.length > 0);
    const summerCampCreatesFuturePromo = isSummerCamp && !summerCampGetsDiscount;
    const unitPrice = Number(classRow.price ?? 0);
    const bookingCurrency = (classRow.currency as string) || 'OMR';
    const subtotalAmount = Number((unitPrice * numberOfParticipants).toFixed(3));
    const discountAmount = summerCampGetsDiscount ? Number((subtotalAmount * 0.1).toFixed(3)) : 0;
    const totalAmount = Number(Math.max(0, subtotalAmount - discountAmount).toFixed(3));

    if (paymentMethod === 'ONLINE') {
      const booking = await insertBookingWithRetry({
        client,
        userId: user.id,
        classId,
        participants: storedParticipants,
        numberOfParticipants,
        totalAmount,
        currency: bookingCurrency,
        specialRequests: specialRequests || null,
        status: 'PENDING',
        paymentMethod: 'ONLINE',
        paymentStatus: 'PENDING',
        paidAt: null,
      });

      const amwalPayment = prepareAmwalPayment({
        amount: totalAmount,
        currency: bookingCurrency,
        reference: String(booking.booking_number),
        locale,
        purpose: 'CLASS_BOOKING',
        contact: {
          fullName: user.fullName || 'Noon Customer',
          email: user.email || 'payments@noonomanarts.com',
          phoneNumber: user.phoneNumber || '',
        },
        bookingNumber: String(booking.booking_number),
      });

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        booking: {
          id: booking.id as string,
          bookingNumber: booking.booking_number as string,
          totalAmount: Number(booking.total_amount ?? totalAmount),
          currency: (booking.currency as string) || bookingCurrency,
          numberOfParticipants: Number(booking.number_of_participants ?? numberOfParticipants),
          classTitle: (classRow.title_ar as string | null) || (classRow.title as string),
          paymentMethod: 'ONLINE',
          paymentStatus: 'PENDING',
        },
        checkout: {
          scriptUrl: amwalPayment.scriptUrl,
          config: amwalPayment.config,
          reference: String(booking.booking_number),
        },
      });
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

    if ((wallet.currency as string) !== bookingCurrency) {
      throw new ApiError('Wallet currency does not match class currency', 409);
    }

    if (!Number.isFinite(walletBalance) || walletBalance < totalAmount) {
      throw new ApiError('Insufficient wallet balance', 409);
    }

    const newBalance = Number((walletBalance - totalAmount).toFixed(3));
    const newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));

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

    const booking = await insertBookingWithRetry({
      client,
      userId: user.id,
      classId,
      participants: storedParticipants,
      numberOfParticipants,
      totalAmount,
      currency: bookingCurrency,
      specialRequests: specialRequests || null,
      status: 'CONFIRMED',
      paymentMethod: 'WALLET',
      paymentStatus: 'PAID',
      paidAt: new Date(),
    });

    await client.query(
      `UPDATE classes
       SET seats_booked = seats_booked + $1, updated_at = NOW()
       WHERE id = $2`,
      [numberOfParticipants, classId]
    );

    await client.query('COMMIT');

    const promoCode = summerCampCreatesFuturePromo
      ? await createSummerCampFuturePromo(user.id, String(booking.booking_number))
      : null;

    // Award bonus points: 1 OMR = 1 point (fire-and-forget, non-blocking)
    void addBonusPoints(user.id, totalAmount).catch(() => { /* ignore points failure */ });

    void sendUserTransactionWhatsApp({
      userId: user.id,
      key: 'class_booking_paid',
      vars: {
        amount: totalAmount,
        currency: (wallet.currency as string) || 'OMR',
        balance: newBalance,
        classTitle: (classRow.title_ar as string | null) || (classRow.title as string),
        promoCode,
      },
    }).catch((error) => {
      console.error('Failed to send class booking WhatsApp message:', error);
    });

    void sendPaymentAdminNotifications({
      source: 'classBooking',
      entityId: String(booking.id),
      reference: String(booking.booking_number),
      amount: totalAmount,
      currency: (wallet.currency as string) || 'OMR',
      customerName: user.fullName,
      paymentMethod: 'Wallet',
      adminPath: '/admin/payments',
    }).catch((error) => {
      console.error('Failed to send admin class payment alerts:', error);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id as string,
        bookingNumber: booking.booking_number as string,
        totalAmount: Number(booking.total_amount ?? totalAmount),
        currency: (booking.currency as string) || 'OMR',
        numberOfParticipants: Number(booking.number_of_participants ?? numberOfParticipants),
        classTitle: (classRow.title_ar as string | null) || (classRow.title as string),
        promoCode: promoCode ?? null,
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
