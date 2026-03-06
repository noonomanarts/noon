import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { getAdminSettingsByKey } from "@/lib/db/adminSettings";
import {
  getSitePageByKey,
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  type SitePageSettings,
} from "@/lib/admin/sitePages";
import AdminPageSettingsClient from "@/components/admin/AdminPageSettingsClient";

export default async function AdminPageSettingsEntry({
  params,
}: {
  params: Promise<{ locale: string; pageKey: string }>;
}) {
  const { locale: rawLocale, pageKey } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const page = getSitePageByKey(pageKey);
  if (!page) {
    notFound();
  }

  const settingsKey = makeSitePageSettingsKey(page.key);
  const saved = await getAdminSettingsByKey<Partial<SitePageSettings>>(settingsKey);
  const initialSettings = sanitizeSitePageSettings(page, saved);

  return (
    <AdminPageSettingsClient
      locale={locale}
      page={page}
      initialSettings={initialSettings}
    />
  );
}
