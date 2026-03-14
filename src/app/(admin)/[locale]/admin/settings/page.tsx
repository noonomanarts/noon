import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale } from "@/lib/locale";
import AdminSettingsPageClient from "@/components/admin/AdminSettingsPageClient";
import {
  defaultClassFinanceAdminSettings,
  defaultFooterAdminSettings,
  defaultGeneralAdminSettings,
  defaultWhatsAppFloatingButtonSettings,
  defaultWhatsAppAdminSettings,
  type ClassFinanceAdminSettings,
  type FooterAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
  sanitizeFooterAdminSettings,
  type WhatsAppFloatingButtonSettings,
  type WhatsAppAdminSettings,
} from "@/lib/db/adminSettings";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    redirect("/en/admin");
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("noon_session")?.value;

  if (!userId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(userId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const [savedGeneral, savedWhatsApp, savedClassFinance, savedWhatsAppFloatingButton, savedFooter] = await Promise.all([
    getAdminSettingsByKey<GeneralAdminSettings>("general"),
    getAdminSettingsByKey<WhatsAppAdminSettings>("whatsapp"),
    getAdminSettingsByKey<ClassFinanceAdminSettings>("class-finance"),
    getAdminSettingsByKey<WhatsAppFloatingButtonSettings>("whatsapp-floating-button"),
    getAdminSettingsByKey<FooterAdminSettings>("footer"),
  ]);

  const initialGeneral = {
    ...defaultGeneralAdminSettings,
    ...(savedGeneral ?? {}),
  };

  const initialWhatsApp = {
    ...defaultWhatsAppAdminSettings,
    ...(savedWhatsApp ?? {}),
  };

  const initialClassFinance = {
    ...defaultClassFinanceAdminSettings,
    ...(savedClassFinance ?? {}),
  };

  const initialWhatsAppFloatingButton = {
    ...defaultWhatsAppFloatingButtonSettings,
    ...(savedWhatsAppFloatingButton ?? {}),
  };
  const initialFooter = sanitizeFooterAdminSettings(savedFooter ?? defaultFooterAdminSettings);

  return (
    <AdminSettingsPageClient
      locale={locale}
      initialGeneral={initialGeneral}
      initialWhatsApp={initialWhatsApp}
      initialClassFinance={initialClassFinance}
      initialWhatsAppFloatingButton={initialWhatsAppFloatingButton}
      initialFooter={initialFooter}
    />
  );
}
