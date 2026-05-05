import { NextRequest, NextResponse } from 'next/server';
import {
  getWalletTopupPaymentByReference,
  updateWalletTopupPaymentGatewayData,
  updateWalletTopupPaymentStatus,
} from '@/lib/db/wallet';
import {
  isExpectedAmwalMerchant,
  mapAmwalTransactionToPaymentStatus,
  parseAmwalTransactionPayload,
} from '@/lib/amwal';

type CallbackLookup = {
  reference: string | null;
  payload: Record<string, unknown>;
};

function lookupFromSearchParams(request: NextRequest): CallbackLookup {
  const { searchParams } = request.nextUrl;
  return {
    reference: searchParams.get('reference')?.trim() || null,
    payload: Object.fromEntries(searchParams.entries()),
  };
}

function lookupFromBody(body: Record<string, unknown>): CallbackLookup {
  const payload = body.gatewayPayload && typeof body.gatewayPayload === 'object'
    ? (body.gatewayPayload as Record<string, unknown>)
    : body;

  return {
    reference:
      (typeof body.reference === 'string' ? body.reference.trim() : '') ||
      (typeof payload.MerchantReference === 'string' ? payload.MerchantReference.trim() : '') ||
      (typeof payload.merchantReference === 'string' ? payload.merchantReference.trim() : '') ||
      null,
    payload,
  };
}

async function resolvePayment(lookup: CallbackLookup) {
  if (lookup.reference) {
    const byReference = await getWalletTopupPaymentByReference(lookup.reference);
    if (byReference) {
      return byReference;
    }
  }

  return null;
}

function getReturnUrl(payment: { metadata?: Record<string, unknown> | null }): string {
  const requested = typeof payment.metadata?.returnUrl === 'string' ? payment.metadata.returnUrl : '';
  const locale = typeof payment.metadata?.locale === 'string' ? payment.metadata.locale : 'en';
  return requested.startsWith('/') ? requested : `/${locale}/account/wallet`;
}

async function syncPaymentFromAmwal(lookup: CallbackLookup) {
  const payment = await resolvePayment(lookup);
  if (!payment) {
    return null;
  }

  const amwalMetadata =
    payment.metadata?.amwal && typeof payment.metadata.amwal === 'object'
      ? (payment.metadata.amwal as Record<string, unknown>)
      : {};

  if (
    (lookup.payload.MerchantId || lookup.payload.merchantId || lookup.payload.TerminalId || lookup.payload.terminalId) &&
    !isExpectedAmwalMerchant(lookup.payload)
  ) {
    throw new Error('AMWAL notification merchant identity mismatch');
  }

  const snapshot = parseAmwalTransactionPayload(lookup.payload);
  const nextStatus = mapAmwalTransactionToPaymentStatus(snapshot);

  const diagnosticMetadata = {
    amwal: {
      ...amwalMetadata,
      responseCode: snapshot.responseCode,
      message: snapshot.message,
      systemReference: snapshot.systemReference,
      secureHash: snapshot.secureHash,
      authorizationDateTime: snapshot.authorizationDateTime,
      dateTimeLocalTrxn: snapshot.dateTimeLocalTrxn,
      paidThrough: snapshot.paidThrough,
      amount: snapshot.amount,
      currencyId: snapshot.currencyId,
      rawPayload: lookup.payload,
      syncedAt: new Date().toISOString(),
    },
  };

  if (nextStatus === 'PENDING' || payment.status === nextStatus) {
    return updateWalletTopupPaymentGatewayData({
      reference: payment.reference,
      gateway: 'AMWAL',
      metadata: diagnosticMetadata,
    });
  }

  return updateWalletTopupPaymentStatus({
    reference: payment.reference,
    status: nextStatus,
    gatewayTransactionId: snapshot.systemReference || payment.gateway_transaction_id || undefined,
    failureReason: nextStatus === 'PAID' ? undefined : snapshot.message || 'Amwal payment did not complete',
    metadata: diagnosticMetadata,
  });
}

export async function GET(request: NextRequest) {
  try {
    const payment = await syncPaymentFromAmwal(lookupFromSearchParams(request));

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
    } else {
      destination.searchParams.set('topup', 'pending');
    }

    return NextResponse.redirect(destination);
  } catch (error) {
    console.error('Error handling Amwal top-up callback:', error);
    return NextResponse.redirect(new URL('/en/account/wallet?topup=failed', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payment = await syncPaymentFromAmwal(lookupFromBody(body));

    if (!payment) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment, topupStatus: payment.status });
  } catch (error) {
    console.error('Error processing Amwal top-up callback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
