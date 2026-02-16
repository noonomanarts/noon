import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { requestWalletWithdrawal } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, reason } = await request.json();

    if (!amount || amount <= 0) {
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
      return NextResponse.json({ error: 'Insufficient available balance' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}