import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import MobileSidebar from "@/components/admin/MobileSidebar";
import DashboardSidebar from "@/components/admin/DashboardSidebar";

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

  return (
    <div
      className="admin-panel flex min-h-dvh bg-zinc-100 dark:bg-zinc-950"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <DashboardSidebar
        locale={locale}
        menuItems={menuItems}
        title={t.panel}
        homeHref={`/${locale}/worker`}
        viewSiteLabel={t.viewSite}
        storageKey="noon_worker_nav"
      />

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
                storageKey="noon_worker_nav"
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
                variant="avatar"
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
