import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import ThemeToggle from "@/components/site/ThemeToggle";

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

  const user = getUserById(sessionId);
  if (!user || user.role !== "admin") {
    redirect(`/${locale}/account`);
  }

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
    dashboard: locale === "ar" ? "لوحة التحكم" : "Dashboard",
    analytics: locale === "ar" ? "التحليلات" : "Analytics",
    classesEvents: locale === "ar" ? "الدورات والفعاليات" : "Classes & Events",
    classes: locale === "ar" ? "الدورات" : "Classes",
    timetable: locale === "ar" ? "الجدول الزمني" : "Timetable",
    events: locale === "ar" ? "الفعاليات" : "Events",
    users: locale === "ar" ? "المستخدمون" : "Users",
    customers: locale === "ar" ? "العملاء" : "Customers",
    trainers: locale === "ar" ? "المدربون" : "Trainers",
    payments: locale === "ar" ? "المدفوعات" : "Payments",
    content: locale === "ar" ? "المحتوى" : "Content",
    recommendations: locale === "ar" ? "التوصيات" : "Recommendations",
    products: locale === "ar" ? "المنتجات" : "Products",
    recipes: locale === "ar" ? "الوصفات" : "Recipes",
    settings: locale === "ar" ? "الإعدادات" : "Settings",
    notifications: locale === "ar" ? "الإشعارات" : "Notifications",
    logout: locale === "ar" ? "تسجيل خروج" : "Logout",
    viewSite: locale === "ar" ? "عرض الموقع" : "View Site",
    welcomeBack: locale === "ar" ? "مرحباً بعودتك" : "Welcome back",
    theme: locale === "ar" ? "المظهر" : "Theme",
    themeLight: locale === "ar" ? "فاتح" : "Light",
    themeDark: locale === "ar" ? "داكن" : "Dark",
    themeSystem: locale === "ar" ? "حسب النظام" : "System",
  };

  const menuItems = [
    {
      section: t.overview,
      items: [
        { icon: "📊", label: t.dashboard, href: `/${locale}/admin` },
        { icon: "📈", label: t.analytics, href: `/${locale}/admin/analytics` },
      ],
    },
    {
      section: t.classesEvents,
      items: [
        { icon: "👨‍🍳", label: t.classes, href: `/${locale}/admin/classes` },
        { icon: "📅", label: t.timetable, href: `/${locale}/admin/timetable` },
        { icon: "🎉", label: t.events, href: `/${locale}/admin/events` },
      ],
    },
    {
      section: t.users,
      items: [
        { icon: "👥", label: t.customers, href: `/${locale}/admin/customers` },
        { icon: "👨‍🏫", label: t.trainers, href: `/${locale}/admin/trainers` },
        { icon: "💳", label: t.payments, href: `/${locale}/admin/payments` },
      ],
    },
    {
      section: t.content,
      items: [
        { icon: "⭐", label: t.recommendations, href: `/${locale}/admin/recommendations` },
        { icon: "🎁", label: t.products, href: `/${locale}/admin/products` },
        { icon: "📝", label: t.recipes, href: `/${locale}/admin/recipes` },
      ],
    },
    {
      section: t.settings,
      items: [
        { icon: "⚙️", label: t.settings, href: `/${locale}/admin/settings` },
        { icon: "🔔", label: t.notifications, href: `/${locale}/admin/notifications` },
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
              <div className={`flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <span className="text-lg font-bold">N</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.adminPanel}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.management}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                  {menuItems.map((section) => (
                    <div key={section.section}>
                      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {section.section}
                      </h3>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white ${locale === "ar" ? "flex-row-reverse" : ""}`}
                          >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>

              {/* User Profile & Logout */}
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                <div className={`flex items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                  <div className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                    {user.firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                  </div>
                </div>
                <form action={handleLogout} className="mt-2">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {t.logout}
                  </button>
                </form>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Top Bar */}
            <header className={`flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
              <div className={`flex items-center gap-4 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                <button className="lg:hidden">
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.dashboard}</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.welcomeBack}, {user.firstName}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-3 ${locale === "ar" ? "flex-row-reverse" : ""}`}>
                <ThemeToggle
                  label={t.theme}
                  lightLabel={t.themeLight}
                  darkLabel={t.themeDark}
                  systemLabel={t.themeSystem}
                />

                <button className="relative rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className={`absolute size-2 rounded-full bg-red-500 ${locale === "ar" ? "left-1.5 top-1.5" : "right-1.5 top-1.5"}`}></span>
                </button>

                <Link
                  href={`/${locale}`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.viewSite}
                </Link>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </main>
        </div>
    );
}
