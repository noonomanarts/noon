import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { convertPointsToCredit, getLoyaltyCardByUserId } from '@/lib/db/wallet';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';

interface LoyaltySettings {
  pointConversionRate: number;
}

const DEFAULT_RATE = 0.05;

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => ({}))) as { points?: number };
    const pointsToConvert = Math.floor(Number(body.points) || 0);

    if (pointsToConvert <= 0) {
      return NextResponse.json({ error: 'Points must be greater than 0' }, { status: 400 });
    }

    // Check user has enough points
    const card = await getLoyaltyCardByUserId(user.id);
    if (!card || card.points < pointsToConvert) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 409 });
    }

    // Get conversion rate from admin settings
    const loyaltySettings = await getAdminSettingsByKey<LoyaltySettings>('loyalty');
    const rate = loyaltySettings?.pointConversionRate ?? DEFAULT_RATE;

    const result = await convertPointsToCredit(user.id, pointsToConvert, rate);

    return NextResponse.json({
      success: true,
      pointsUsed: result.pointsUsed,
      amountCredited: result.amountCredited,
      currency: 'OMR',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('Failed to convert points:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
