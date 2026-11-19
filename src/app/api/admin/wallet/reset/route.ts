import { readSessionUserId } from '@/lib/sessionToken';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUserById } from '@/lib/db/users';
import { adminResetWallet } from '@/lib/db/wallet';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = readSessionUserId(cookieStore);

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getSessionUserById(sessionId);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const wallet = await adminResetWallet(userId);
    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('Error resetting wallet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}