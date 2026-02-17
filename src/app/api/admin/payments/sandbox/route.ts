import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { updateWalletTopupPaymentStatus } from '@/lib/db/wallet';
import type { WalletTopupPaymentStatus } from '@/lib/db/types';

const allowedStatuses = new Set<WalletTopupPaymentStatus>(['PAID', 'FAILED', 'CANCELLED', 'PENDING']);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      reference?: string;
      status?: WalletTopupPaymentStatus;
      failureReason?: string;
    };

    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const status = body.status;

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    if (!status || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const payment = await updateWalletTopupPaymentStatus({
      reference,
      status,
      gatewayTransactionId: status === 'PAID' ? `SANDBOX-${Date.now()}` : undefined,
      failureReason:
        status === 'FAILED'
          ? (body.failureReason?.trim() || 'Sandbox simulated failure')
          : undefined,
      metadata: {
        sandbox: true,
        simulatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error simulating payment status:', error);

    if (error instanceof Error) {
      if (error.message === 'Topup payments table is not migrated') {
        return NextResponse.json(
          { error: 'Top-up payments setup is incomplete. Please run database migrations.' },
          { status: 503 }
        );
      }
      if (error.message === 'Topup payment not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'Paid topup cannot be changed') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === 'Wallet not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
