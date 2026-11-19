import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import ContactPageClient from "@/components/site/ContactPageClient";
import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { isLocale, type Locale } from "@/lib/locale";
import { resolveMapEmbedUrl } from "@/lib/mapEmbed";
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

  // Admins usually paste a normal share link; only a dedicated embed URL can
  // be framed, so resolve it on the server (falls back to the "open map" link).
  const mapEmbedSrc = await resolveMapEmbedUrl(
    settings.contactPage.mapEmbedUrl.trim() || settings.contactPage.mapLink.trim(),
    locale
  );

  return <ContactPageClient locale={locale} settings={settings} mapEmbedSrc={mapEmbedSrc} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, {
    path: "/contact",
    title: { ar: "تواصل معنا", en: "Contact Us" },
    description: {
      ar: "تواصل مع فريق نون في مسقط: الموقع على الخريطة، رقم الهاتف، البريد الإلكتروني ونموذج المراسلة.",
      en: "Get in touch with the Noon team in Muscat: map location, phone, email and a contact form.",
    },
  });
}
