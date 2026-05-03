import { NextRequest, NextResponse } from 'next/server';
import { findUniqueEventBooking, updateEventBooking } from '@/lib/db/events';
import {
  isExpectedAmwalMerchant,
  mapAmwalTransactionToPaymentStatus,
  parseAmwalTransactionPayload,
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
  try {
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

    const booking = await findUniqueEventBooking({ paymentReference: reference });
    if (!booking) {
      return NextResponse.json({ error: 'Event booking not found' }, { status: 404 });
    }

    const snapshot = parseAmwalTransactionPayload(payload);
    const paymentStatus = mapAmwalTransactionToPaymentStatus(snapshot);

    if (paymentStatus === 'PAID' && booking.paymentStatus !== 'PAID') {
      const updated = await updateEventBooking(String(booking.id), {
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        paidAt: new Date(),
      });

      return NextResponse.json({ success: true, paymentStatus: updated?.paymentStatus ?? 'PAID', reference });
    }

    if ((paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') && booking.paymentStatus !== 'FAILED') {
      const updated = await updateEventBooking(String(booking.id), {
        paymentStatus: 'FAILED',
        paymentMethod: 'ONLINE',
      });

      return NextResponse.json({ success: true, paymentStatus: updated?.paymentStatus ?? 'FAILED', reference });
    }

    return NextResponse.json({ success: true, paymentStatus: booking.paymentStatus, reference });
  } catch (error) {
    console.error('Error processing Amwal event payment callback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}