export type ShopCartItem = {
  id: string;
  kind: 'SHOP_PRODUCT';
  productId: string;
  quantity: number;
};

export type CartParticipant = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: 'en' | 'ar';
  gender: 'MALE' | 'FEMALE' | 'OTHER';
};

export type ClassCartItem = {
  id: string;
  kind: 'CLASS_BOOKING';
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  image: string | null;
  startDateTime: string | null;
  price: number;
  currency: string;
  numberOfParticipants: number;
  participants: CartParticipant[];
  freePartners: CartParticipant[];
  specialRequests: string;
  audienceGender?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED' | null;
  subCategory?: string | null;
};

export type EventCartItem = {
  id: string;
  kind: 'EVENT_BOOKING';
  eventType: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
  title: string;
  titleAr: string;
  selectedDate: string;
  selectedTime: string;
  estimatedTotal: number | null;
  currency: string;
  payload: Record<string, unknown>;
};

export type CartItem = ShopCartItem | ClassCartItem | EventCartItem;

export type CartState = {
  items: CartItem[];
  updatedAt: string;
};

export const CART_COOKIE_NAME = 'noon_cart';

const MAX_ITEMS = 100;
const MAX_QTY_PER_ITEM = 99;

function createCartItemId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isParticipant(value: unknown): value is CartParticipant {
  if (!value || typeof value !== 'object') return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.fullName === 'string' && row.fullName.trim().length > 0 &&
    typeof row.dateOfBirth === 'string' && row.dateOfBirth.trim().length > 0 &&
    (row.preferredLanguage === 'en' || row.preferredLanguage === 'ar') &&
    (row.gender === 'MALE' || row.gender === 'FEMALE' || row.gender === 'OTHER')
  );
}

function parseParticipants(value: unknown): CartParticipant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const participants: CartParticipant[] = [];
  for (const item of value) {
    if (!isParticipant(item)) {
      continue;
    }

    participants.push({
      fullName: item.fullName.trim(),
      dateOfBirth: item.dateOfBirth.trim(),
      preferredLanguage: item.preferredLanguage,
      gender: item.gender,
    });
  }

  return participants.slice(0, 20);
}

function normalizeShopItem(rawItem: Record<string, unknown>): ShopCartItem | null {
  const productId = typeof rawItem.productId === 'string' ? rawItem.productId.trim() : '';
  const quantityRaw = Number(rawItem.quantity);
  const quantity = Number.isFinite(quantityRaw) ? Math.trunc(quantityRaw) : 0;

  if (!productId || quantity <= 0) {
    return null;
  }

  return {
    id: typeof rawItem.id === 'string' && rawItem.id.trim().length > 0 ? rawItem.id.trim() : `shop:${productId}`,
    kind: 'SHOP_PRODUCT',
    productId,
    quantity: Math.min(MAX_QTY_PER_ITEM, quantity),
  };
}

function normalizeClassItem(rawItem: Record<string, unknown>): ClassCartItem | null {
  const classId = typeof rawItem.classId === 'string' ? rawItem.classId.trim() : '';
  const slug = typeof rawItem.slug === 'string' ? rawItem.slug.trim() : '';
  const title = typeof rawItem.title === 'string' ? rawItem.title.trim() : '';
  const titleAr = typeof rawItem.titleAr === 'string' ? rawItem.titleAr.trim() : null;
  const image = typeof rawItem.image === 'string' ? rawItem.image.trim() : null;
  const startDateTime = typeof rawItem.startDateTime === 'string' ? rawItem.startDateTime.trim() : null;
  const price = Number(rawItem.price);
  const currency = typeof rawItem.currency === 'string' ? rawItem.currency.trim() : 'OMR';
  const numberOfParticipantsRaw = Number(rawItem.numberOfParticipants);
  const numberOfParticipants = Number.isInteger(numberOfParticipantsRaw) ? numberOfParticipantsRaw : 0;
  const participants = parseParticipants(rawItem.participants);
  const freePartners = parseParticipants(rawItem.freePartners);
  const specialRequests = typeof rawItem.specialRequests === 'string' ? rawItem.specialRequests.slice(0, 3000) : '';
  const audienceGender =
    rawItem.audienceGender === 'MALE_ONLY' || rawItem.audienceGender === 'FEMALE_ONLY' || rawItem.audienceGender === 'MIXED'
      ? rawItem.audienceGender
      : null;
  const subCategory = typeof rawItem.subCategory === 'string' ? rawItem.subCategory : null;

  if (!classId || !slug || !title || !Number.isFinite(price) || numberOfParticipants < 1 || participants.length !== numberOfParticipants) {
    return null;
  }

  return {
    id: typeof rawItem.id === 'string' && rawItem.id.trim().length > 0 ? rawItem.id.trim() : createCartItemId('class'),
    kind: 'CLASS_BOOKING',
    classId,
    slug,
    title,
    titleAr,
    image,
    startDateTime,
    price: Number(price.toFixed(3)),
    currency,
    numberOfParticipants,
    participants,
    freePartners,
    specialRequests,
    audienceGender,
    subCategory,
  };
}

function normalizeEventType(value: unknown): EventCartItem['eventType'] | null {
  if (value === 'COOKING_COMPETITION' || value === 'PRIVATE_CLASS' || value === 'BIRTHDAY_PARTY') {
    return value;
  }
  return null;
}

