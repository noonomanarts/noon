import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import {
  getShopPageContentSettings,
  getShopPageContentSettingsKey,
  sanitizeShopPageContentSettings,
  type ShopPageContentSettings,
} from '@/lib/shopPageContent';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const settings = await getShopPageContentSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching shop page content settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { headerImage?: string };

    const key = getShopPageContentSettingsKey();
    const existing = await getAdminSettingsByKey<Partial<ShopPageContentSettings>>(key);
    const merged = sanitizeShopPageContentSettings({
      ...(existing ?? {}),
      headerImage: body.headerImage,
    });

    await upsertAdminSettings({
      key,
      value: merged,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ settings: merged });
  } catch (error) {
    console.error('Error updating shop page content settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
