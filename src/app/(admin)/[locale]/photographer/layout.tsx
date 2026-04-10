import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import MobileSidebar from "@/components/admin/MobileSidebar";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import { isPhotographerDashboardRole } from "@/lib/db/photographer";
import {
  FiGrid,
  FiCalendar,
  FiCheckSquare,
  FiBell,
} from "react-icons/fi";

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
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
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

  const iconMap: Record<PhotographerIconName, typeof FiGrid> = {
    FiGrid,
    FiCalendar,
    FiCheckSquare,
    FiBell,
  };

  return (
    <div className="admin-panel flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950" lang={locale} dir={dir}>
      {/* Sidebar */}
      <aside className={`hidden w-64 flex-shrink-0 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block ${isRTL ? "border-l" : "border-r"}`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800" dir={dir}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <span className="text-lg font-bold">📷</span>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.panel}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.management}</p>
            </div>
          </div>

          {/* Navigation */}
          <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
            <nav className="p-4" dir={dir}>
              <div className="space-y-6">
                {menuItems.map((section) => (
                  <div key={section.section}>
                    <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {section.section}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = iconMap[item.iconName];
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                          >
                            <span className={`flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`}>
                              <Icon className="size-4" />
                            </span>
                            <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
                            {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold leading-none text-white">
                                {item.badgeCount > 99 ? "99+" : item.badgeCount}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </OverlayScrollArea>

          {/* Profile */}
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
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
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900" dir={dir}>
          <div className="flex items-center gap-4">
            <MobileSidebar
              menuItems={menuItems as unknown as Parameters<typeof MobileSidebar>[0]["menuItems"]}
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
            <div className={isRTL ? "text-right" : "text-left"}>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.panel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LocaleSwitcher
              currentLocale={locale}
              labelEn={t.languageEn}
              labelAr={t.languageAr}
            />

            <AdminNotificationCenter locale={locale} />

            <Link
              href={`/${locale}`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t.viewSite}
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
          <div className="p-6">
            {children}
          </div>
        </OverlayScrollArea>
      </main>
    </div>
  );
}
