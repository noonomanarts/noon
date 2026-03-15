import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import ThemeToggle from "@/components/site/ThemeToggle";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import { AdminWalletDisplay } from "@/components/admin/AdminWalletDisplay";
import MobileSidebar from "@/components/admin/MobileSidebar";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import { countTrainerWorkshopSuggestionsPendingReview } from "@/lib/db/trainers";
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiGrid,
  FiSettings,
  FiShoppingBag,
  FiThumbsUp,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiFileText,
  FiAward,
  FiCreditCard,
  FiPackage,
  FiMessageSquare,
} from "react-icons/fi";

type AdminIconName =
  | "FiGrid"
  | "FiTrendingUp"
  | "FiBookOpen"
  | "FiCalendar"
  | "FiAward"
  | "FiUsers"
  | "FiUserCheck"
  | "FiCreditCard"
  | "FiThumbsUp"
  | "FiShoppingBag"
  | "FiFileText"
  | "FiSettings"
  | "FiBell"
  | "FiPackage"
  | "FiMessageSquare";

type AdminMenuItem = {
  iconName: AdminIconName;
  iconColor: string;
  label: string;
  href: string;
  badgeCount?: number;
};

type AdminMenuSection = {
  section: string;
  items: AdminMenuItem[];
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Auth check
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const pendingSuggestedWorkshops = await countTrainerWorkshopSuggestionsPendingReview();

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("noon_session");
    const { redirect } = await import("next/navigation");
    redirect(`/${rawLocale}/login`);
  }

  const t = {
    adminPanel: locale === "ar" ? "لوحة الإدارة" : "Admin Panel",
    management: locale === "ar" ? "لوحة التحكم" : "Management Panel",
    overview: locale === "ar" ? "نظرة عامة" : "Overview",
    finance: locale === "ar" ? "المالية" : "Finance",
    dashboard: locale === "ar" ? "لوحة التحكم" : "Dashboard",
    analytics: locale === "ar" ? "التحليلات" : "Analytics",
    financeReports: locale === "ar" ? "المالية والتقارير" : "Finance & Reports",
    inventory: locale === "ar" ? "المخزون" : "Inventory",
    classesEvents: locale === "ar" ? "الدورات والفعاليات" : "Classes & Events",
    classes: locale === "ar" ? "الدورات" : "Classes",
    timetable: locale === "ar" ? "الجدول الزمني" : "Timetable",
    events: locale === "ar" ? "الفعاليات" : "Events",
    users: locale === "ar" ? "المستخدمون" : "Users",
    customers: locale === "ar" ? "العملاء" : "Customers",
    trainers: locale === "ar" ? "المدربون" : "Trainers",
    suggestedWorkshops: locale === "ar" ? "المقترحات" : "Suggestions",
    payments: locale === "ar" ? "المدفوعات" : "Payments",
    content: locale === "ar" ? "المحتوى" : "Content",
    shop: locale === "ar" ? "المتجر" : "Shop",
    shopCategories: locale === "ar" ? "تصنيفات المتجر" : "Shop Categories",
    shopProducts: locale === "ar" ? "منتجات المتجر" : "Shop Products",
    shopOrders: locale === "ar" ? "طلبات المتجر" : "Shop Orders",
    recommendations: locale === "ar" ? "التوصيات" : "Recommendations",
    recipes: locale === "ar" ? "الوصفات" : "Recipes",
    pages: locale === "ar" ? "الصفحات" : "Pages",
    contactMessages: locale === "ar" ? "رسائل التواصل" : "Contact Messages",
    settings: locale === "ar" ? "الإعدادات" : "Settings",
    notifications: locale === "ar" ? "الإشعارات" : "Notifications",
    whatsapp: locale === "ar" ? "واتساب" : "WhatsApp",
    logout: locale === "ar" ? "تسجيل خروج" : "Logout",
    profile: locale === "ar" ? "الملف الشخصي" : "Profile",
    accountSettings: locale === "ar" ? "إعدادات الحساب" : "Account Settings",
    viewSite: locale === "ar" ? "عرض الموقع" : "View Site",
    welcomeBack: locale === "ar" ? "مرحباً بعودتك" : "Welcome back",
    theme: locale === "ar" ? "المظهر" : "Theme",
    themeLight: locale === "ar" ? "فاتح" : "Light",
    themeDark: locale === "ar" ? "داكن" : "Dark",
    themeSystem: locale === "ar" ? "حسب النظام" : "System",
    languageEn: "English",
    languageAr: "العربية",
  };

  const menuItems: AdminMenuSection[] = [
    {
      section: t.overview,
      items: [
        { iconName: "FiGrid" as const, iconColor: "text-indigo-600 dark:text-indigo-400", label: t.dashboard, href: `/${locale}/admin` },
        { iconName: "FiTrendingUp" as const, iconColor: "text-emerald-600 dark:text-emerald-400", label: t.analytics, href: `/${locale}/admin/analytics` },
      ],
    },
    {
      section: t.finance,
      items: [
        { iconName: "FiCreditCard" as const, iconColor: "text-teal-600 dark:text-teal-400", label: t.financeReports, href: `/${locale}/admin/finance` },
        { iconName: "FiPackage" as const, iconColor: "text-emerald-600 dark:text-emerald-400", label: t.inventory, href: `/${locale}/admin/finance/inventory` },
      ],
    },
    {
      section: t.classesEvents,
      items: [
        { iconName: "FiBookOpen" as const, iconColor: "text-orange-600 dark:text-orange-400", label: t.classes, href: `/${locale}/admin/classes` },
        { iconName: "FiCalendar" as const, iconColor: "text-sky-600 dark:text-sky-400", label: t.timetable, href: `/${locale}/admin/calendar` },
        { iconName: "FiAward" as const, iconColor: "text-rose-600 dark:text-rose-400", label: t.events, href: `/${locale}/admin/events` },
      ],
    },
    {
      section: t.users,
      items: [
        { iconName: "FiUsers" as const, iconColor: "text-violet-600 dark:text-violet-400", label: t.users, href: `/${locale}/admin/users` },
        { iconName: "FiUserCheck" as const, iconColor: "text-teal-600 dark:text-teal-400", label: t.trainers, href: `/${locale}/admin/trainers` },
        {
          iconName: "FiMessageSquare" as const,
          iconColor: "text-amber-600 dark:text-amber-400",
          label: t.suggestedWorkshops,
          href: `/${locale}/admin/trainers/suggestions`,
          badgeCount: pendingSuggestedWorkshops,
        },
        { iconName: "FiCreditCard" as const, iconColor: "text-amber-600 dark:text-amber-400", label: t.payments, href: `/${locale}/admin/payments` },
        { iconName: "FiCreditCard" as const, iconColor: "text-green-600 dark:text-green-400", label: locale === "ar" ? "المحافظ" : "Wallets", href: `/${locale}/admin/wallets` },
      ],
    },
    {
      section: t.shop,
      items: [
        { iconName: "FiPackage" as const, iconColor: "text-blue-600 dark:text-blue-400", label: t.shopCategories, href: `/${locale}/admin/shop/categories` },
        { iconName: "FiShoppingBag" as const, iconColor: "text-purple-600 dark:text-purple-400", label: t.shopProducts, href: `/${locale}/admin/shop/products` },
        { iconName: "FiCreditCard" as const, iconColor: "text-green-600 dark:text-green-400", label: t.shopOrders, href: `/${locale}/admin/shop/orders` },
      ],
    },
    {
      section: t.content,
      items: [
        { iconName: "FiThumbsUp" as const, iconColor: "text-lime-600 dark:text-lime-400", label: t.recommendations, href: `/${locale}/admin/recommendations` },
        { iconName: "FiFileText" as const, iconColor: "text-cyan-600 dark:text-cyan-400", label: t.recipes, href: `/${locale}/admin/recipes` },
        { iconName: "FiFileText" as const, iconColor: "text-indigo-600 dark:text-indigo-400", label: t.pages, href: `/${locale}/admin/pages` },
        { iconName: "FiFileText" as const, iconColor: "text-amber-600 dark:text-amber-400", label: t.contactMessages, href: `/${locale}/admin/contact-messages` },
      ],
    },
    {
      section: t.settings,
      items: [
        { iconName: "FiSettings" as const, iconColor: "text-slate-600 dark:text-slate-300", label: t.settings, href: `/${locale}/admin/settings` },
        { iconName: "FiMessageSquare" as const, iconColor: "text-emerald-600 dark:text-emerald-400", label: t.whatsapp, href: `/${locale}/admin/whatsapp` },
        { iconName: "FiBell" as const, iconColor: "text-pink-600 dark:text-pink-400", label: t.notifications, href: `/${locale}/admin/notifications` },
      ],
    },
  ];

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950" lang={locale} dir={dir}>
      {/* Sidebar */}
      <aside className={`hidden w-64 flex-shrink-0 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:block ${locale === "ar" ? "border-l" : "border-r"}`}>
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800" dir={dir}>
                <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <span className="text-lg font-bold">N</span>
                </div>
                <div className={locale === "ar" ? "text-right" : "text-left"}>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.adminPanel}</h2>
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
                          const IconComponent = item.iconName === "FiGrid" ? FiGrid
                            : item.iconName === "FiTrendingUp" ? FiTrendingUp
                            : item.iconName === "FiBookOpen" ? FiBookOpen
                            : item.iconName === "FiCalendar" ? FiCalendar
                            : item.iconName === "FiAward" ? FiAward
                            : item.iconName === "FiUsers" ? FiUsers
                            : item.iconName === "FiUserCheck" ? FiUserCheck
                            : item.iconName === "FiCreditCard" ? FiCreditCard
                            : item.iconName === "FiThumbsUp" ? FiThumbsUp
                            : item.iconName === "FiShoppingBag" ? FiShoppingBag
                            : item.iconName === "FiFileText" ? FiFileText
                            : item.iconName === "FiSettings" ? FiSettings
                            : item.iconName === "FiMessageSquare" ? FiMessageSquare
                            : item.iconName === "FiPackage" ? FiPackage
                            : FiBell;
                          
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <span className={`flex size-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${item.iconColor}`}>
                                <IconComponent className="size-4" />
                              </span>
                              <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
                              {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--noon-coral)] px-1.5 text-[11px] font-bold leading-none text-white">
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

              {/* User Profile Menu */}
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
                  menuItems={menuItems}
                  user={{
                    fullName: user.fullName,
                    email: user.email,
                    profileImage: user.profileImage ?? undefined,
                  }}
                  locale={locale}
                  translations={{
                    adminPanel: t.adminPanel,
                    management: t.management,
                    logout: t.logout,
                    profile: t.profile,
                    accountSettings: t.accountSettings,
                  }}
                  onLogout={handleLogout}
                />
                <div className={locale === "ar" ? "text-right" : "text-left"}>
                  <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.dashboard}</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.welcomeBack}, {user.fullName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AdminWalletDisplay locale={locale} userId={user.id} />

                <LocaleSwitcher
                  currentLocale={locale}
                  labelEn={t.languageEn}
                  labelAr={t.languageAr}
                />

                <ThemeToggle
                  label={t.theme}
                  lightLabel={t.themeLight}
                  darkLabel={t.themeDark}
                  systemLabel={t.themeSystem}
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
