import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { transferWalletFunds } from '@/lib/db/wallet';
import { getUserByPhone } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toPhone, amount, reason } = await request.json();

    // Normalize phone number (remove + and 00 prefixes)
    const normalizedPhone = toPhone.replace(/^\+|^00/, '');

    if (!normalizedPhone || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Find recipient by phone
    const recipient = await getUserByPhone(normalizedPhone);
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