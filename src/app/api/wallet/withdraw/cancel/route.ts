import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { cancelWithdrawalRequestByUser } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transactionId, reason } = await request.json();

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });
    }

    await cancelWithdrawalRequestByUser(user.id, transactionId, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel withdrawal request error:', error);

    if (error instanceof Error) {
      const knownErrors = new Set([
        'Pending withdrawal request not found',
        'Wallet not found',
      ]);

      if (knownErrors.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
