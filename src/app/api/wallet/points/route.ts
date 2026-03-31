import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { getLoyaltyCardByUserId } from '@/lib/db/wallet';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('noon_session')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const card = await getLoyaltyCardByUserId(user.id);
    return NextResponse.json({ points: card ? card.points : 0 });
  } catch (error) {
    console.error('Failed to get bonus points:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
