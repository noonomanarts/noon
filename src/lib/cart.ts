export type CartItem = {
  productId: string;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  updatedAt: string;
};

export const CART_COOKIE_NAME = 'noon_cart';

const MAX_ITEMS = 100;
const MAX_QTY_PER_ITEM = 99;

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

    const productId = typeof (rawItem as { productId?: unknown }).productId === 'string'
      ? (rawItem as { productId: string }).productId.trim()
      : '';

    const quantityRaw = Number((rawItem as { quantity?: unknown }).quantity);
    const quantity = Number.isFinite(quantityRaw) ? Math.trunc(quantityRaw) : 0;

    if (!productId || quantity <= 0) continue;

    items.push({
      productId,
      quantity: Math.min(MAX_QTY_PER_ITEM, quantity),
    });

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

  const existing = normalized.items.find((item) => item.productId === targetId);
  if (existing) {
    existing.quantity = Math.min(MAX_QTY_PER_ITEM, existing.quantity + qty);
  } else if (normalized.items.length < MAX_ITEMS) {
    normalized.items.push({ productId: targetId, quantity: qty });
  }

  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function updateCartItemQuantity(cart: CartState, productId: string, quantity: number): CartState {
  const normalized = normalizeCart(cart);
  const targetId = productId.trim();

  if (!targetId) return normalized;

  const nextQuantity = Math.trunc(quantity);
  const index = normalized.items.findIndex((item) => item.productId === targetId);

  if (index < 0) return normalized;

  if (nextQuantity <= 0) {
    normalized.items.splice(index, 1);
  } else {
    normalized.items[index] = {
      ...normalized.items[index],
      quantity: Math.min(MAX_QTY_PER_ITEM, nextQuantity),
    };
  }

  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

export function removeFromCart(cart: CartState, productId: string): CartState {
  return updateCartItemQuantity(cart, productId, 0);
}
