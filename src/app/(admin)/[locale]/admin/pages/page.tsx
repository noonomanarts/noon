import { isLocale, type Locale } from "@/lib/locale";
import { getAdminSettingsByPrefix } from "@/lib/db/adminSettings";
import {
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  sitePageCatalog,
  type SitePageSettings,
} from "@/lib/admin/sitePages";
import AdminPagesPageClient, {
  type AdminSitePageListItem,
} from "@/components/admin/AdminPagesPageClient";

export default async function AdminPagesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const savedSettingsMap =
    await getAdminSettingsByPrefix<Partial<SitePageSettings>>("page:");

  const pages: AdminSitePageListItem[] = sitePageCatalog.map((page) => {
    const settingsKey = makeSitePageSettingsKey(page.key);
    const hasCustomSettings = Object.prototype.hasOwnProperty.call(savedSettingsMap, settingsKey);
    const settings = sanitizeSitePageSettings(page, savedSettingsMap[settingsKey]);

    return {
      key: page.key,
      pathTemplate: page.pathTemplate,
      group: page.group,
      nameEn: page.nameEn,
      nameAr: page.nameAr,
      descriptionEn: page.descriptionEn,
      descriptionAr: page.descriptionAr,
      hasCustomSettings,
      visibility: settings.visibility,
      navPlacement: settings.navPlacement,
      footerVisible: settings.footerVisible,
      indexable: settings.indexable,
    };
  });

  return <AdminPagesPageClient locale={locale} initialPages={pages} />;
}
