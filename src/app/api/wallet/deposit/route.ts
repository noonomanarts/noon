import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { parseMoneyAmount } from '@/lib/adminAuth';
import { depositToWallet } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This credits a wallet without any payment. It exists for the admin's own
    // wallet widget only; customers top up through the payment gateway.
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { amount?: unknown; reason?: string };
    const amount = parseMoneyAmount(body.amount);
    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    if (amount === null) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    await depositToWallet(user.id, amount, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}