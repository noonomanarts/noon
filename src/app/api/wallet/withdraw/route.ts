import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { parseMoneyAmount } from '@/lib/adminAuth';
import { requestWalletWithdrawal } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { amount?: unknown; reason?: string };
    const amount = parseMoneyAmount(body.amount);
    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    if (amount === null) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const transaction = await requestWalletWithdrawal(user.id, amount, reason);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        created_at: transaction.created_at
      }
    });
  } catch (error) {
    console.error('Withdraw request error:', error);
    if (error instanceof Error && error.message === 'Insufficient available balance') {
      return NextResponse.json({ error: 'Insufficient withdrawable balance' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient total balance' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}