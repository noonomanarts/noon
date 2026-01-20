import { isLocale, type Locale } from "@/lib/locale";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const t = {
    totalStudents: locale === "ar" ? "إجمالي الطلاب" : "Total Students",
    activeClasses: locale === "ar" ? "الدورات النشطة" : "Active Classes",
    revenueMonth: locale === "ar" ? "الإيرادات (هذا الشهر)" : "Revenue (This Month)",
    upcomingEvents: locale === "ar" ? "الفعاليات القادمة" : "Upcoming Events",
    recentBookings: locale === "ar" ? "الحجوزات الأخيرة" : "Recent Bookings",
    upcomingClasses: locale === "ar" ? "الدورات القادمة" : "Upcoming Classes",
    quickActions: locale === "ar" ? "إجراءات سريعة" : "Quick Actions",
    viewAll: locale === "ar" ? "عرض الكل" : "View All",
    confirmed: locale === "ar" ? "مؤكد" : "confirmed",
    pending: locale === "ar" ? "قيد الانتظار" : "pending",
    trainer: locale === "ar" ? "المدرب" : "Trainer",
    addClass: locale === "ar" ? "إضافة دورة" : "Add Class",
    createNewClass: locale === "ar" ? "إنشاء دورة جديدة" : "Create new class",
    addCustomer: locale === "ar" ? "إضافة عميل" : "Add Customer",
    registerNewCustomer: locale === "ar" ? "تسجيل عميل جديد" : "Register new customer",
    scheduleEvent: locale === "ar" ? "جدولة فعالية" : "Schedule Event",
    createNewEvent: locale === "ar" ? "إنشاء فعالية جديدة" : "Create new event",
    viewReports: locale === "ar" ? "عرض التقارير" : "View Reports",
    analyticsInsights: locale === "ar" ? "التحليلات والإحصاءات" : "Analytics & insights",
  };

  const stats = [
    {
      label: t.totalStudents,
      value: "4,532",
      change: "+12.5%",
      trend: "up",
      icon: "👥",
    },
    {
      label: t.activeClasses,
      value: "24",
      change: "+3",
      trend: "up",
      icon: "📚",
    },
    {
      label: t.revenueMonth,
      value: locale === "ar" ? "٤٥,٢٨٠ ر.س" : "SAR 45,280",
      change: "+8.2%",
      trend: "up",
      icon: "💰",
    },
    {
      label: t.upcomingEvents,
      value: "12",
      change: "0",
      trend: "neutral",
      icon: "📅",
    },
  ];

  const recentBookings = [
    { id: 1, customer: "Sarah Ahmed", class: "Italian Cooking", date: "Jan 22, 2026", status: "confirmed" },
    { id: 2, customer: "Mohammed Ali", class: "Arts & Crafts", date: "Jan 23, 2026", status: "pending" },
    { id: 3, customer: "Fatima Hassan", class: "Baking Workshop", date: "Jan 24, 2026", status: "confirmed" },
    { id: 4, customer: "Ahmed Ibrahim", class: "Cooking Competition", date: "Jan 25, 2026", status: "confirmed" },
    { id: 5, customer: "Layla Omar", class: "Mom & Kid", date: "Jan 26, 2026", status: "pending" },
  ];

  const upcomingClasses = [
    { id: 1, title: "Italian Pasta Making", date: "Jan 22, 2026", time: "10:00 AM", seats: "8/12", trainer: "Chef Marco" },
    { id: 2, title: "Watercolor Painting", date: "Jan 23, 2026", time: "2:00 PM", seats: "15/16", trainer: "Noor Ali" },
    { id: 3, title: "French Pastries", date: "Jan 24, 2026", time: "11:00 AM", seats: "6/10", trainer: "Chef Marie" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                <p
                  className={`mt-2 text-sm font-medium ${
                    stat.trend === "up"
                      ? "text-green-600 dark:text-green-400"
                      : stat.trend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-2xl dark:bg-zinc-800">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.recentBookings}</h2>
            <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white">
                    {booking.customer.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{booking.customer}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{booking.class}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{booking.date}</p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      booking.status === "confirmed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {booking.status === "confirmed" ? t.confirmed : t.pending}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.upcomingClasses}</h2>
            <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              {t.viewAll}
            </button>
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((classItem) => (
              <div
                key={classItem.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-white">{classItem.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {classItem.date} at {classItem.time}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {t.trainer}: {classItem.trainer}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white">
                      {classItem.seats}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.quickActions}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-xl dark:bg-blue-900/30">
              ➕
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{t.addClass}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.createNewClass}</p>
            </div>
          </button>

          <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100 text-xl dark:bg-green-900/30">
              👤
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{t.addCustomer}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.registerNewCustomer}</p>
            </div>
          </button>

          <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-xl dark:bg-purple-900/30">
              📅
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{t.scheduleEvent}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.createNewEvent}</p>
            </div>
          </button>

          <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-xl dark:bg-orange-900/30">
              📊
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{t.viewReports}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.analyticsInsights}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
