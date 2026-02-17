import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { updateWalletTopupPaymentStatus } from '@/lib/db/wallet';
import type { WalletTopupPaymentStatus } from '@/lib/db/types';

const allowedStatuses = new Set<WalletTopupPaymentStatus>(['PAID', 'FAILED', 'CANCELLED']);

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return null;
  }

  return getUserById(sessionId);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = request.nextUrl.searchParams.get('reference')?.trim() ?? '';
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT reference, amount, currency, status, created_at
       FROM wallet_topup_payments
       WHERE reference = $1 AND user_id = $2
       LIMIT 1`,
      [reference, user.id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    const row = result.rows[0];

    return NextResponse.json({
      payment: {
        reference: row.reference as string,
        amount: Number(row.amount),
        currency: row.currency as string,
        status: row.status as WalletTopupPaymentStatus,
        created_at: row.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching sandbox top-up payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const ownerResult = await pool.query(
      `SELECT id FROM wallet_topup_payments WHERE reference = $1 AND user_id = $2 LIMIT 1`,
      [reference, user.id]
    );

    if (!ownerResult.rows[0]) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    const payment = await updateWalletTopupPaymentStatus({
      reference,
      status,
      gatewayTransactionId: status === 'PAID' ? `SANDBOX-${Date.now()}` : undefined,
      failureReason: status === 'FAILED' ? (body.failureReason?.trim() || 'Sandbox payment failed') : undefined,
      metadata: {
        sandbox: true,
        source: 'wallet_topup_sandbox_page',
        actedByUserId: user.id,
        simulatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error completing sandbox top-up payment:', error);

    if (error instanceof Error) {
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
