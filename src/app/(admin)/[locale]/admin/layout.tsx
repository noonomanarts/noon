import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import LocaleSwitcher from "@/components/site/LocaleSwitcher";
import AdminProfileMenu from "@/components/admin/AdminProfileMenu";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import { AdminWalletDisplay } from "@/components/admin/AdminWalletDisplay";
import AdminSidebarNav, {
  type AdminSidebarMenuSection,
} from "@/components/admin/AdminSidebarNav";
import MobileSidebar from "@/components/admin/MobileSidebar";
import OverlayScrollArea from "@/components/site/OverlayScrollArea";
import { resolveHeaderBranding } from "@/lib/headerBranding";
import { countTrainerWorkshopSuggestionsPendingReview } from "@/lib/db/trainers";
import { countPendingClassRepeatRequestGroups } from '@/lib/db/classRepeatRequests';
import { countPendingWorkshopSuggestions } from '@/lib/db/workshopSuggestions';

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
  if (!user || (user.role !== "ADMIN" && user.role !== "SOCIAL_MEDIA_ADMIN")) {
    redirect(`/${locale}/account`);
  }

  const isSocialMediaAdmin = user.role === "SOCIAL_MEDIA_ADMIN";
  const pendingSuggestedWorkshops = isSocialMediaAdmin ? 0 : await countTrainerWorkshopSuggestionsPendingReview();
  const pendingRepeatRequestGroups = isSocialMediaAdmin ? 0 : await countPendingClassRepeatRequestGroups();
  const pendingWorkshopSuggestions = isSocialMediaAdmin ? 0 : await countPendingWorkshopSuggestions();
  const { headerLogoUrl } = await resolveHeaderBranding();

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("noon_session");
    const { redirect } = await import("next/navigation");
    redirect(`/${rawLocale}/login`);
  }

  const t = {
    adminPanel: locale === "ar" ? "لوحة الإدارة" : "Admin Panel",
    management: "",
    overview: locale === "ar" ? "عام" : "Overview",
    finance: locale === "ar" ? "المالية" : "Finance",
    dashboard: locale === "ar" ? "الرئيسية" : "Dashboard",
    analytics: locale === "ar" ? "التحليلات" : "Insights",
    financeReports: locale === "ar" ? "المالية" : "Finance",
    inventory: locale === "ar" ? "المخزون" : "Inventory",
    classesEvents: locale === "ar" ? "البرامج" : "Programs",
    classes: locale === "ar" ? "الورشات" : "Classes",
    repeatRequests: locale === "ar" ? "الإعادات" : "Repeats",
    workshopSuggestions: locale === "ar" ? "الاقتراحات" : "Suggestions",
    workshopDemand: locale === "ar" ? "إقبال الورش" : "Workshop Demand",
    timetable: locale === "ar" ? "التقويم" : "Calendar",
    events: locale === "ar" ? "الفعاليات" : "Events",
    companies: locale === "ar" ? "الشركات" : "Companies",
    users: locale === "ar" ? "الفريق" : "Team",
    customers: locale === "ar" ? "العملاء" : "Customers",
    trainers: locale === "ar" ? "المدربون" : "Trainers",
    suggestedWorkshops: locale === "ar" ? "المقترحات" : "Suggestions",
    payments: locale === "ar" ? "المدفوعات" : "Payments",
    content: locale === "ar" ? "المحتوى" : "Content",
    shop: locale === "ar" ? "المتجر" : "Shop",
    shopCategories: locale === "ar" ? "الفئات" : "Categories",
    shopProducts: locale === "ar" ? "المنتجات" : "Products",
    shopDiscoverMore: locale === "ar" ? "الروابط" : "Links",
    shopOrders: locale === "ar" ? "الطلبات" : "Orders",
    promoCodes: locale === "ar" ? "الخصومات" : "Codes",
    recommendations: locale === "ar" ? "الترشيحات" : "Picks",
    recipes: locale === "ar" ? "الوصفات" : "Recipes",
    pages: locale === "ar" ? "الصفحات" : "Pages",
    contactMessages: locale === "ar" ? "الرسائل" : "Messages",
    joinUsApplications: locale === "ar" ? "الطلبات" : "Applications",
    settings: locale === "ar" ? "النظام" : "System",
    paymentAlerts: locale === "ar" ? "التنبيهات" : "Alerts",
    notifications: locale === "ar" ? "الإشعارات" : "Notices",
    whatsapp: locale === "ar" ? "واتساب" : "WhatsApp",
    whatsappSessions: locale === "ar" ? "الجلسات" : "Sessions",
    whatsappTemplates: locale === "ar" ? "القوالب" : "Templates",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    photographerTasks: locale === "ar" ? "المصور" : "Media Tasks",
    logout: locale === "ar" ? "تسجيل خروج" : "Logout",
    profile: locale === "ar" ? "الملف الشخصي" : "Profile",
    accountSettings: locale === "ar" ? "إعدادات الحساب" : "Account Settings",
    viewSite: locale === "ar" ? "عرض الموقع" : "View Site",
    welcomeBack: locale === "ar" ? "مرحباً بعودتك" : "Welcome back",
    languageEn: "English",
    languageAr: "العربية",
  };

  const menuItems: AdminSidebarMenuSection[] = isSocialMediaAdmin
    ? [
        {
          section: t.classesEvents,
          items: [
            { iconName: "FiCalendar" as const, iconColor: "text-sky-600 dark:text-sky-400", label: t.timetable, href: `/${locale}/admin/calendar` },
            { iconName: "FiUsers" as const, iconColor: "text-emerald-600 dark:text-emerald-400", label: t.workshopDemand, href: `/${locale}/admin/marketing-classes` },
          ],
        },
      ]
    : [
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
            {
              iconName: "FiRefreshCw" as const,
              iconColor: "text-amber-600 dark:text-amber-400",
              label: t.repeatRequests,
              href: `/${locale}/admin/classes/repeat-requests`,
              badgeCount: pendingRepeatRequestGroups,
            },
            {
              iconName: "FiMessageSquare" as const,
              iconColor: "text-indigo-600 dark:text-indigo-400",
              label: t.workshopSuggestions,
              href: `/${locale}/admin/classes/suggestions`,
              badgeCount: pendingWorkshopSuggestions,
            },
            { iconName: "FiCalendar" as const, iconColor: "text-sky-600 dark:text-sky-400", label: t.timetable, href: `/${locale}/admin/calendar` },
            { iconName: "FiAward" as const, iconColor: "text-rose-600 dark:text-rose-400", label: t.events, href: `/${locale}/admin/events` },
            { iconName: "FiBriefcase" as const, iconColor: "text-violet-600 dark:text-violet-400", label: t.companies, href: `/${locale}/admin/companies` },
            { iconName: "FiTag" as const, iconColor: "text-fuchsia-600 dark:text-fuchsia-400", label: locale === "ar" ? "الهدايا" : "Add-ons", href: `/${locale}/admin/events/gift-addons` },
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
            { iconName: "FiFileText" as const, iconColor: "text-violet-600 dark:text-violet-400", label: t.photographerTasks, href: `/${locale}/admin/photographer-tasks` },
          ],
        },
        {
          section: t.shop,
          items: [
            { iconName: "FiPackage" as const, iconColor: "text-blue-600 dark:text-blue-400", label: t.shopCategories, href: `/${locale}/admin/shop/categories` },
            { iconName: "FiShoppingBag" as const, iconColor: "text-purple-600 dark:text-purple-400", label: t.shopProducts, href: `/${locale}/admin/shop/products` },
            { iconName: "FiFileText" as const, iconColor: "text-cyan-600 dark:text-cyan-400", label: t.shopDiscoverMore, href: `/${locale}/admin/shop/discover-more` },
            { iconName: "FiCreditCard" as const, iconColor: "text-green-600 dark:text-green-400", label: t.shopOrders, href: `/${locale}/admin/shop/orders` },
            { iconName: "FiTag" as const, iconColor: "text-amber-600 dark:text-amber-400", label: t.promoCodes, href: `/${locale}/admin/promo-codes` },
          ],
        },
        {
          section: t.content,
          items: [
            { iconName: "FiThumbsUp" as const, iconColor: "text-lime-600 dark:text-lime-400", label: t.recommendations, href: `/${locale}/admin/recommendations` },
            { iconName: "FiFileText" as const, iconColor: "text-cyan-600 dark:text-cyan-400", label: t.recipes, href: `/${locale}/admin/recipes` },
            { iconName: "FiFileText" as const, iconColor: "text-indigo-600 dark:text-indigo-400", label: t.pages, href: `/${locale}/admin/pages` },
            { iconName: "FiFileText" as const, iconColor: "text-amber-600 dark:text-amber-400", label: t.contactMessages, href: `/${locale}/admin/contact-messages` },
            { iconName: "FiFileText" as const, iconColor: "text-teal-600 dark:text-teal-400", label: t.joinUsApplications, href: `/${locale}/admin/join-us-applications` },
          ],
        },
        {
          section: t.settings,
          items: [
            { iconName: "FiSettings" as const, iconColor: "text-slate-600 dark:text-slate-300", label: t.settings, href: `/${locale}/admin/settings` },
            { iconName: "FiCreditCard" as const, iconColor: "text-cyan-600 dark:text-cyan-400", label: t.paymentAlerts, href: `/${locale}/admin/payment-alerts` },
            { iconName: "FiMessageSquare" as const, iconColor: "text-emerald-600 dark:text-emerald-400", label: t.whatsapp, href: `/${locale}/admin/whatsapp` },
            { iconName: "FiMessageSquare" as const, iconColor: "text-teal-600 dark:text-teal-400", label: t.whatsappSessions, href: `/${locale}/admin/whatsapp/sessions` },
            { iconName: "FiMessageSquare" as const, iconColor: "text-violet-600 dark:text-violet-400", label: t.whatsappTemplates, href: `/${locale}/admin/whatsapp/templates` },
            { iconName: "FiMail" as const, iconColor: "text-blue-600 dark:text-blue-400", label: t.email, href: `/${locale}/admin/email` },
            { iconName: "FiBell" as const, iconColor: "text-pink-600 dark:text-pink-400", label: t.notifications, href: `/${locale}/admin/notifications` },
          ],
        },
      ];

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="admin-panel flex min-h-dvh overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100" lang={locale} dir={dir}>
      {/* Sidebar */}
      <div className="hidden w-56 shrink-0 lg:block xl:w-60" aria-hidden="true" />
      <aside
        className={`fixed inset-y-0 z-20 hidden w-56 overflow-hidden border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,248,242,0.98),rgba(255,255,255,0.94))] shadow-[0_0_0_1px_rgba(228,228,231,0.7),0_24px_60px_-36px_rgba(24,24,27,0.45)] backdrop-blur dark:border-zinc-800/80 dark:bg-[linear-gradient(180deg,rgba(23,23,34,0.98),rgba(10,10,15,0.96))] dark:shadow-[0_0_0_1px_rgba(39,39,42,0.85),0_24px_60px_-36px_rgba(0,0,0,0.7)] lg:block xl:w-60 ${locale === "ar" ? "right-0 border-l" : "left-0 border-r"}`}
      >
            <div className="flex h-full min-h-0 flex-col">
              {/* Logo */}
              <div className="border-b border-zinc-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950" dir={dir}>
                <div className="flex items-center gap-3">
                  <Link href={`/${locale}`} className="shrink-0" aria-label="Noon">
                    <Image
                      src={headerLogoUrl}
                      alt="Noon"
                      width={56}
                      height={56}
                      priority
                      className="h-11 w-auto"
                    />
                  </Link>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{t.adminPanel}</h2>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <OverlayScrollArea className="min-h-0 flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
                <nav className="px-3 py-4" dir={dir}>
                  <AdminSidebarNav menuItems={menuItems} />
                </nav>
              </OverlayScrollArea>

              {/* User Profile Menu */}
              <div className="border-t border-zinc-200/80 bg-white/50 px-3 pb-3 pt-2.5 dark:border-zinc-800/80 dark:bg-white/[0.03]">
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
            <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/90" dir={dir}>
              <div className="flex h-14 items-center justify-between gap-2 px-3 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:gap-3 sm:px-4 lg:px-6">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
                      logoUrl: headerLogoUrl,
                    }}
                    onLogoutAction={handleLogout}
                  />
                </div>

                <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2 lg:gap-3">
                  <div className="hidden min-w-0 max-w-[8.5rem] sm:block sm:max-w-[9.75rem] md:max-w-none">
                    <AdminWalletDisplay locale={locale} userId={user.id} />
                  </div>

                  <LocaleSwitcher
                    currentLocale={locale}
                    labelEn={t.languageEn}
                    labelAr={t.languageAr}
                  />

                  <AdminNotificationCenter locale={locale} />

                  <Link
                    href={`/${locale}`}
                    className="hidden shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:inline-flex sm:text-sm"
                  >
                    {t.viewSite}
                  </Link>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <OverlayScrollArea className="flex-1" options={{ overflow: { x: "hidden", y: "scroll" } }}>
              <div className="admin-content-shell mx-auto w-full max-w-[1680px] p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] xl:p-6">
                {children}
              </div>
            </OverlayScrollArea>
          </main>
        </div>
    );
}
