import type { ReactNode } from "react";

import { isLocale, type Locale } from "@/lib/locale";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingWhatsAppButton from "@/components/site/FloatingWhatsAppButton";
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
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const savedWhatsAppFloatingButton = await getAdminSettingsByKey<Partial<WhatsAppFloatingButtonSettings>>(
    "whatsapp-floating-button"
  ).catch(() => null);
  const whatsappFloatingButton = {
    ...defaultWhatsAppFloatingButtonSettings,
    ...(savedWhatsAppFloatingButton ?? {}),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <Header locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
      <FloatingWhatsAppButton locale={locale} settings={whatsappFloatingButton} />
    </div>
  );
}
