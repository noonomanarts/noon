import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale } from "@/lib/locale";
import BackupSection from "@/components/admin/BackupSection";
import { FiSettings } from "react-icons/fi";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    redirect("/en/admin");
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(userId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const t = {
    title: locale === "ar" ? "الإعدادات" : "Settings",
    subtitle: locale === "ar" 
      ? "إدارة النسخ الاحتياطي واستعادة البيانات" 
      : "Manage backups and data restoration",
    backupRestore: locale === "ar" ? "النسخ الاحتياطي والاستعادة" : "Backup & Restore",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
          <FiSettings className="size-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t.backupRestore}
        </h2>
        <BackupSection locale={locale as "en" | "ar"} />
      </div>
    </div>
  );
}
