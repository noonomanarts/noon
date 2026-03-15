import { type SitePageSettings, getSitePageByKey, makeSitePageSettingsKey, sanitizeSitePageSettings } from "@/lib/admin/sitePages";
import { getAdminSettingsByKey } from "@/lib/db/adminSettings";

export async function getPublicSitePageSettings(pageKey: string): Promise<SitePageSettings | null> {
  const page = getSitePageByKey(pageKey);
  if (!page) return null;

  try {
    const settingsKey = makeSitePageSettingsKey(page.key);
    const saved = await getAdminSettingsByKey<Partial<SitePageSettings>>(settingsKey);
    return sanitizeSitePageSettings(page, saved);
  } catch {
    return sanitizeSitePageSettings(page, null);
  }
}
