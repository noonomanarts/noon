import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FiActivity, FiCreditCard, FiPackage, FiShoppingBag, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { isLocale, type Locale } from '@/lib/locale';
import { getUserById, countUsersByRole } from '@/lib/db/users';
import { countEventBookings } from '@/lib/db/events';
import { getShopOrdersAnalyticsSummary, listShopOrdersForAdmin } from '@/lib/db/shop';
import { getWalletTopupAnalyticsSummary } from '@/lib/db/wallet';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  const [roles, shopSummary, topupSummary, eventBookingsCount, recentOrdersPayload] = await Promise.all([
    countUsersByRole(),
    getShopOrdersAnalyticsSummary(),
    getWalletTopupAnalyticsSummary(),
    countEventBookings(),
    listShopOrdersForAdmin({ page: 1, limit: 8 }),
  ]);

  const customersCount = Number(roles.CUSTOMER ?? 0);
  const trainersCount = Number(roles.TRAINER ?? 0);
  const adminsCount = Number(roles.ADMIN ?? 0);

  const recentOrders = recentOrdersPayload.orders;
  const totalOrders = Math.max(1, shopSummary.totalOrders);
  const shippedOrDelivered = shopSummary.statusCounts.SHIPPED + shopSummary.statusCounts.DELIVERED;
  const fulfillmentRate = (shippedOrDelivered / totalOrders) * 100;
  const cancellationRate = (shopSummary.statusCounts.CANCELLED / totalOrders) * 100;

  const t = {
    title: locale === 'ar' ? 'تحليلات الإدارة' : 'Admin Analytics',
    subtitle:
      locale === 'ar'
        ? 'لوحة تحليل شاملة لأداء المتجر والمدفوعات والمستخدمين.'
        : 'Comprehensive performance view for shop operations, payments, and users.',
    refreshed: locale === 'ar' ? 'آخر تحديث' : 'Last updated',
    users: locale === 'ar' ? 'المستخدمون' : 'Users',
    customers: locale === 'ar' ? 'العملاء' : 'Customers',
    trainers: locale === 'ar' ? 'المدربون' : 'Trainers',
    admins: locale === 'ar' ? 'الإداريون' : 'Admins',
    shopOrders: locale === 'ar' ? 'طلبات المتجر' : 'Shop Orders',
    totalOrders: locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
    monthOrders: locale === 'ar' ? 'طلبات هذا الشهر' : 'This Month Orders',
    revenue: locale === 'ar' ? 'الإيرادات' : 'Revenue',
    productsRevenue: locale === 'ar' ? 'إيراد المنتجات' : 'Products Revenue',
    shippingRevenue: locale === 'ar' ? 'إيراد الشحن' : 'Shipping Revenue',
    grossRevenue: locale === 'ar' ? 'الإيراد الإجمالي' : 'Gross Revenue',
    monthRevenue: locale === 'ar' ? 'إيراد هذا الشهر' : 'This Month Revenue',
    topups: locale === 'ar' ? 'شحن المحافظ' : 'Wallet Topups',
    paidTopups: locale === 'ar' ? 'شحنات ناجحة' : 'Successful Topups',
    pendingTopups: locale === 'ar' ? 'شحنات معلّقة' : 'Pending Topups',
    failedTopups: locale === 'ar' ? 'شحنات فاشلة' : 'Failed Topups',
    paidAmount: locale === 'ar' ? 'قيمة الشحن الناجح' : 'Paid Topup Amount',
    monthPaidAmount: locale === 'ar' ? 'شحن ناجح هذا الشهر' : 'Paid This Month',
    operationsHealth: locale === 'ar' ? 'مؤشرات تشغيلية' : 'Operational Health',
    fulfillmentRate: locale === 'ar' ? 'معدل الإنجاز' : 'Fulfillment Rate',
    cancellationRate: locale === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate',
    eventBookings: locale === 'ar' ? 'حجوزات الفعاليات' : 'Event Bookings',
    statusDistribution: locale === 'ar' ? 'توزيع حالات الطلبات' : 'Order Status Distribution',
    recentOrders: locale === 'ar' ? 'أحدث طلبات المتجر' : 'Recent Shop Orders',
    orderNumber: locale === 'ar' ? 'رقم الطلب' : 'Order #',
    customer: locale === 'ar' ? 'العميل' : 'Customer',
    products: locale === 'ar' ? 'المنتجات' : 'Products',
    subtotal: locale === 'ar' ? 'قيمة المنتجات' : 'Products Total',
    status: locale === 'ar' ? 'الحالة' : 'Status',
    createdAt: locale === 'ar' ? 'تاريخ الإنشاء' : 'Created at',
    details: locale === 'ar' ? 'التفاصيل' : 'Details',
    openOrder: locale === 'ar' ? 'فتح الطلب' : 'Open order',
    noOrders: locale === 'ar' ? 'لا توجد طلبات حديثة حالياً.' : 'No recent shop orders yet.',
  };

  const statusLabel: Record<keyof typeof shopSummary.statusCounts, { en: string; ar: string; color: string }> = {
    PAID: { en: 'Paid', ar: 'مدفوع', color: 'bg-emerald-500' },
    PROCESSING: { en: 'Processing', ar: 'قيد التجهيز', color: 'bg-amber-500' },
    READY_TO_SHIP: { en: 'Ready to Ship', ar: 'جاهز للشحن', color: 'bg-blue-500' },
    SHIPPED: { en: 'Shipped', ar: 'تم الشحن', color: 'bg-sky-500' },
    DELIVERED: { en: 'Delivered', ar: 'تم التسليم', color: 'bg-green-500' },
    CANCELLED: { en: 'Cancelled', ar: 'ملغي', color: 'bg-rose-500' },
  };

  const formatMoney = (value: number) => formatAmountWithCurrency(value, 'OMR');

  const getProductsSummary = (names: string[]) => {
    if (names.length === 0) return '—';
    if (names.length <= 2) return names.join('، ');
    return `${names.slice(0, 2).join('، ')} +${names.length - 2}`;
  };

  const kpiCards = [
    {
      label: t.customers,
      value: String(customersCount),
      helper: `${t.trainers}: ${trainersCount} • ${t.admins}: ${adminsCount}`,
      icon: <FiUsers className="size-5" />,
      iconClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    {
      label: t.totalOrders,
      value: String(shopSummary.totalOrders),
      helper: `${t.monthOrders}: ${shopSummary.monthOrders}`,
      icon: <FiShoppingBag className="size-5" />,
      iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      label: t.grossRevenue,
      value: formatMoney(shopSummary.grossRevenue),
      helper: `${t.monthRevenue}: ${formatMoney(shopSummary.monthRevenue)}`,
      icon: <FiTrendingUp className="size-5" />,
      iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
    {
      label: t.paidAmount,
      value: formatMoney(topupSummary.paidAmount),
      helper: `${t.monthPaidAmount}: ${formatMoney(topupSummary.monthPaidAmount)}`,
      icon: <FiCreditCard className="size-5" />,
      iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    },
    {
      label: t.fulfillmentRate,
      value: `${fulfillmentRate.toFixed(1)}%`,
      helper: `${t.cancellationRate}: ${cancellationRate.toFixed(1)}%`,
      icon: <FiActivity className="size-5" />,
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    {
      label: t.eventBookings,
      value: String(eventBookingsCount),
      helper: t.operationsHealth,
      icon: <FiPackage className="size-5" />,
      iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{card.helper}</p>
              </div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}>{card.icon}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.statusDistribution}</h2>
          <div className="mt-4 space-y-3">
            {(Object.keys(shopSummary.statusCounts) as Array<keyof typeof shopSummary.statusCounts>).map((key) => {
              const count = shopSummary.statusCounts[key];
              const percentage = shopSummary.totalOrders > 0 ? (count / shopSummary.totalOrders) * 100 : 0;
              const meta = statusLabel[key];

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{meta[locale]}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className={`h-full ${meta.color}`} style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.topups}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.paidTopups}</p>
              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{topupSummary.paidPayments}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.pendingTopups}</p>
              <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{topupSummary.pendingPayments}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.failedTopups}</p>
              <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">{topupSummary.failedPayments}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.totalOrders}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{topupSummary.totalPayments}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.paidAmount}</p>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{formatMoney(topupSummary.paidAmount)}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t.monthPaidAmount}: {formatMoney(topupSummary.monthPaidAmount)}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.recentOrders}</h2>
          <Link href={`/${locale}/admin/shop/orders`} className="text-sm font-medium text-[color:var(--noon-teal)] hover:opacity-90">
            {t.details}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noOrders}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.orderNumber}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.customer}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.products}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.subtotal}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.createdAt}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {recentOrders.map((order) => {
                  const names = order.items.map((item) => (locale === 'ar' ? item.product_name_ar : item.product_name_en));
                  const statusMeta = statusLabel[order.status];

                  return (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white">#{order.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="relative h-7 w-7 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                            {order.user_profile_image ? (
                              <Image src={order.user_profile_image} alt={order.user_full_name} fill sizes="28px" className="object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">
                                {order.user_full_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{order.user_full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300" title={names.join('، ')}>{getProductsSummary(names)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white">{formatMoney(order.subtotal)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                          {statusMeta[locale]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/${locale}/admin/shop/orders/${order.id}`} className="text-sm font-medium text-[color:var(--noon-teal)] hover:opacity-90">
                          {t.openOrder}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.productsRevenue}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(shopSummary.productsRevenue)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.shippingRevenue}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(shopSummary.shippingRevenue)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.monthRevenue}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(shopSummary.monthRevenue)}</p>
        </article>
      </section>
    </div>
  );
}
