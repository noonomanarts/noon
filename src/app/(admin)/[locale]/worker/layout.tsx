import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import MobileSidebar from "@/components/admin/MobileSidebar";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import {
  FiGrid,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiPrinter,
  FiBell,
} from "react-icons/fi";

type WorkerIconName = "FiGrid" | "FiPackage" | "FiShoppingCart" | "FiTruck" | "FiPrinter" | "FiBell";

type WorkerMenuItem = {
  iconName: WorkerIconName;
  iconColor: string;
  label: string;
  href: string;
  permissionKey?: WorkerPermissionKey;
  badgeCount?: number;
};

type WorkerMenuSection = {
  section: string;
  items: WorkerMenuItem[];
};

type WorkerPermissionKey =
  | "can_restock"
  | "can_record_sales"
  | "can_manage_orders"
  | "can_print_labels"
  | "can_print_bills";

export default async function WorkerLayout({
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
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) {
    redirect(`/${locale}/account`);
  }

  // Get worker permissions
  const permissions = user.role === "ADMIN" ? getFullWorkerPermissions(user.id) : await getWorkerPermissions(user.id);

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("noon_session");
    const { redirect } = await import("next/navigation");
    redirect(`/${rawLocale}/login`);
  }

  const isRTL = locale === "ar";
  const t = {
    panel: isRTL ? "لوحة العامل" : "Worker Panel",
    management: isRTL ? "لوحة التحكم" : "Dashboard",
    overview: isRTL ? "نظرة عامة" : "Overview",
    dashboard: isRTL ? "لوحة التحكم" : "Dashboard",
    restock: isRTL ? "إعادة التخزين" : "Restock",
    sales: isRTL ? "المبيعات" : "Sales",
    orders: isRTL ? "طلبات الموقع" : "Website Orders",
    print: isRTL ? "الطباعة" : "Print",
    notifications: isRTL ? "الإشعارات" : "Notifications",
    logout: isRTL ? "تسجيل خروج" : "Logout",
    profile: isRTL ? "الملف الشخصي" : "Profile",
    accountSettings: isRTL ? "إعدادات الحساب" : "Account Settings",
    viewSite: isRTL ? "عرض الموقع" : "View Site",
    languageEn: "English",
    languageAr: "العربية",
  };

  const allMenuItems: WorkerMenuSection[] = [
    {
      section: t.management,
      items: [
        {
          iconName: "FiGrid",
          iconColor: "text-indigo-500",
          label: t.dashboard,
          href: `/${locale}/worker`,
        },
        {
          iconName: "FiPackage",
          iconColor: "text-emerald-500",
          label: t.restock,
          href: `/${locale}/worker/restock`,
          permissionKey: "can_restock",
        },
        {
          iconName: "FiShoppingCart",
          iconColor: "text-amber-500",
          label: t.sales,
          href: `/${locale}/worker/sales`,
          permissionKey: "can_record_sales",
        },
        {
          iconName: "FiTruck",
          iconColor: "text-blue-500",
          label: t.orders,
          href: `/${locale}/worker/orders`,
          permissionKey: "can_manage_orders",
        },
        {
          iconName: "FiPrinter",
          iconColor: "text-purple-500",
          label: t.print,
          href: `/${locale}/worker/print`,
          permissionKey: "can_print_labels",
        },
      ],
    },
  ];

  // Filter menu items based on permissions
  const menuItems: WorkerMenuSection[] = allMenuItems.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.permissionKey) return true;
      return permissions?.[item.permissionKey] ?? false;
    }),
  })).filter((section) => section.items.length > 0);

  const iconComponents: Record<WorkerIconName, React.ReactNode> = {
    FiGrid: <FiGrid className="h-5 w-5" />,
    FiPackage: <FiPackage className="h-5 w-5" />,
    FiShoppingCart: <FiShoppingCart className="h-5 w-5" />,
    FiTruck: <FiTruck className="h-5 w-5" />,
    FiPrinter: <FiPrinter className="h-5 w-5" />,
    FiBell: <FiBell className="h-5 w-5" />,
  };

  return (
    <div
      className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        <OverlayScrollArea className="h-full">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
              <Link
                href={`/${locale}/worker`}
                className="flex items-center gap-2"
              >
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {t.panel}
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-6 px-4 py-6">
              {menuItems.map((section) => (
                <div key={section.section}>
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {section.section}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <span className={item.iconColor}>
                            {iconComponents[item.iconName]}
                          </span>
                          {item.label}
                          {item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span className="ms-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                              {item.badgeCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* View Site Link */}
            <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <Link
                href={`/${locale}`}
                className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {t.viewSite}
              </Link>
            </div>
          </div>
        </OverlayScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white pt-[env(safe-area-inset-top)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-14 items-center justify-between gap-2 px-3 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
            {/* Mobile Menu */}
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <MobileSidebar
                menuItems={menuItems.map((s) => ({
                  section: s.section,
                  items: s.items.map((item) => ({
                    iconName: item.iconName,
                    iconColor: item.iconColor,
                    label: item.label,
                    href: item.href,
                  })),
                }))}
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

            {/* Right side */}
            <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
              <LocaleSwitcher currentLocale={locale} />
              <AdminNotificationCenter locale={locale} userRole={user.role} />
              <AdminProfileMenu
                userName={user.fullName}
                userEmail={user.email}
                userInitial={user.fullName.charAt(0)}
                profileImage={user.profileImage ?? undefined}
                locale={locale}
                onLogout={handleLogout}
                logoutLabel={t.logout}
                profileLabel={t.profile}
                settingsLabel={t.accountSettings}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-6 lg:pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>
      </div>
    </div>
  );
}
