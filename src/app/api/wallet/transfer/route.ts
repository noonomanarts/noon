import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { transferWalletFunds } from '@/lib/db/wallet';
import { getUserByPhoneNormalized } from '@/lib/db/users';
import { parseMoneyAmount } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      toPhone?: unknown;
      amount?: unknown;
      reason?: string;
    };
    const toPhone = typeof body.toPhone === 'string' ? body.toPhone.trim().replace(/^00/, '') : '';
    const amount = parseMoneyAmount(body.amount);
    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    if (!toPhone || amount === null) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Registered numbers are stored with a leading "+", so compare digits only.
    const recipient = await getUserByPhoneNormalized(toPhone);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    if (recipient.id === user.id) {
      return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 });
    }

    await transferWalletFunds(user.id, recipient.id, amount, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transfer error:', error);
    if (error instanceof Error && error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}