import Image from 'next/image';
import Link from 'next/link';
import { isLocale, type Locale } from '@/lib/locale';
import { countUsersByRole } from '@/lib/db/users';
import { countEventBookings } from '@/lib/db/events';
import { getShopOrdersAnalyticsSummary, listShopOrdersForAdmin } from '@/lib/db/shop';
import { getWalletTopupAnalyticsSummary } from '@/lib/db/wallet';
import AdminPieChartCard, { type AdminPieSlice } from '@/components/admin/AdminPieChartCard';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { getDashboardOverview } from '@/lib/db/dashboard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import {
  FiAlertCircle,
  FiArrowRight,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiInbox,
  FiPackage,
  FiPlus,
  FiPocket,
  FiSettings,
  FiShoppingBag,
  FiShoppingCart,
  FiUsers,
} from 'react-icons/fi';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isAr = locale === 'ar';

  const [roles, shopSummary, topupSummary, eventBookingsCount, recentOrdersPayload, overview] = await Promise.all([
    countUsersByRole(),
    getShopOrdersAnalyticsSummary(),
    getWalletTopupAnalyticsSummary(),
    countEventBookings(),
    listShopOrdersForAdmin({ page: 1, limit: 5 }),
    getDashboardOverview(),
  ]);

  const customersCount  = Number(roles.CUSTOMER ?? 0);
  const trainersCount   = Number(roles.TRAINER ?? 0);
  const adminsCount     = Number(roles.ADMIN ?? 0);
  const totalUsers      = customersCount + trainersCount + adminsCount;

  const formatMoney = (v: number) => formatAmountWithCurrency(v, 'OMR');

  const now = new Date();
  const dateLabel = now.toLocaleDateString(isAr ? 'ar-OM-u-nu-latn' : 'en-OM', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Muscat',
  });

  /* ── KPI cards ── */
  const money = (value: number) => ({ value, decimals: Number.isInteger(value) ? 0 : 3, suffix: isAr ? 'ريال' : 'OMR' });
  const count = (value: number) => ({ value, decimals: 0, suffix: '' });

  const kpis = [
    {
      label: isAr ? 'إيراد الورش هذا الشهر' : 'Class revenue this month',
      ...money(overview.classRevenueThisMonth),
      sub: `${overview.classBookingsThisMonth} ${isAr ? 'حجز مدفوع' : 'paid bookings'}`,
      Icon: FiBookOpen,
      tone: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
      href: `/${locale}/admin/classes`,
    },
    {
      label: isAr ? 'إيراد المتجر هذا الشهر' : 'Shop revenue this month',
      ...money(shopSummary.monthRevenue),
      sub: `${shopSummary.monthOrders} ${isAr ? 'طلب' : 'orders'} · ${formatMoney(shopSummary.grossRevenue)} ${isAr ? 'إجمالي' : 'all time'}`,
      Icon: FiShoppingBag,
      tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
      href: `/${locale}/admin/shop/orders`,
    },
    {
      label: isAr ? 'شحن المحافظ هذا الشهر' : 'Wallet top-ups this month',
      ...money(topupSummary.monthPaidAmount),
      sub: `${formatMoney(topupSummary.paidAmount)} ${isAr ? 'إجمالي' : 'all time'}`,
      Icon: FiCreditCard,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      href: `/${locale}/admin/payments?source=WALLET_TOPUP`,
    },
    {
      label: isAr ? 'ورش قادمة' : 'Upcoming classes',
      ...count(overview.upcomingClassesCount),
      sub: isAr ? 'منشورة ولم تبدأ بعد' : 'published and not started',
      Icon: FiCalendar,
      tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      href: `/${locale}/admin/calendar`,
    },
    {
      label: isAr ? 'المستخدمون' : 'Users',
      ...count(totalUsers),
      sub: `${customersCount} ${isAr ? 'عميل' : 'customers'} · ${trainersCount} ${isAr ? 'مدرب' : 'trainers'}`,
      Icon: FiUsers,
      tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      href: `/${locale}/admin/users`,
    },
    {
      label: isAr ? 'حجوزات الفعاليات' : 'Event bookings',
      ...count(eventBookingsCount),
      sub: `${overview.newEventRequests} ${isAr ? 'طلب جديد بانتظار الرد' : 'new requests waiting for a reply'}`,
      Icon: FiAward,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      href: `/${locale}/admin/events`,
    },
  ];

  /* ── Needs attention: only the items that actually have something waiting ── */
  const attention = [
    {
      count: overview.awaitingReviewBookings,
      label: isAr ? 'حجوزات مدفوعة بانتظار التأكيد' : 'Paid bookings awaiting confirmation',
      href: `/${locale}/admin/payments?source=CLASS_BOOKING`,
      Icon: FiAlertCircle,
      urgent: true,
    },
    {
      count: overview.newEventRequests,
      label: isAr ? 'طلبات فعاليات جديدة' : 'New event requests',
      href: `/${locale}/admin/events`,
      Icon: FiAward,
      urgent: false,
    },
    {
      count: overview.pendingWithdrawals,
      label: isAr ? 'طلبات سحب بانتظار المراجعة' : 'Withdrawal requests to review',
      href: `/${locale}/admin/wallets`,
      Icon: FiPocket,
      urgent: false,
    },
    {
      count: overview.pendingTopups,
      label: isAr ? 'عمليات شحن معلّقة' : 'Pending wallet top-ups',
      href: `/${locale}/admin/payments?source=WALLET_TOPUP`,
      Icon: FiCreditCard,
      urgent: false,
    },
    {
      count: overview.unreadMessages,
      label: isAr ? 'رسائل جديدة' : 'New contact messages',
      href: `/${locale}/admin/contact-messages`,
      Icon: FiInbox,
      urgent: false,
    },
  ].filter((item) => item.count > 0);

  /* ── Quick links ── */
  const quickLinks = [
    { label: isAr ? 'الورشات' : 'Classes', href: `/${locale}/admin/classes`, Icon: FiBookOpen },
    { label: isAr ? 'التقويم' : 'Calendar', href: `/${locale}/admin/calendar`, Icon: FiCalendar },
    { label: isAr ? 'الفعاليات' : 'Events', href: `/${locale}/admin/events`, Icon: FiAward },
    { label: isAr ? 'الطلبات' : 'Orders', href: `/${locale}/admin/shop/orders`, Icon: FiShoppingCart },
    { label: isAr ? 'المدفوعات' : 'Payments', href: `/${locale}/admin/payments`, Icon: FiCreditCard },
    { label: isAr ? 'المحافظ' : 'Wallets', href: `/${locale}/admin/wallets`, Icon: FiPocket },
    { label: isAr ? 'المخزون' : 'Inventory', href: `/${locale}/admin/finance/inventory`, Icon: FiPackage },
    { label: isAr ? 'الإعدادات' : 'Settings', href: `/${locale}/admin/settings`, Icon: FiSettings },
  ];

  const classDateFormatter = new Intl.DateTimeFormat(isAr ? 'ar-OM-u-nu-latn' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat',
  });

  /* ── Charts ── */
  const userSlices: AdminPieSlice[] = [
    { label: isAr ? 'العملاء' : 'Customers', value: customersCount, color: 'var(--noon-teal)' },
    { label: isAr ? 'المدربون' : 'Trainers',  value: trainersCount,  color: 'var(--noon-purple)' },
    { label: isAr ? 'الإداريون' : 'Admins',  value: adminsCount,    color: 'var(--noon-coral)' },
  ];

  const orderSlices: AdminPieSlice[] = [
    { label: isAr ? 'مدفوع' : 'Paid',               value: shopSummary.statusCounts.PAID,          color: 'var(--noon-teal)' },
    { label: isAr ? 'قيد التجهيز' : 'Processing',   value: shopSummary.statusCounts.PROCESSING,    color: 'var(--noon-yellow)' },
    { label: isAr ? 'جاهز للشحن' : 'Ready to Ship', value: shopSummary.statusCounts.READY_TO_SHIP, color: 'var(--noon-purple)' },
    { label: isAr ? 'تم الشحن' : 'Shipped',          value: shopSummary.statusCounts.SHIPPED,       color: 'var(--noon-teal-strong)' },
    { label: isAr ? 'تم التسليم' : 'Delivered',      value: shopSummary.statusCounts.DELIVERED,     color: 'var(--noon-purple-strong)' },
    { label: isAr ? 'ملغي' : 'Cancelled',            value: shopSummary.statusCounts.CANCELLED,     color: 'var(--noon-coral-strong)' },
  ];

  /* ── Recent orders ── */
  const recentOrders = recentOrdersPayload.orders;

  const statusMap: Record<string, { en: string; ar: string; cls: string; dot: string }> = {
    PAID:          { en: 'Paid',          ar: 'مدفوع',        cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300', dot: 'bg-emerald-500' },
    PROCESSING:    { en: 'Processing',    ar: 'قيد التجهيز', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',     dot: 'bg-amber-400' },
    READY_TO_SHIP: { en: 'Ready',         ar: 'جاهز',        cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',        dot: 'bg-blue-500' },
    SHIPPED:       { en: 'Shipped',       ar: 'تم الشحن',    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',            dot: 'bg-sky-500' },
    DELIVERED:     { en: 'Delivered',     ar: 'تم التسليم',  cls: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',    dot: 'bg-green-500' },
    CANCELLED:     { en: 'Cancelled',     ar: 'ملغي',        cls: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',        dot: 'bg-rose-500' },
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {isAr ? 'لوحة الإدارة' : 'Dashboard'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/shop/orders/new`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <FiPlus className="size-4" aria-hidden="true" />
            {isAr ? 'طلب جديد' : 'New order'}
          </Link>
          <Link
            href={`/${locale}/admin/classes/new`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
          >
            <FiPlus className="size-4" aria-hidden="true" />
            {isAr ? 'ورشة جديدة' : 'New class'}
          </Link>
        </div>
      </div>

      {/* ── Needs attention ── */}
      {attention.length > 0 ? (
        <section aria-label={isAr ? 'يحتاج إلى متابعة' : 'Needs attention'} className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {isAr ? 'يحتاج إلى متابعة' : 'Needs attention'}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {attention.map((item) => (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-sm transition hover:border-amber-400 dark:border-amber-900/50 dark:bg-zinc-900 dark:hover:border-amber-700"
                >
                  <item.Icon className={`size-4 shrink-0 ${item.urgent ? 'text-rose-600' : 'text-amber-600'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-medium leading-snug text-zinc-800 dark:text-zinc-200">{item.label}</span>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white ${item.urgent ? 'bg-rose-600' : 'bg-amber-600'}`}>
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{kpi.label}</p>
              <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${kpi.tone}`}>
                <kpi.Icon className="size-[18px]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold leading-none text-zinc-950 dark:text-white" dir="ltr">
              <AnimatedNumber value={kpi.value} decimalPlaces={kpi.decimals} />
              {kpi.suffix ? <span className="ms-1.5 text-base font-semibold text-zinc-500">{kpi.suffix}</span> : null}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{kpi.sub}</p>
          </Link>
        ))}
      </div>

      {/* ── Upcoming classes + quick links ── */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isAr ? 'الورش القادمة' : 'Upcoming classes'}
            </h2>
            <Link href={`/${locale}/admin/classes`} className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-strong)]">
              {isAr ? 'عرض الكل' : 'View all'}
              <FiArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>

          {overview.upcomingClasses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <FiCalendar className="size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isAr ? 'لا توجد ورش قادمة منشورة.' : 'No published classes are coming up.'}
              </p>
              <Link href={`/${locale}/admin/classes/new`} className="text-sm font-semibold text-[color:var(--noon-teal)] hover:underline">
                {isAr ? 'أضف ورشة' : 'Add a class'}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {overview.upcomingClasses.map((item) => {
                const fill = item.seatsTotal > 0 ? Math.min(100, Math.round((item.seatsBooked / item.seatsTotal) * 100)) : 0;
                const full = item.seatsTotal > 0 && item.seatsBooked >= item.seatsTotal;
                return (
                  <li key={item.id}>
                    <Link href={`/${locale}/admin/classes/${item.id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {(isAr ? item.titleAr : null) || item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {classDateFormatter.format(new Date(item.startDateTime))}
                        </p>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${full ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {full ? (isAr ? 'مكتملة' : 'Full') : `${fill}%`}
                          </span>
                          <span className="text-zinc-500" dir="ltr">{item.seatsBooked}/{item.seatsTotal}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-valuenow={fill} aria-valuemin={0} aria-valuemax={100}>
                          <div className={`h-full rounded-full ${full ? 'bg-rose-500' : 'bg-[color:var(--noon-teal)]'}`} style={{ width: `${fill}%` }} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {isAr ? 'روابط سريعة' : 'Quick links'}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:border-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-strong)] dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-[color:var(--noon-teal)] dark:hover:text-[color:var(--noon-teal)]"
              >
                <link.Icon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminPieChartCard title={isAr ? 'توزيع المستخدمين' : 'User Distribution'}  slices={userSlices}  locale={locale} />
        <AdminPieChartCard title={isAr ? 'توزيع حالات الطلبات' : 'Order Status Distribution'} slices={orderSlices} locale={locale} />
      </div>

      {/* ── Recent orders ── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {isAr ? 'أحدث طلبات المتجر' : 'Recent shop orders'}
          </h2>
          <Link
            href={`/${locale}/admin/shop/orders`}
            className="text-xs font-semibold text-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-strong)]"
          >
            {isAr ? 'عرض الكل' : 'View all'}
            <FiArrowRight className="ms-1 inline size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <FiShoppingCart className="size-8 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{isAr ? 'لا توجد طلبات حديثة.' : 'No recent orders yet.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 lg:hidden">
              {recentOrders.map((order) => {
                const st = statusMap[order.status] ?? statusMap.PAID;
                const productNames = order.items.map((i) => (isAr ? i.product_name_ar : i.product_name_en));
                const productsText = productNames.length <= 1 ? productNames[0] : `${productNames[0]} +${productNames.length - 1}`;
                return (
                  <Link
                    key={order.id}
                    href={`/${locale}/admin/shop/orders/${order.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {order.user_profile_image ? (
                        <Image src={order.user_profile_image} alt={order.user_full_name} fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                          {order.user_full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {order.user_full_name}
                        </p>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                          <span className={`size-1.5 rounded-full ${st.dot}`} />
                          {isAr ? st.ar : st.en}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">#{order.order_number} · {productsText}</p>
                      <p className="mt-0.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatMoney(order.subtotal)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    {[
                      isAr ? 'رقم الطلب' : 'Order #',
                      isAr ? 'العميل' : 'Customer',
                      isAr ? 'المنتجات' : 'Products',
                      isAr ? 'المبلغ' : 'Amount',
                      isAr ? 'الحالة' : 'Status',
                      isAr ? 'التاريخ' : 'Date',
                      '',
                    ].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const st = statusMap[order.status] ?? statusMap.PAID;
                    const productNames = order.items.map((i) => (isAr ? i.product_name_ar : i.product_name_en));
                    const productsText = productNames.length <= 2
                      ? productNames.join('، ')
                      : `${productNames.slice(0, 2).join('، ')} +${productNames.length - 2}`;
                    const dateStr = new Date(order.created_at).toLocaleDateString(
                      isAr ? 'ar-OM-u-nu-latn' : 'en-OM',
                      { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' }
                    );

                    return (
                      <tr key={order.id} className="border-b border-zinc-50 transition hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          #{order.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              {order.user_profile_image ? (
                                <Image src={order.user_profile_image} alt={order.user_full_name} fill sizes="32px" className="object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                  {order.user_full_name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{order.user_full_name}</span>
                          </div>
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400" title={productNames.join('، ')}>
                          <span className="block truncate">{productsText || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {formatMoney(order.subtotal)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>
                            <span className={`size-1.5 rounded-full ${st.dot}`} />
                            {isAr ? st.ar : st.en}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{dateStr}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/${locale}/admin/shop/orders/${order.id}`}
                            className="text-xs font-semibold text-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-strong)]"
                          >
                            {isAr ? 'فتح' : 'Open'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
