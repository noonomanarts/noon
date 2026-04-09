import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  getWalletTopupPaymentForUser,
  updateWalletTopupPaymentStatus,
} from '@/lib/db/wallet';
import { getPaymobOrder, mapPaymobOrderToWalletStatus } from '@/lib/paymob';

function getPaymobOrderId(payment: { metadata?: Record<string, unknown> | null }): number | null {
  const paymob = payment.metadata?.paymob;
  if (!paymob || typeof paymob !== 'object') {
    return null;
  }

  const orderId = (paymob as { orderId?: unknown }).orderId;
  return typeof orderId === 'number' && Number.isInteger(orderId) ? orderId : null;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = request.nextUrl.searchParams.get('reference')?.trim() ?? '';
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const payment = await getWalletTopupPaymentForUser(reference, user.id);
    if (!payment) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ payment });
    }

    const orderId = getPaymobOrderId(payment);
    if (!orderId) {
      return NextResponse.json({ payment });
    }

    const order = await getPaymobOrder(orderId);
    const nextStatus = mapPaymobOrderToWalletStatus(order);

    if (nextStatus === 'PENDING') {
      return NextResponse.json({
        payment: {
          ...payment,
          metadata: {
            ...(payment.metadata ?? {}),
            paymob: {
              ...((payment.metadata?.paymob as Record<string, unknown> | undefined) ?? {}),
              orderStatus: order.payment_status,
              paidAmountCents: order.paid_amount_cents,
              syncedAt: new Date().toISOString(),
            },
          },
        },
      });
    }

    const updatedPayment = await updateWalletTopupPaymentStatus({
      reference: payment.reference,
      status: nextStatus,
      gatewayTransactionId: `PAYMOB-ORDER-${order.id}`,
      failureReason: nextStatus === 'CANCELLED' ? 'Paymob order cancelled' : undefined,
      metadata: {
        paymob: {
          ...((payment.metadata?.paymob as Record<string, unknown> | undefined) ?? {}),
          orderStatus: order.payment_status,
          paidAmountCents: order.paid_amount_cents,
          syncedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('Error syncing Paymob top-up status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
