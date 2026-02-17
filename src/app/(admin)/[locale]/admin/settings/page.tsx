import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale } from "@/lib/locale";
import AdminSettingsPageClient from "@/components/admin/AdminSettingsPageClient";
import { defaultGeneralAdminSettings, getAdminSettingsByKey, type GeneralAdminSettings } from "@/lib/db/adminSettings";

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

  const savedGeneral = await getAdminSettingsByKey<GeneralAdminSettings>("general");
  const initialGeneral = {
    ...defaultGeneralAdminSettings,
    ...(savedGeneral ?? {}),
  };

  return <AdminSettingsPageClient locale={locale} initialGeneral={initialGeneral} />;
}
