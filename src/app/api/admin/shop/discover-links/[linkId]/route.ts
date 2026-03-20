import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { linkId } = await params;
    if (!linkId) {
      return NextResponse.json({ error: 'Invalid link id.' }, { status: 400 });
    }

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

    const key = getShopPageContentSettingsKey();
    const existing = await getAdminSettingsByKey<Partial<ShopPageContentSettings>>(key);
    const settings = sanitizeShopPageContentSettings(existing);

    const index = settings.discoverLinks.findIndex((item) => item.id === linkId);
    if (index < 0) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 });
    }

    settings.discoverLinks[index] = {
      ...settings.discoverLinks[index],
      titleEn: body.titleEn ?? settings.discoverLinks[index].titleEn,
      titleAr: body.titleAr ?? settings.discoverLinks[index].titleAr,
      descriptionEn: body.descriptionEn ?? settings.discoverLinks[index].descriptionEn,
      descriptionAr: body.descriptionAr ?? settings.discoverLinks[index].descriptionAr,
      image: body.image ?? settings.discoverLinks[index].image,
      url: body.url ?? settings.discoverLinks[index].url,
      isActive: body.isActive ?? settings.discoverLinks[index].isActive,
      sortOrder: body.sortOrder ?? settings.discoverLinks[index].sortOrder,
    };

    const normalized = sanitizeShopPageContentSettings(settings);

    await upsertAdminSettings({
      key,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ links: normalized.discoverLinks });
  } catch (error) {
    console.error('Error updating discover link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { linkId } = await params;
    if (!linkId) {
      return NextResponse.json({ error: 'Invalid link id.' }, { status: 400 });
    }

    const key = getShopPageContentSettingsKey();
    const existing = await getAdminSettingsByKey<Partial<ShopPageContentSettings>>(key);
    const settings = sanitizeShopPageContentSettings(existing);

    const nextLinks = settings.discoverLinks.filter((item) => item.id !== linkId);
    if (nextLinks.length === settings.discoverLinks.length) {
      return NextResponse.json({ error: 'Link not found.' }, { status: 404 });
    }

    const normalized = sanitizeShopPageContentSettings({
      ...settings,
      discoverLinks: nextLinks,
    });

    await upsertAdminSettings({
      key,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ links: normalized.discoverLinks });
  } catch (error) {
    console.error('Error deleting discover link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
