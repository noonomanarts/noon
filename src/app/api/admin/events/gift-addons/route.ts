import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import type { EventType } from '@/lib/db/types';
import {
  defaultEventGiftAddOnSettings,
  sanitizeEventGiftAddOnSettings,
} from '@/lib/eventGiftAddOns';
import {
  EVENT_GIFT_ADD_ON_EVENT_TYPES,
  EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
  type EventGiftAddOn,
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

function buildGiftAddOnPayload(body: Record<string, unknown>, fallbackSortOrder: number): EventGiftAddOn | null {
  const nameEn = normalizeText(body.nameEn, 180);
  const nameAr = normalizeText(body.nameAr, 180);
  if (!nameEn && !nameAr) {
    return null;
  }

  return {
    id: normalizeText(body.id, 120) || crypto.randomUUID(),
    nameEn,
    nameAr,
    descriptionEn: normalizeText(body.descriptionEn, 1200),
    descriptionAr: normalizeText(body.descriptionAr, 1200),
    image: normalizeText(body.image, 500),
    unitPrice: normalizePrice(body.unitPrice),
    appliesTo: normalizeAppliesTo(body.appliesTo),
    isActive: body.isActive !== false,
    sortOrder: normalizeSortOrder(body.sortOrder, fallbackSortOrder),
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const existing = await getAdminSettingsByKey<Partial<EventGiftAddOnSettings>>(EVENT_GIFT_ADD_ONS_SETTINGS_KEY);
    const settings = sanitizeEventGiftAddOnSettings(existing ?? defaultEventGiftAddOnSettings);
    return NextResponse.json({ items: settings.items });
  } catch (error) {
    console.error('Error loading event gift add-ons:', error);
    return NextResponse.json({ error: 'Failed to load event gift add-ons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const existing = await getAdminSettingsByKey<Partial<EventGiftAddOnSettings>>(EVENT_GIFT_ADD_ONS_SETTINGS_KEY);
    const settings = sanitizeEventGiftAddOnSettings(existing ?? defaultEventGiftAddOnSettings);
    const nextItem = buildGiftAddOnPayload(body, settings.items.length);

    if (!nextItem) {
      return NextResponse.json({ error: 'Gift name is required.' }, { status: 400 });
    }

    settings.items.push(nextItem);
    const normalized = sanitizeEventGiftAddOnSettings(settings);

    await upsertAdminSettings({
      key: EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
      value: normalized,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ items: normalized.items }, { status: 201 });
  } catch (error) {
    console.error('Error creating event gift add-on:', error);
    return NextResponse.json({ error: 'Failed to create event gift add-on' }, { status: 500 });
  }
}