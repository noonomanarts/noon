import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';
import { sendPaymentAdminNotifications } from '@/lib/paymentAdminNotifications';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';
import { emitAdminEvent } from '@/lib/realtime/adminEvents';
import {
  isExpectedAmwalMerchant,
  mapAmwalTransactionToPaymentStatus,
  parseAmwalTransactionPayload,
  verifyAmwalPaidCallback,
} from '@/lib/amwal';

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

  try {
    if (
      (payload.MerchantId || payload.merchantId || payload.TerminalId || payload.terminalId) &&
      !isExpectedAmwalMerchant(payload)
    ) {
      return NextResponse.json({ error: 'AMWAL notification merchant identity mismatch' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error validating Amwal event payment callback:', error);
    return NextResponse.json({ error: 'Payment gateway is not configured' }, { status: 500 });
  }

  const snapshot = parseAmwalTransactionPayload(payload);
  const paymentStatus = mapAmwalTransactionToPaymentStatus(snapshot);
  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query('BEGIN');
    inTransaction = true;

    // Payments started from the confirmation link use a generated
    // payment_reference; payments started from "My orders" use the booking
    // number. Both must resolve, otherwise a successful charge is never recorded.
    const bookingResult = await client.query(
      `SELECT id, booking_number, user_id, full_name, total_amount, currency, payment_status, payment_reference
       FROM event_bookings
       WHERE payment_reference = $1 OR booking_number = $1
       ORDER BY (payment_reference = $1) DESC NULLS LAST
       LIMIT 1
       FOR UPDATE`,
      [reference]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      await client.query('ROLLBACK');
      inTransaction = false;
      return NextResponse.json({ error: 'Event booking not found' }, { status: 404 });
    }

    const currentStatus = String(booking.payment_status);

    if (currentStatus === 'PAID') {
      await client.query('COMMIT');
      inTransaction = false;
      return NextResponse.json({ success: true, paymentStatus: 'PAID', reference });
    }

    if (paymentStatus === 'PAID') {
      const verification = verifyAmwalPaidCallback(payload, reference);
      if (!verification.ok) {
        await client.query('ROLLBACK');
        inTransaction = false;
        console.error('Rejected Amwal event payment confirmation:', { reference, reason: verification.reason });
        return NextResponse.json({ error: 'Payment confirmation could not be verified' }, { status: 400 });
      }

      await client.query(
        `UPDATE event_bookings
         SET payment_status = 'PAID',
             payment_method = 'ONLINE',
             payment_gateway = 'AMWAL',
             payment_reference = COALESCE(payment_reference, $2),
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id, reference]
      );

      await client.query('COMMIT');
      inTransaction = false;

      const amount = Number(booking.total_amount ?? 0);
      const currency = String(booking.currency || 'OMR');

      if (booking.user_id) {
        void sendUserTransactionWhatsApp({
          userId: String(booking.user_id),
          key: 'event_booking_paid',
          vars: {
            bookingNumber: String(booking.booking_number),
            amount,
            currency,
          },
        }).catch((error) => {
          console.error('Failed to send event booking WhatsApp message:', error);
        });
      }

      void sendPaymentAdminNotifications({
        source: 'eventBooking',
        entityId: String(booking.id),
        reference: String(booking.booking_number),
        amount,
        currency,
        customerName: String(booking.full_name || 'Noon Customer'),
        paymentMethod: 'Online',
        adminPath: '/admin/payments',
      }).catch((error) => {
        console.error('Failed to send admin event payment alerts:', error);
      });

      return NextResponse.json({ success: true, paymentStatus: 'PAID', reference });
    }

    if ((paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') && currentStatus !== 'FAILED') {
      await client.query(
        `UPDATE event_bookings
         SET payment_status = 'FAILED',
             payment_method = 'ONLINE',
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id]
      );
      await client.query('COMMIT');
      inTransaction = false;

      try {
        emitAdminEvent('payments_updated', { source: 'eventBooking', reference: String(booking.booking_number) });
      } catch {
        // realtime refresh is best-effort
      }

      return NextResponse.json({ success: true, paymentStatus: 'FAILED', reference });
    }

    await client.query('COMMIT');
    inTransaction = false;
    return NextResponse.json({ success: true, paymentStatus: currentStatus, reference });
  } catch (error) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    console.error('Error processing Amwal event payment callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
