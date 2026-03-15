import ContactPageClient from "@/components/site/ContactPageClient";
import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const resolvedSettings = await getPublicSitePageSettings("contact");
  const fallbackPage = getSitePageByKey("contact");
  const fallbackSettings = fallbackPage ? getDefaultSitePageSettings(fallbackPage) : null;
  const settings = resolvedSettings ?? fallbackSettings;

  if (!settings) {
    return null;
  }

  return <ContactPageClient locale={locale} settings={settings} />;
}
