import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import type { EventType } from '@/lib/db/types';
import {
  EVENT_GIFT_ADD_ON_EVENT_TYPES,
  EVENT_GIFT_ADD_ONS_SETTINGS_KEY,
  WINNING_TEAM_GIFT_NOTE_AR,
  WINNING_TEAM_GIFT_NOTE_EN,
  type EventGiftAddOn,
  type EventGiftAddOnSettings,
  type EventGiftSelection,
  type GiftRecipientScope,
} from '@/lib/eventGiftAddOnTypes';

export const defaultEventGiftAddOnSettings: EventGiftAddOnSettings = {
  items: [
    {
      id: 'default-premium-gift-box',
      nameEn: 'Premium Gift Box',
      nameAr: 'صندوق هدايا فاخر',
      descriptionEn: 'A refined signature gift box.',
      descriptionAr: 'صندوق هدايا أنيق بتوقيع مميز.',
      image: '/images/gift-1.jpg',
      unitPrice: 150,
      appliesTo: ['COOKING_COMPETITION'],
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'default-branded-apron-set',
      nameEn: 'Branded Apron Set',
      nameAr: 'طقم مريول مميز',
      descriptionEn: 'Noon apron set with a polished finish.',
      descriptionAr: 'طقم مراييل نون بلمسة أنيقة.',
      image: '/images/gift-2.jpg',
      unitPrice: 200,
      appliesTo: ['COOKING_COMPETITION'],
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'default-culinary-tools-kit',
      nameEn: 'Culinary Tools Kit',
      nameAr: 'طقم أدوات الطهي',
      descriptionEn: 'A premium kitchen tools selection.',
      descriptionAr: 'مجموعة راقية من أدوات المطبخ.',
      image: '/images/gift-3.jpg',
      unitPrice: 300,
      appliesTo: ['COOKING_COMPETITION'],
      isActive: true,
      sortOrder: 2,
    },
  ],
};

function normalizeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizePrice(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Number(parsed.toFixed(3));
}

function normalizeSortOrder(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function normalizeAppliesTo(value: unknown): EventType[] {
  if (!Array.isArray(value)) return ['COOKING_COMPETITION'];

  const result = value
    .filter((item): item is EventType =>
      typeof item === 'string' && EVENT_GIFT_ADD_ON_EVENT_TYPES.includes(item as EventType)
    );

  return result.length > 0 ? Array.from(new Set(result)) : ['COOKING_COMPETITION'];
}

function sanitizeEventGiftAddOn(value: unknown, fallbackSortOrder = 0): EventGiftAddOn | null {
  if (!value || typeof value !== 'object') return null;

  const row = value as Record<string, unknown>;
  const id = normalizeText(row.id, 120);
  const nameEn = normalizeText(row.nameEn, 180);
  const nameAr = normalizeText(row.nameAr, 180);
  const descriptionEn = normalizeText(row.descriptionEn, 1200);
  const descriptionAr = normalizeText(row.descriptionAr, 1200);
  const image = normalizeText(row.image, 500);
  const unitPrice = normalizePrice(row.unitPrice);
  const appliesTo = normalizeAppliesTo(row.appliesTo);
  const isActive = row.isActive !== false;
  const sortOrder = normalizeSortOrder(row.sortOrder ?? fallbackSortOrder);

  if (!id || (!nameEn && !nameAr)) {
    return null;
  }

  return {
    id,
    nameEn,
    nameAr,
    descriptionEn,
    descriptionAr,
    image,
    unitPrice,
    appliesTo,
    isActive,
    sortOrder,
  };
}

export function sanitizeEventGiftAddOnSettings(value: unknown): EventGiftAddOnSettings {
  const rawItems =
    value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items)
      ? (value as { items: unknown[] }).items
      : [];

  const seenIds = new Set<string>();
  const items = rawItems
    .map((item, index) => sanitizeEventGiftAddOn(item, index))
    .filter((item): item is EventGiftAddOn => Boolean(item))
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));

  return { items };
}

export async function getEventGiftAddOnSettings(): Promise<EventGiftAddOnSettings> {
  const saved = await getAdminSettingsByKey<Partial<EventGiftAddOnSettings>>(EVENT_GIFT_ADD_ONS_SETTINGS_KEY);
  return sanitizeEventGiftAddOnSettings(saved ?? defaultEventGiftAddOnSettings);
}

export async function getActiveEventGiftAddOns(eventType?: EventType): Promise<EventGiftAddOn[]> {
  const settings = await getEventGiftAddOnSettings();
  return settings.items.filter((item) => {
    if (!item.isActive) return false;
    if (!eventType) return true;
    return item.appliesTo.includes(eventType);
  });
}

function normalizeGiftSelectionInput(value: unknown): Array<{ id: string; scope: GiftRecipientScope }> {
  if (!Array.isArray(value)) return [];

  const selections: Array<{ id: string; scope: GiftRecipientScope }> = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = normalizeText(row.id, 120);
    const scope = row.scope === 'WINNING_TEAM' ? 'WINNING_TEAM' : row.scope === 'ALL_PARTICIPANTS' ? 'ALL_PARTICIPANTS' : '';

    if (!id || !scope) continue;

    const key = `${id}:${scope}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selections.push({ id, scope });
  }

  return selections;
}

export async function resolveEventGiftSelections(input: {
  value: unknown;
  eventType: EventType;
  participantCount: number;
}): Promise<{
  items: EventGiftSelection[];
  estimatedTotal: number;
  deferredCount: number;
}> {
  const catalog = await getActiveEventGiftAddOns(input.eventType);
  const selections = normalizeGiftSelectionInput(input.value);
  const items: EventGiftSelection[] = [];
  let estimatedTotal = 0;
  let deferredCount = 0;

  for (const selection of selections) {
    const gift = catalog.find((item) => item.id === selection.id);
    if (!gift) continue;

    if (selection.scope === 'ALL_PARTICIPANTS') {
      const price = Number((gift.unitPrice * input.participantCount).toFixed(3));
      estimatedTotal += price;
      items.push({
        id: gift.id,
        scope: selection.scope,
        nameEn: gift.nameEn,
        nameAr: gift.nameAr,
        descriptionEn: gift.descriptionEn,
        descriptionAr: gift.descriptionAr,
        image: gift.image,
        unitPrice: gift.unitPrice,
        price,
        pricingRule: 'PER_PARTICIPANT',
      });
      continue;
    }

    deferredCount += 1;
    items.push({
      id: gift.id,
      scope: selection.scope,
      nameEn: gift.nameEn,
      nameAr: gift.nameAr,
      descriptionEn: gift.descriptionEn,
      descriptionAr: gift.descriptionAr,
      image: gift.image,
      unitPrice: gift.unitPrice,
      price: 0,
      pricingRule: 'DEFERRED',
      pricingNoteEn: WINNING_TEAM_GIFT_NOTE_EN,
      pricingNoteAr: WINNING_TEAM_GIFT_NOTE_AR,
    });
  }

  return {
    items,
    estimatedTotal: Number(estimatedTotal.toFixed(3)),
    deferredCount,
  };
}