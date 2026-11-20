import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isLocale, type Locale } from "@/lib/locale";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingWhatsAppButton from "@/components/site/FloatingWhatsAppButton";
import FloatingInstallButton from "@/components/pwa/FloatingInstallButton";
import PaymentRecovery from "@/components/site/PaymentRecovery";
import {
  defaultWhatsAppFloatingButtonSettings,
  getAdminSettingsByKey,
  type WhatsAppFloatingButtonSettings,
} from "@/lib/db/adminSettings";

export default async function SiteLocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  // Only /ar and /en are real sections. Anything else used to render the home
  // page with a 200 (so /robots.txt, /sitemap.xml and any typo looked like
  // valid pages to search engines); answer with a proper 404 instead.
  if (!isLocale(rawLocale)) {
    const legacy = rawLocale.toLowerCase();
    if (legacy.startsWith("ar-") || legacy.startsWith("en-")) {
      redirect(`/${legacy.slice(0, 2)}`);
    }
    notFound();
  }
  const locale: Locale = rawLocale;
  const savedWhatsAppFloatingButton = await getAdminSettingsByKey<Partial<WhatsAppFloatingButtonSettings>>(
    "whatsapp-floating-button"
  ).catch(() => null);
  const whatsappFloatingButton = {
    ...defaultWhatsAppFloatingButtonSettings,
    ...(savedWhatsAppFloatingButton ?? {}),
  };

  return (
    <div className="site-sharp flex min-h-dvh flex-col overflow-x-clip">
      <Header locale={locale} />
      <main className="route-sharp flex-1">{children}</main>
      <Footer locale={locale} />
      <FloatingWhatsAppButton locale={locale} settings={whatsappFloatingButton} />
      <FloatingInstallButton locale={locale} whatsapp={whatsappFloatingButton} />
      <PaymentRecovery />
    </div>
  );
}
