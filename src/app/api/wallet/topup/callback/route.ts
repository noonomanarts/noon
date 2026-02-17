import { NextRequest, NextResponse } from 'next/server';
import { updateWalletTopupPaymentStatus } from '@/lib/db/wallet';
import type { WalletTopupPaymentStatus } from '@/lib/db/types';

const allowedStatuses = new Set(['PENDING', 'PAID', 'FAILED', 'CANCELLED']);

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.TOPUP_CALLBACK_SECRET;
    const incomingSecret = request.headers.get('x-topup-callback-secret');

    if (!secret) {
      return NextResponse.json(
        { error: 'Top-up callback is not configured' },
        { status: 503 }
      );
    }

    if (!incomingSecret || incomingSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized callback' }, { status: 401 });
    }

    const body = (await request.json()) as {
      reference?: string;
      status?: string;
      gatewayTransactionId?: string;
      failureReason?: string;
      metadata?: Record<string, unknown>;
    };

    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const statusRaw = typeof body.status === 'string' ? body.status.toUpperCase() : '';

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    if (!allowedStatuses.has(statusRaw)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const payment = await updateWalletTopupPaymentStatus({
      reference,
      status: statusRaw as WalletTopupPaymentStatus,
      gatewayTransactionId:
        typeof body.gatewayTransactionId === 'string' ? body.gatewayTransactionId : undefined,
      failureReason: typeof body.failureReason === 'string' ? body.failureReason : undefined,
      metadata: body.metadata,
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error processing topup callback:', error);

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
