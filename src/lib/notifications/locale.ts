/**
 * Shared helpers for resolving the recipient's effective language.
 *
 * When the user has not explicitly picked a language, we fall back to the
 * site-wide `defaultLocale` from admin settings rather than hardcoding EN.
 */

import { defaultGeneralAdminSettings, type GeneralAdminSettings } from '@/lib/adminSettings';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';

let cachedDefault: Promise<'en' | 'ar'> | null = null;
let cacheExpiresAt = 0;

async function loadDefaultLocale(): Promise<'en' | 'ar'> {
  const saved = await getAdminSettingsByKey<GeneralAdminSettings>('general');
  const merged = saved ?? defaultGeneralAdminSettings;
  return merged.defaultLocale === 'ar' ? 'ar' : 'en';
}

export async function getSiteDefaultLocale(): Promise<'en' | 'ar'> {
  const now = Date.now();
  if (cachedDefault && now < cacheExpiresAt) return cachedDefault;
  cachedDefault = loadDefaultLocale();
  cacheExpiresAt = now + 60_000;
  try {
    return await cachedDefault;
  } catch (error) {
    cachedDefault = null;
    cacheExpiresAt = 0;
    console.error('[locale] failed to load site default locale:', error);
    return 'en';
  }
}

export async function resolveUserLocale(preferredLanguage: string | null | undefined): Promise<'en' | 'ar'> {
  if (preferredLanguage) {
    return preferredLanguage.toUpperCase().startsWith('AR') ? 'ar' : 'en';
  }
  return getSiteDefaultLocale();
}

export function toTemplateText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => toTemplateText(vars[key]));
}
