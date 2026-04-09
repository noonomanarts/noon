import { NextRequest, NextResponse } from 'next/server';
import {
  getWalletTopupPaymentByGatewayOrderId,
  getWalletTopupPaymentByReference,
  updateWalletTopupPaymentStatus,
} from '@/lib/db/wallet';
import { getPaymobOrder, mapPaymobOrderToWalletStatus } from '@/lib/paymob';

type CallbackLookup = {
  reference: string | null;
  orderId: number | null;
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
    rawStatusHint:
      (typeof body.success === 'string' ? body.success : null) ||
      (typeof obj?.success === 'string' ? obj.success : null) ||
      null,
  };
}

async function resolvePayment(lookup: CallbackLookup) {
  if (lookup.reference) {
    const byReference = await getWalletTopupPaymentByReference(lookup.reference);
    if (byReference) {
      return byReference;
    }
  }

  if (lookup.orderId) {
    return getWalletTopupPaymentByGatewayOrderId(lookup.orderId);
  }

  return null;
}

function getReturnUrl(payment: { metadata?: Record<string, unknown> | null }): string {
  const requested = typeof payment.metadata?.returnUrl === 'string' ? payment.metadata.returnUrl : '';
  const locale = typeof payment.metadata?.locale === 'string' ? payment.metadata.locale : 'en';
  return requested.startsWith('/') ? requested : `/${locale}/account/wallet`;
}

async function syncPaymentFromPaymob(lookup: CallbackLookup) {
  const payment = await resolvePayment(lookup);
  if (!payment) {
    return null;
  }

  const paymobMetadata =
    payment.metadata?.paymob && typeof payment.metadata.paymob === 'object'
      ? (payment.metadata.paymob as Record<string, unknown>)
      : {};

  const orderId =
    lookup.orderId ??
    (typeof paymobMetadata.orderId === 'number' && Number.isInteger(paymobMetadata.orderId)
      ? paymobMetadata.orderId
      : null);

  if (!orderId) {
    return payment;
  }

  const order = await getPaymobOrder(orderId);
  const nextStatus = mapPaymobOrderToWalletStatus(order);

  if (payment.status === nextStatus || nextStatus === 'PENDING') {
    return {
      ...payment,
      metadata: {
        ...(payment.metadata ?? {}),
        paymob: {
          ...paymobMetadata,
          orderStatus: order.payment_status,
          paidAmountCents: order.paid_amount_cents,
          syncedAt: new Date().toISOString(),
        },
      },
    };
  }

  return updateWalletTopupPaymentStatus({
    reference: payment.reference,
    status: nextStatus,
    gatewayTransactionId: `PAYMOB-ORDER-${order.id}`,
    failureReason: nextStatus === 'CANCELLED' ? 'Paymob order cancelled' : undefined,
    metadata: {
      paymob: {
        ...paymobMetadata,
        orderStatus: order.payment_status,
        paidAmountCents: order.paid_amount_cents,
        syncedAt: new Date().toISOString(),
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const payment = await syncPaymentFromPaymob(lookupFromSearchParams(request));

    if (!payment) {
      return NextResponse.redirect(new URL('/en/account/wallet?topup=failed', request.url));
    }

    const destination = new URL(getReturnUrl(payment), request.url);
    destination.searchParams.set('reference', payment.reference);

    if (payment.status === 'PAID') {
      destination.searchParams.set('topup', 'paid');
    } else if (payment.status === 'CANCELLED') {
      destination.searchParams.set('topup', 'cancelled');
    } else if (payment.status === 'FAILED') {
      destination.searchParams.set('topup', 'failed');
    } else if (lookupFromSearchParams(request).rawStatusHint === 'false') {
      destination.searchParams.set('topup', 'failed');
    } else {
      destination.searchParams.set('topup', 'pending');
    }

    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('Error handling Paymob top-up callback:', error);
    return NextResponse.redirect(new URL('/en/account/wallet?topup=failed', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payment = await syncPaymentFromPaymob(lookupFromBody(body));

    if (!payment) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error processing Paymob top-up webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
