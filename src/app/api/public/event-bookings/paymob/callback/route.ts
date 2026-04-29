import { NextRequest, NextResponse } from 'next/server';
import { findUniqueEventBooking, updateEventBooking } from '@/lib/db/events';
import { getPaymobOrder, mapPaymobOrderToWalletStatus } from '@/lib/paymob';
import { getPublicSiteBaseUrl } from '@/lib/publicSiteUrl';

type CallbackLookup = {
  reference: string | null;
  orderId: number | null;
  token: string | null;
  locale: string | null;
  rawStatusHint: string | null;
};

function toInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function lookupFromSearchParams(request: NextRequest): CallbackLookup {
  const { searchParams } = request.nextUrl;
  return {
    reference:
      searchParams.get('merchant_order_id')?.trim() ||
      searchParams.get('reference')?.trim() ||
      null,
    orderId:
      toInteger(searchParams.get('order')) ??
      toInteger(searchParams.get('order_id')) ??
      toInteger(searchParams.get('merchant_order_id')),
    token: searchParams.get('token')?.trim() || null,
    locale: searchParams.get('locale')?.trim() || null,
    rawStatusHint: searchParams.get('success') || searchParams.get('pending') || null,
  };
}

function lookupFromBody(body: Record<string, unknown>): CallbackLookup {
  const obj = body.obj && typeof body.obj === 'object' ? (body.obj as Record<string, unknown>) : null;
  const orderPayload = obj?.order && typeof obj.order === 'object' ? (obj.order as Record<string, unknown>) : null;

  return {
    reference:
      (typeof body.reference === 'string' ? body.reference.trim() : '') ||
      (typeof body.merchant_order_id === 'string' ? body.merchant_order_id.trim() : '') ||
      (typeof orderPayload?.merchant_order_id === 'string' ? orderPayload.merchant_order_id.trim() : '') ||
      null,
    orderId:
      toInteger(body.order_id) ??
      toInteger(body.order) ??
      toInteger(obj?.order) ??
      toInteger(orderPayload?.id),
    token: typeof body.token === 'string' ? body.token.trim() : null,
    locale: typeof body.locale === 'string' ? body.locale.trim() : null,
    rawStatusHint:
      (typeof body.success === 'string' ? body.success : null) ||
      (typeof obj?.success === 'string' ? obj.success : null) ||
      null,
  };
}

async function resolveBooking(lookup: CallbackLookup) {
  if (lookup.reference) {
    const byReference = await findUniqueEventBooking({ paymentReference: lookup.reference });
    if (byReference) {
      return byReference;
    }
  }

  if (lookup.orderId) {
    return findUniqueEventBooking({ paymentGatewayOrderId: lookup.orderId });
  }

  return null;
}

async function syncBookingPayment(lookup: CallbackLookup) {
  const booking = await resolveBooking(lookup);
  if (!booking) {
    return null;
  }

  const orderId = lookup.orderId ?? (typeof booking.paymentGatewayOrderId === 'number' ? booking.paymentGatewayOrderId : null);
  if (!orderId) {
    return booking;
  }

  const order = await getPaymobOrder(orderId);
  const paymobStatus = mapPaymobOrderToWalletStatus(order);

  if (paymobStatus === 'PAID' && booking.paymentStatus !== 'PAID') {
    return updateEventBooking(String(booking.id), {
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE',
      paidAt: new Date(),
    });
  }

  if (paymobStatus === 'CANCELLED' && booking.paymentStatus !== 'FAILED') {
    return updateEventBooking(String(booking.id), {
      paymentStatus: 'FAILED',
      paymentMethod: 'ONLINE',
    });
  }

  return booking;
}

function buildReturnUrl(request: NextRequest, booking: Record<string, unknown> | null, lookup: CallbackLookup, paymentState: string) {
  const token = lookup.token || (typeof booking?.confirmationToken === 'string' ? booking.confirmationToken : '');
  const locale = lookup.locale === 'ar' ? 'ar' : lookup.locale === 'en' ? 'en' : 'en';

  const base = getPublicSiteBaseUrl(request.nextUrl.origin);
  const destination = new URL(token ? `/${locale}/group-booking-events/complete/${token}` : `/${locale}/group-booking-events`, base);
  destination.searchParams.set('payment', paymentState);
  if (lookup.reference) {
    destination.searchParams.set('reference', lookup.reference);
  }
  return destination;
}

export async function GET(request: NextRequest) {
  try {
    const lookup = lookupFromSearchParams(request);
    const booking = await syncBookingPayment(lookup);
    const paymentState = booking?.paymentStatus === 'PAID'
      ? 'paid'
      : booking?.paymentStatus === 'FAILED'
        ? 'failed'
        : lookup.rawStatusHint === 'false'
          ? 'failed'
          : 'pending';

    return NextResponse.redirect(buildReturnUrl(request, booking, lookup, paymentState));
  } catch (error) {
    console.error('Error handling Paymob event payment callback:', error);
    return NextResponse.redirect(new URL('/en/group-booking-events?payment=failed', getPublicSiteBaseUrl(request.nextUrl.origin)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const booking = await syncBookingPayment(lookupFromBody(body));
    if (!booking) {
      return NextResponse.json({ error: 'Event booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    console.error('Error processing Paymob event payment webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}