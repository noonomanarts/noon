import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';
import { addBonusPoints } from '@/lib/db/wallet';
import { createPromoCode } from '@/lib/db/promoCodes';
import { sendPaymentAdminNotifications } from '@/lib/paymentAdminNotifications';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';
import { sendClassRegistrationMessage } from '@/lib/classCustomMessages';
import {
  isExpectedAmwalMerchant,
  mapAmwalTransactionToPaymentStatus,
  parseAmwalTransactionPayload,
} from '@/lib/amwal';
import { isRegistrationClosed } from '@/lib/classRegistration';

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

function getPayload(body: Record<string, unknown>): Record<string, unknown> {
  const nested = body.gatewayPayload;
  return nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : body;
}

function getReference(body: Record<string, unknown>, payload: Record<string, unknown>): string | null {
  const direct = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (direct) {
    return direct;
  }

  const merchantReference = typeof payload.MerchantReference === 'string'
    ? payload.MerchantReference.trim()
    : typeof payload.merchantReference === 'string'
      ? payload.merchantReference.trim()
      : '';

  return merchantReference || null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = getPayload(body);
  const reference = getReference(body, payload);

  if (!reference) {
    return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
  }

  if (
    (payload.MerchantId || payload.merchantId || payload.TerminalId || payload.terminalId) &&
    !isExpectedAmwalMerchant(payload)
  ) {
    return NextResponse.json({ error: 'AMWAL notification merchant identity mismatch' }, { status: 400 });
  }

  const paymentSnapshot = parseAmwalTransactionPayload(payload);
  const paymentStatus = mapAmwalTransactionToPaymentStatus(paymentSnapshot);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.id, b.booking_number, b.user_id, b.class_id, b.number_of_participants, b.total_amount,
              b.currency, b.status, b.payment_status, u.full_name, c.title, c.title_ar, c.start_date_time,
              c.registration_close_at, c.status AS class_status, c.seats_total, c.seats_booked, c.sub_category
       FROM bookings b
       INNER JOIN users u ON u.id = b.user_id
       INNER JOIN classes c ON c.id = b.class_id
       WHERE b.booking_number = $1
       FOR UPDATE`,
      [reference]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Class booking not found' }, { status: 404 });
    }

    if ((booking.payment_status as string) === 'PAID') {
      await client.query('COMMIT');

      let promoCode: string | null = null;
      if (String(booking.sub_category || '') === 'SUMMER_CAMP' && Number(booking.number_of_participants ?? 0) < 2) {
        const previousSummerCampResult = await pool.query(
          `SELECT 1
           FROM bookings b
           INNER JOIN classes c ON c.id = b.class_id
           WHERE b.user_id = $1
             AND b.id <> $2
             AND c.sub_category = 'SUMMER_CAMP'
             AND b.payment_status = 'PAID'
             AND b.status IN ('CONFIRMED', 'COMPLETED')
           LIMIT 1`,
          [booking.user_id, booking.id]
        );
        if (previousSummerCampResult.rows.length === 0) {
          promoCode = await createSummerCampFuturePromo(String(booking.user_id), String(booking.booking_number));
        }
      }
      return NextResponse.json({
        success: true,
        paymentStatus: 'PAID',
        booking: {
          id: String(booking.id),
          bookingNumber: String(booking.booking_number),
          totalAmount: Number(booking.total_amount ?? 0),
          currency: String(booking.currency || 'OMR'),
          numberOfParticipants: Number(booking.number_of_participants ?? 0),
          classTitle: (booking.title_ar as string | null) || String(booking.title || ''),
          paymentMethod: 'ONLINE',
          promoCode,
        },
      });
    }

    if (paymentStatus === 'PAID') {
      if ((booking.class_status as string) !== 'PUBLISHED') {
        throw new Error('This class is no longer available for booking');
      }

      if (booking.start_date_time) {
        const classStart = new Date(booking.start_date_time as string);
        if (classStart.getTime() < Date.now()) {
          throw new Error('This class has already started');
        }
      }

      if (isRegistrationClosed(booking.start_date_time, booking.registration_close_at)) {
        throw new Error('Registration for this class is closed');
      }

      const seatsTotal = Number(booking.seats_total ?? 0);
      const seatsBooked = Number(booking.seats_booked ?? 0);
      const requestedSeats = Number(booking.number_of_participants ?? 0);
      const seatsAvailable = Math.max(0, seatsTotal - seatsBooked);

      if (requestedSeats > seatsAvailable) {
        throw new Error('Not enough seats available');
      }

      await client.query(
        `UPDATE bookings
         SET status = 'CONFIRMED',
             payment_status = 'PAID',
             payment_method = 'ONLINE',
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id]
      );

      await client.query(
        `UPDATE classes
         SET seats_booked = seats_booked + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [requestedSeats, booking.class_id]
      );

      await client.query('COMMIT');

      void addBonusPoints(String(booking.user_id), Number(booking.total_amount ?? 0)).catch(() => { /* ignore points failure */ });

      void sendUserTransactionWhatsApp({
        userId: String(booking.user_id),
        key: 'class_booking_paid',
        vars: {
          amount: Number(booking.total_amount ?? 0),
          currency: String(booking.currency || 'OMR'),
          classTitle: (booking.title_ar as string | null) || String(booking.title || ''),
        },
      }).catch((error) => {
        console.error('Failed to send class booking WhatsApp message:', error);
      });

      void sendClassRegistrationMessage({
        userId: String(booking.user_id),
        classId: String(booking.class_id),
      }).catch(() => { /* ignore registration auto-message failure */ });

      void sendPaymentAdminNotifications({
        source: 'classBooking',
        entityId: String(booking.id),
        reference: String(booking.booking_number),
        amount: Number(booking.total_amount ?? 0),
        currency: String(booking.currency || 'OMR'),
        customerName: String(booking.full_name || 'Noon Customer'),
        paymentMethod: 'Online',
        adminPath: '/admin/payments',
      }).catch((error) => {
        console.error('Failed to send admin class payment alerts:', error);
      });

      return NextResponse.json({
        success: true,
        paymentStatus: 'PAID',
        booking: {
          id: String(booking.id),
          bookingNumber: String(booking.booking_number),
          totalAmount: Number(booking.total_amount ?? 0),
          currency: String(booking.currency || 'OMR'),
          numberOfParticipants: Number(booking.number_of_participants ?? 0),
          classTitle: (booking.title_ar as string | null) || String(booking.title || ''),
          paymentMethod: 'ONLINE',
        },
      });
    }

    await client.query(
      `DELETE FROM bookings
       WHERE id = $1 AND payment_status = 'PENDING'`,
      [booking.id]
    );

    await client.query('COMMIT');

    return NextResponse.json({ success: true, paymentStatus: 'FAILED', reference });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing Amwal class payment callback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
