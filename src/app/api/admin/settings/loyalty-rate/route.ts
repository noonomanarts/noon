import { NextResponse } from 'next/server';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';

interface LoyaltySettings {
  pointConversionRate: number;
}

export async function GET() {
  try {
    const settings = await getAdminSettingsByKey<LoyaltySettings>('loyalty');
    return NextResponse.json({ rate: settings?.pointConversionRate ?? 0.05 });
  } catch {
    return NextResponse.json({ rate: 0.05 });
  }
}
