import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import type { EventType } from '@/lib/db/types';
import { defaultEventGiftAddOnSettings, sanitizeEventGiftAddOnSettings } from '@/lib/eventGiftAddOns';
import {
  EVENT_GIFT_ADD_ON_EVENT_TYPES,
  EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
  type EventGiftAddOnSettings,
} from '@/lib/eventGiftAddOnTypes';

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

function normalizeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePrice(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(3));
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function normalizeAppliesTo(value: unknown): EventType[] {
  if (!Array.isArray(value)) return ['COOKING_COMPETITION'];

  const items = value.filter(
    (item): item is (typeof EVENT_GIFT_ADD_ON_EVENT_TYPES)[number] =>
      typeof item === 'string' && EVENT_GIFT_ADD_ON_EVENT_TYPES.includes(item as (typeof EVENT_GIFT_ADD_ON_EVENT_TYPES)[number])
  );

  return items.length > 0 ? Array.from(new Set(items)) : ['COOKING_COMPETITION'];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { giftId } = await params;
    if (!giftId) {
      return NextResponse.json({ error: 'Invalid gift id.' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const existing = await getAdminSettingsByKey<Partial<EventGiftAddOnSettings>>(EVENT_GIFT_ADD_ONS_SETTINGS_KEY);
    const settings = sanitizeEventGiftAddOnSettings(existing ?? defaultEventGiftAddOnSettings);
    const index = settings.items.findIndex((item) => item.id === giftId);

    if (index < 0) {
      return NextResponse.json({ error: 'Gift add-on not found.' }, { status: 404 });
    }

    settings.items[index] = {
      ...settings.items[index],
      nameEn: normalizeText(body.nameEn, 180) || settings.items[index].nameEn,
      nameAr: normalizeText(body.nameAr, 180) || settings.items[index].nameAr,
      descriptionEn: normalizeText(body.descriptionEn, 1200),
      descriptionAr: normalizeText(body.descriptionAr, 1200),
      image: normalizeText(body.image, 500),
      unitPrice: normalizePrice(body.unitPrice),
      appliesTo: normalizeAppliesTo(body.appliesTo),
      isActive: body.isActive !== false,
      sortOrder: normalizeSortOrder(body.sortOrder, settings.items[index].sortOrder),
    };

    const normalized = sanitizeEventGiftAddOnSettings(settings);
    await upsertAdminSettings({
      key: EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ items: normalized.items });
  } catch (error) {
    console.error('Error updating event gift add-on:', error);
    return NextResponse.json({ error: 'Failed to update event gift add-on' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ giftId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { giftId } = await params;
    if (!giftId) {
      return NextResponse.json({ error: 'Invalid gift id.' }, { status: 400 });
    }

    const existing = await getAdminSettingsByKey<Partial<EventGiftAddOnSettings>>(EVENT_GIFT_ADD_ONS_SETTINGS_KEY);
    const settings = sanitizeEventGiftAddOnSettings(existing ?? defaultEventGiftAddOnSettings);
    const nextItems = settings.items.filter((item) => item.id !== giftId);

    if (nextItems.length === settings.items.length) {
      return NextResponse.json({ error: 'Gift add-on not found.' }, { status: 404 });
    }

    const normalized = sanitizeEventGiftAddOnSettings({ ...settings, items: nextItems });
    await upsertAdminSettings({
      key: EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ items: normalized.items });
  } catch (error) {
    console.error('Error deleting event gift add-on:', error);
    return NextResponse.json({ error: 'Failed to delete event gift add-on' }, { status: 500 });
  }
}