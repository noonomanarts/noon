import Image from 'next/image';
import Link from 'next/link';
import { isLocale, type Locale } from '@/lib/locale';
import { countUsersByRole } from '@/lib/db/users';
import { countEventBookings } from '@/lib/db/events';
import { getShopOrdersAnalyticsSummary, listShopOrdersForAdmin } from '@/lib/db/shop';
import { getWalletTopupAnalyticsSummary } from '@/lib/db/wallet';
import AdminPieChartCard, { type AdminPieSlice } from '@/components/admin/AdminPieChartCard';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isAr = locale === 'ar';

  const [roles, shopSummary, topupSummary, eventBookingsCount, recentOrdersPayload] = await Promise.all([
    countUsersByRole(),
    getShopOrdersAnalyticsSummary(),
    getWalletTopupAnalyticsSummary(),
    countEventBookings(),
    listShopOrdersForAdmin({ page: 1, limit: 5 }),
  ]);

  const customersCount  = Number(roles.CUSTOMER ?? 0);
  const trainersCount   = Number(roles.TRAINER ?? 0);
  const adminsCount     = Number(roles.ADMIN ?? 0);
  const totalUsers      = customersCount + trainersCount + adminsCount;

  const totalOrders     = Math.max(1, shopSummary.totalOrders);
  const deliveredOrShipped = shopSummary.statusCounts.DELIVERED + shopSummary.statusCounts.SHIPPED;
  const fulfillmentRate = (deliveredOrShipped / totalOrders) * 100;

  const formatMoney = (v: number) => formatAmountWithCurrency(v, 'OMR');

  const now = new Date();
  const dateLabel = now.toLocaleDateString(isAr ? 'ar-OM-u-nu-latn' : 'en-OM', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Muscat',
  });

  /* ── KPI cards ── */
  const kpis = [
    {
      label: isAr ? 'إيراد المتجر' : 'Shop Revenue',
      value: formatMoney(shopSummary.grossRevenue),
      sub: `${formatMoney(shopSummary.monthRevenue)} ${isAr ? 'هذا الشهر' : 'this month'}`,
      icon: '💰',
      accent: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-100 dark:border-teal-900/40',
    },
    {
      label: isAr ? 'طلبات المتجر' : 'Shop Orders',
      value: shopSummary.totalOrders.toLocaleString(),
      sub: `${shopSummary.monthOrders} ${isAr ? 'هذا الشهر' : 'this month'}`,
      icon: '🛍️',
      accent: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-100 dark:border-purple-900/40',
    },
    {
      label: isAr ? 'شحن المحافظ' : 'Wallet Topups',
      value: formatMoney(topupSummary.paidAmount),
      sub: `${formatMoney(topupSummary.monthPaidAmount)} ${isAr ? 'هذا الشهر' : 'this month'}`,
      icon: '👛',
      accent: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/40',
    },
    {
      label: isAr ? 'المستخدمون' : 'Total Users',
      value: totalUsers.toLocaleString(),
      sub: `${customersCount} ${isAr ? 'عميل' : 'customers'} · ${trainersCount} ${isAr ? 'مدرب' : 'trainers'}`,
      icon: '👥',
      accent: 'from-rose-500 to-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-100 dark:border-rose-900/40',
    },
    {
      label: isAr ? 'معدل الإنجاز' : 'Fulfillment Rate',
      value: `${fulfillmentRate.toFixed(1)}%`,
      sub: `${deliveredOrShipped} ${isAr ? 'شحنة أو تسليم' : 'shipped or delivered'}`,
      icon: '✅',
      accent: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    {
      label: isAr ? 'حجوزات الفعاليات' : 'Event Bookings',
      value: eventBookingsCount.toLocaleString(),
      sub: isAr ? 'إجمالي الحجوزات' : 'total bookings',
      icon: '🎟️',
      accent: 'from-sky-500 to-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      border: 'border-sky-100 dark:border-sky-900/40',
    },
  ];

  /* ── Quick links ── */
  const quickLinks = [
    { label: isAr ? 'الورشات' : 'Classes',    href: `/${locale}/admin/classes`,          emoji: '📚' },
    { label: isAr ? 'التقويم' : 'Calendar',  href: `/${locale}/admin/calendar`,         emoji: '📅' },
    { label: isAr ? 'المستخدمون' : 'Users',  href: `/${locale}/admin/users`,            emoji: '👤' },
    { label: isAr ? 'الطلبات' : 'Orders',    href: `/${locale}/admin/shop/orders`,      emoji: '📦' },
    { label: isAr ? 'الفعاليات' : 'Events',  href: `/${locale}/admin/events`,           emoji: '🎉' },
    { label: isAr ? 'المحافظ' : 'Wallets',   href: `/${locale}/admin/wallets`,          emoji: '💳' },
    { label: isAr ? 'المخزون' : 'Inventory', href: `/${locale}/admin/finance/inventory`, emoji: '📦' },
    { label: isAr ? 'الإعدادات' : 'Settings',href: `/${locale}/admin/settings`,         emoji: '⚙️' },
  ];

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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {isAr ? 'لوحة الإدارة' : 'Admin Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
        </div>
        <Link
          href={`/${locale}/admin/classes/new`}
          className="mt-3 inline-flex h-9 items-center gap-2 self-start rounded-lg bg-[color:var(--noon-teal)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] sm:mt-0 sm:self-auto"
        >
          <span>+</span>
          {isAr ? 'ورشة جديدة' : 'New Class'}
        </Link>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border p-3 shadow-sm ${kpi.bg} ${kpi.border}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 leading-tight">
                {kpi.label}
              </p>
              <span className="text-base leading-none">{kpi.icon}</span>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100 leading-tight sm:text-xl">
              {kpi.value}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick links ── */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
          {isAr ? 'روابط سريعة' : 'Quick links'}
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-3 text-center transition hover:border-[color:var(--noon-teal)] hover:bg-[color:var(--noon-teal-soft)] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[color:var(--noon-teal)] dark:hover:bg-[color:var(--noon-teal)]/10"
            >
              <span className="text-xl leading-none">{link.emoji}</span>
              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 leading-tight">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <AdminPieChartCard title={isAr ? 'توزيع المستخدمين' : 'User Distribution'}  slices={userSlices}  locale={locale} />
        <AdminPieChartCard title={isAr ? 'توزيع حالات الطلبات' : 'Order Status Distribution'} slices={orderSlices} locale={locale} />
      </div>

      {/* ── Recent orders ── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {isAr ? 'أحدث الطلبات' : 'Recent Orders'}
          </h2>
          <Link
            href={`/${locale}/admin/shop/orders`}
            className="text-xs font-semibold text-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-strong)]"
          >
            {isAr ? 'عرض الكل' : 'View all'} →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">{isAr ? 'لا توجد طلبات حديثة.' : 'No recent orders yet.'}</p>
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
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
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
                            {isAr ? 'فتح' : 'Open'} →
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