function normalizeEventItem(rawItem: Record<string, unknown>): EventCartItem | null {
  const eventType = normalizeEventType(rawItem.eventType);
  const title = typeof rawItem.title === 'string' ? rawItem.title.trim() : '';
  const titleAr = typeof rawItem.titleAr === 'string' ? rawItem.titleAr.trim() : '';
  const selectedDate = typeof rawItem.selectedDate === 'string' ? rawItem.selectedDate.trim() : '';
  const selectedTime = typeof rawItem.selectedTime === 'string' ? rawItem.selectedTime.trim() : '';
  const estimatedTotalRaw = rawItem.estimatedTotal == null ? null : Number(rawItem.estimatedTotal);
  const estimatedTotal = estimatedTotalRaw != null && Number.isFinite(estimatedTotalRaw)
    ? Number(estimatedTotalRaw.toFixed(3))
    : null;
  const currency = typeof rawItem.currency === 'string' ? rawItem.currency.trim() : 'OMR';
  const payload = rawItem.payload && typeof rawItem.payload === 'object' ? rawItem.payload as Record<string, unknown> : null;

  if (!eventType || !title || !titleAr || !selectedDate || !selectedTime || !payload) {
    return null;
  }

  return {
    id: typeof rawItem.id === 'string' && rawItem.id.trim().length > 0 ? rawItem.id.trim() : createCartItemId('event'),
    kind: 'EVENT_BOOKING',
    eventType,
    title,
    titleAr,
    selectedDate,
    selectedTime,
    estimatedTotal,
    currency,
    payload,
  };
}

export function emptyCart(): CartState {
  return {
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCart(input: unknown): CartState {
  if (!input || typeof input !== 'object') {
    return emptyCart();
  }

  const rawItems = Array.isArray((input as { items?: unknown }).items)
    ? ((input as { items: unknown[] }).items)
    : [];

  const items: CartItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const record = rawItem as Record<string, unknown>;
    const kind = typeof record.kind === 'string' ? record.kind : 'SHOP_PRODUCT';

    const normalizedItem =
      kind === 'CLASS_BOOKING'
        ? normalizeClassItem(record)
        : kind === 'EVENT_BOOKING'
          ? normalizeEventItem(record)
          : normalizeShopItem(record);

    if (!normalizedItem) continue;

    items.push(normalizedItem);

    if (items.length >= MAX_ITEMS) break;
  }

  return {
    items,
    updatedAt: new Date().toISOString(),
  };
}

export function parseCartCookie(rawValue: string | undefined): CartState {
  if (!rawValue) return emptyCart();

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return normalizeCart(parsed);
  } catch {
    return emptyCart();
  }
}

export function serializeCartCookie(cart: CartState): string {
  return JSON.stringify(normalizeCart(cart));
}

export function addToCart(cart: CartState, productId: string, quantity = 1): CartState {
  const normalized = normalizeCart(cart);
  const targetId = productId.trim();
  const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, Math.trunc(quantity || 1)));

  if (!targetId) return normalized;

  const existing = normalized.items.find(
    (item): item is ShopCartItem => item.kind === 'SHOP_PRODUCT' && item.productId === targetId
  );
  if (existing) {
    existing.quantity = Math.min(MAX_QTY_PER_ITEM, existing.quantity + qty);
  } else if (normalized.items.length < MAX_ITEMS) {
    normalized.items.push({ id: `shop:${targetId}`, kind: 'SHOP_PRODUCT', productId: targetId, quantity: qty });
  }

  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function addClassBookingToCart(cart: CartState, item: Omit<ClassCartItem, 'id' | 'kind'>): CartState {
  const normalized = normalizeCart(cart);
  if (normalized.items.length >= MAX_ITEMS) {
    return normalized;
  }

  normalized.items.push({
    ...item,
    id: createCartItemId('class'),
    kind: 'CLASS_BOOKING',
  });
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function addEventBookingToCart(cart: CartState, item: Omit<EventCartItem, 'id' | 'kind'>): CartState {
  const normalized = normalizeCart(cart);
  if (normalized.items.length >= MAX_ITEMS) {
    return normalized;
  }

  normalized.items.push({
    ...item,
    id: createCartItemId('event'),
    kind: 'EVENT_BOOKING',
  });
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function updateCartItemQuantity(cart: CartState, itemId: string, quantity: number): CartState {
  const normalized = normalizeCart(cart);
  const targetId = itemId.trim();

  if (!targetId) return normalized;

  const nextQuantity = Math.trunc(quantity);
  const index = normalized.items.findIndex((item) => item.id === targetId && item.kind === 'SHOP_PRODUCT');

  if (index < 0) return normalized;

  if (nextQuantity <= 0) {
    normalized.items.splice(index, 1);
  } else {
    const currentItem = normalized.items[index];
    if (!currentItem || currentItem.kind !== 'SHOP_PRODUCT') {
      return normalized;
    }

    normalized.items[index] = {
      ...currentItem,
      quantity: Math.min(MAX_QTY_PER_ITEM, nextQuantity),
    };
  }

  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function removeFromCart(cart: CartState, productId: string): CartState {
  const normalized = normalizeCart(cart);
  const targetId = productId.trim();
  if (!targetId) return normalized;

  normalized.items = normalized.items.filter((item) => item.id !== targetId && !(item.kind === 'SHOP_PRODUCT' && item.productId === targetId));
  normalized.updatedAt = new Date().toISOString();
  return normalized;
}
