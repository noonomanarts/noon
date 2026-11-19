import { readSessionUserId } from '@/lib/sessionToken';
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import MobileSidebar from "@/components/admin/MobileSidebar";
import DashboardSidebar from "@/components/admin/DashboardSidebar";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import { isPhotographerDashboardRole } from "@/lib/db/photographer";

type PhotographerIconName = "FiGrid" | "FiCalendar" | "FiCheckSquare" | "FiBell";

type PhotographerMenuItem = {
  iconName: PhotographerIconName;
  iconColor: string;
  label: string;
  href: string;
  badgeCount?: number;
};

type PhotographerMenuSection = {
  section: string;
  items: PhotographerMenuItem[];
};

export default async function PhotographerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getSessionUserById(sessionId);
  if (!user || !isPhotographerDashboardRole(user.role)) {
    redirect(`/${locale}/account`);
  }

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("noon_session");
    const { redirect } = await import("next/navigation");
    redirect(`/${rawLocale}/login`);
  }

  const isRTL = locale === "ar";
  const t = {
    panel: isRTL ? "لوحة المصور" : "Photographer Panel",
    management: isRTL ? "لوحة التحكم" : "Dashboard",
    overview: isRTL ? "نظرة عامة" : "Overview",
    dashboard: isRTL ? "لوحة التحكم" : "Dashboard",
    schedule: isRTL ? "الجدول الزمني" : "Schedule",
    tasks: isRTL ? "المهام" : "Tasks",
    notifications: isRTL ? "الإشعارات" : "Notifications",
    logout: isRTL ? "تسجيل خروج" : "Logout",
    profile: isRTL ? "الملف الشخصي" : "Profile",
    accountSettings: isRTL ? "إعدادات الحساب" : "Account Settings",
    viewSite: isRTL ? "عرض الموقع" : "View Site",
    languageEn: "English",
    languageAr: "العربية",
  };

  const menuItems: PhotographerMenuSection[] = [
    {
      section: t.overview,
      items: [
        { iconName: "FiGrid", iconColor: "text-violet-600 dark:text-violet-400", label: t.dashboard, href: `/${locale}/photographer` },
        { iconName: "FiCalendar", iconColor: "text-sky-600 dark:text-sky-400", label: t.schedule, href: `/${locale}/photographer/schedule` },
        { iconName: "FiCheckSquare", iconColor: "text-emerald-600 dark:text-emerald-400", label: t.tasks, href: `/${locale}/photographer/tasks` },
      ],
    },
  ];

  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div className="admin-panel flex min-h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950" lang={locale} dir={dir}>
      <DashboardSidebar
        locale={locale}
        menuItems={menuItems}
        title={t.panel}
        homeHref={`/${locale}/photographer`}
        viewSiteLabel={t.viewSite}
        storageKey="noon_photographer_nav"
        footer={
          <AdminProfileMenu
            userName={user.fullName}
            userEmail={user.email}
            userInitial={user.fullName.charAt(0)}
            profileImage={user.profileImage ?? undefined}
            logoutLabel={t.logout}
            profileLabel={t.profile}
            settingsLabel={t.accountSettings}
            onLogout={handleLogout}
            locale={locale}
          />
        }
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] dark:border-zinc-800 dark:bg-zinc-900" dir={dir}>
          <div className="flex h-14 items-center justify-between gap-2 px-3 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <MobileSidebar
                menuItems={menuItems}
                storageKey="noon_photographer_nav"
                user={{
                  fullName: user.fullName,
                  email: user.email,
                  profileImage: user.profileImage ?? undefined,
                }}
                locale={locale}
                translations={{
                  adminPanel: t.panel,
                  management: t.management,
                  logout: t.logout,
                  profile: t.profile,
                  accountSettings: t.accountSettings,
                }}
                onLogoutAction={handleLogout}
              />
            </div>

            <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
              <LocaleSwitcher
                currentLocale={locale}
                labelEn={t.languageEn}
                labelAr={t.languageAr}
              />

              <AdminNotificationCenter locale={locale} userRole={user.role} />

              <Link
                href={`/${locale}`}
                className="hidden shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:inline-flex sm:text-sm"
              >
                {t.viewSite}
              </Link>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </OverlayScrollArea>
      </main>
    </div>
  );
}
