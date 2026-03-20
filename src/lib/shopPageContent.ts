import 'server-only';

import { getAdminSettingsByKey } from '@/lib/db/adminSettings';

export type ShopDiscoverLink = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
};

export type ShopPageContentSettings = {
  headerImage: string;
  discoverLinks: ShopDiscoverLink[];
};

const SHOP_PAGE_CONTENT_KEY = 'shop.page-content';

export const defaultShopPageContentSettings: ShopPageContentSettings = {
  headerImage: '/images/slides/1.jpg',
  discoverLinks: [],
};

function sanitizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function sanitizeImage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 600);
  if (!normalized) return fallback;
  if (normalized.startsWith('/')) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return fallback;
}

function sanitizeExternalUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 1000);
  return /^https?:\/\//i.test(normalized) ? normalized : fallback;
}

export function sanitizeShopPageContentSettings(
  input: Partial<ShopPageContentSettings> | null | undefined
): ShopPageContentSettings {
  const source = input ?? {};
  const links = Array.isArray(source.discoverLinks) ? source.discoverLinks : [];

  const discoverLinks = links
    .map((link, index) => {
      const current = link ?? {};
      const linkId =
        typeof current.id === 'string' && current.id.trim().length > 0
          ? current.id.trim().slice(0, 100)
          : `discover-link-${index + 1}`;

      return {
        id: linkId,
        titleEn: sanitizeText(current.titleEn, '', 180),
        titleAr: sanitizeText(current.titleAr, '', 180),
        descriptionEn: sanitizeText(current.descriptionEn, '', 1000),
        descriptionAr: sanitizeText(current.descriptionAr, '', 1000),
        image: sanitizeImage(current.image, ''),
        url: sanitizeExternalUrl(current.url, ''),
        isActive: typeof current.isActive === 'boolean' ? current.isActive : true,
        sortOrder: Number.isFinite(current.sortOrder) ? Number(current.sortOrder) : index,
      } satisfies ShopDiscoverLink;
    })
    .filter((link) => link.titleEn || link.titleAr || link.url)
    .slice(0, 60);

  return {
    headerImage: sanitizeImage(source.headerImage, defaultShopPageContentSettings.headerImage),
    discoverLinks,
  };
}

export async function getShopPageContentSettings(): Promise<ShopPageContentSettings> {
  const saved = await getAdminSettingsByKey<Partial<ShopPageContentSettings>>(SHOP_PAGE_CONTENT_KEY);
  return sanitizeShopPageContentSettings(saved);
}

export function getShopPageContentSettingsKey(): string {
  return SHOP_PAGE_CONTENT_KEY;
}
