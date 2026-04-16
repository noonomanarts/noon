import type { EventType } from '@/lib/db/types';

export type GiftRecipientScope = 'ALL_PARTICIPANTS' | 'WINNING_TEAM';
export type GiftPricingRule = 'PER_PARTICIPANT' | 'DEFERRED';

export interface EventGiftAddOn {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  unitPrice: number;
  appliesTo: EventType[];
  isActive: boolean;
  sortOrder: number;
}

export interface EventGiftAddOnSettings {
  items: EventGiftAddOn[];
}

export interface EventGiftSelection {
  id: string;
  scope: GiftRecipientScope;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  unitPrice: number;
  price: number;
  pricingRule: GiftPricingRule;
  pricingNoteEn?: string;
  pricingNoteAr?: string;
}

export const EVENT_GIFT_ADD_ONS_SETTINGS_KEY = 'event-gift-addons';

export const EVENT_GIFT_ADD_ON_EVENT_TYPES: EventType[] = [
  'COOKING_COMPETITION',
  'PRIVATE_CLASS',
  'BIRTHDAY_PARTY',
];

export const WINNING_TEAM_GIFT_NOTE_EN =
  'Final gift total will be added later based on the number of participants in the winning team.';
export const WINNING_TEAM_GIFT_NOTE_AR =
  'سيتم إضافة إجمالي سعر الهدية لاحقاً بناءً على عدد المشاركين في الفريق الفائز.';