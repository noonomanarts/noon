import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createWalletTopupPayment } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      amount?: number;
      currency?: string;
      gateway?: string;
      paymentUrl?: string;
      metadata?: Record<string, unknown>;
    };

    const amount = typeof body.amount === 'number' ? body.amount : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const payment = await createWalletTopupPayment({
      userId: user.id,
      amount,
      currency: typeof body.currency === 'string' ? body.currency : 'OMR',
      gateway: typeof body.gateway === 'string' && body.gateway.trim().length > 0 ? body.gateway.trim() : 'PENDING_GATEWAY',
      paymentUrl: typeof body.paymentUrl === 'string' ? body.paymentUrl : undefined,
      metadata: body.metadata,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet topup payment:', error);
    if (error instanceof Error && error.message === 'Wallet not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Topup payments table is not migrated') {
      return NextResponse.json({
        error: 'Top-up payments setup is incomplete. Please run database migrations.',
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
