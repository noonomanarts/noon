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
    return NextResponse.json({ links: settings.discoverLinks });
  } catch (error) {
    console.error('Error fetching discover links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      titleEn?: string;
      titleAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      image?: string;
      url?: string;
      isActive?: boolean;
      sortOrder?: number;
    };

    if (!body.url?.trim()) {
      return NextResponse.json({ error: 'External URL is required.' }, { status: 400 });
    }

    const key = getShopPageContentSettingsKey();
    const existing = await getAdminSettingsByKey<Partial<ShopPageContentSettings>>(key);
    const settings = sanitizeShopPageContentSettings(existing);

    settings.discoverLinks.push({
      id: crypto.randomUUID(),
      titleEn: body.titleEn?.trim() ?? '',
      titleAr: body.titleAr?.trim() ?? '',
      descriptionEn: body.descriptionEn?.trim() ?? '',
      descriptionAr: body.descriptionAr?.trim() ?? '',
      image: body.image?.trim() ?? '',
      url: body.url.trim(),
      isActive: body.isActive ?? true,
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : settings.discoverLinks.length,
    });

    const normalized = sanitizeShopPageContentSettings(settings);
    await upsertAdminSettings({
      key,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ links: normalized.discoverLinks }, { status: 201 });
  } catch (error) {
    console.error('Error creating discover link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
