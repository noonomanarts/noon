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

  const [roles, shopSummary, topupSummary, eventBookingsCount, recentOrdersPayload] = await Promise.all([
    countUsersByRole(),
    getShopOrdersAnalyticsSummary(),
    getWalletTopupAnalyticsSummary(),
    countEventBookings(),
    listShopOrdersForAdmin({ page: 1, limit: 6 }),
  ]);

  const customersCount = Number(roles.CUSTOMER ?? 0);
  const trainersCount = Number(roles.TRAINER ?? 0);
  const adminsCount = Number(roles.ADMIN ?? 0);

  const totalOrders = Math.max(1, shopSummary.totalOrders);
  const deliveredOrShipped = shopSummary.statusCounts.DELIVERED + shopSummary.statusCounts.SHIPPED;
  const fulfillmentRate = (deliveredOrShipped / totalOrders) * 100;
  const cancellationRate = (shopSummary.statusCounts.CANCELLED / totalOrders) * 100;

  const t = {
    title: locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard',
    subtitle:
      locale === 'ar'
        ? 'نظرة تشغيلية فورية مع بيانات فعلية من النظام.'
        : 'Real-time operational overview powered by live system data.',
    users: locale === 'ar' ? 'المستخدمون' : 'Users',
    customers: locale === 'ar' ? 'العملاء' : 'Customers',
    trainers: locale === 'ar' ? 'المدربون' : 'Trainers',
    admins: locale === 'ar' ? 'الإداريون' : 'Admins',
    orders: locale === 'ar' ? 'طلبات المتجر' : 'Shop Orders',
    totalOrders: locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
    monthOrders: locale === 'ar' ? 'طلبات هذا الشهر' : 'Orders This Month',
    grossRevenue: locale === 'ar' ? 'الإيراد الإجمالي' : 'Gross Revenue',
    monthRevenue: locale === 'ar' ? 'إيراد هذا الشهر' : 'Revenue This Month',
    topups: locale === 'ar' ? 'شحن المحافظ' : 'Wallet Topups',
    paidAmount: locale === 'ar' ? 'قيمة الشحن المدفوعة' : 'Paid Topup Amount',
    paidThisMonth: locale === 'ar' ? 'مدفوع هذا الشهر' : 'Paid This Month',
    operations: locale === 'ar' ? 'المؤشرات التشغيلية' : 'Operational KPIs',
    fulfillmentRate: locale === 'ar' ? 'معدل الإنجاز' : 'Fulfillment Rate',
    cancellationRate: locale === 'ar' ? 'معدل الإلغاء' : 'Cancellation Rate',
    eventBookings: locale === 'ar' ? 'حجوزات الفعاليات' : 'Event Bookings',
    userDistribution: locale === 'ar' ? 'توزيع المستخدمين' : 'User Distribution',
    orderDistribution: locale === 'ar' ? 'توزيع حالات الطلبات' : 'Order Status Distribution',
    recentOrders: locale === 'ar' ? 'أحدث الطلبات' : 'Recent Orders',
    orderNumber: locale === 'ar' ? 'رقم الطلب' : 'Order #',
    customer: locale === 'ar' ? 'العميل' : 'Customer',
    products: locale === 'ar' ? 'المنتجات' : 'Products',
    amount: locale === 'ar' ? 'قيمة المنتجات' : 'Products Total',
    status: locale === 'ar' ? 'الحالة' : 'Status',
    createdAt: locale === 'ar' ? 'تاريخ الإنشاء' : 'Created at',
    viewAll: locale === 'ar' ? 'عرض الكل' : 'View all',
    open: locale === 'ar' ? 'فتح' : 'Open',
    noOrders: locale === 'ar' ? 'لا توجد طلبات حديثة.' : 'No recent orders yet.',
  };

  const formatMoney = (value: number) => formatAmountWithCurrency(value, 'OMR');

  const userSlices: AdminPieSlice[] = [
    { label: t.customers, value: customersCount, color: 'var(--noon-teal)' },
    { label: t.trainers, value: trainersCount, color: 'var(--noon-purple)' },
    { label: t.admins, value: adminsCount, color: 'var(--noon-coral)' },
  ];

  const orderSlices: AdminPieSlice[] = [
    {
      label: locale === 'ar' ? 'مدفوع' : 'Paid',
      value: shopSummary.statusCounts.PAID,
      color: 'var(--noon-teal)',
    },
    {
      label: locale === 'ar' ? 'قيد التجهيز' : 'Processing',
      value: shopSummary.statusCounts.PROCESSING,
      color: 'var(--noon-yellow)',
    },
    {
      label: locale === 'ar' ? 'جاهز للشحن' : 'Ready to Ship',
      value: shopSummary.statusCounts.READY_TO_SHIP,
      color: 'var(--noon-purple)',
    },
    {
      label: locale === 'ar' ? 'تم الشحن' : 'Shipped',
      value: shopSummary.statusCounts.SHIPPED,
      color: 'var(--noon-teal-strong)',
    },
    {
      label: locale === 'ar' ? 'تم التسليم' : 'Delivered',
      value: shopSummary.statusCounts.DELIVERED,
      color: 'var(--noon-purple-strong)',
    },
    {
      label: locale === 'ar' ? 'ملغي' : 'Cancelled',
      value: shopSummary.statusCounts.CANCELLED,
      color: 'var(--noon-coral-strong)',
    },
  ];

  const recentOrders = recentOrdersPayload.orders;

  const statusMap: Record<string, { en: string; ar: string; cls: string }> = {
    PAID: { en: 'Paid', ar: 'مدفوع', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    PROCESSING: { en: 'Processing', ar: 'قيد التجهيز', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    READY_TO_SHIP: { en: 'Ready to Ship', ar: 'جاهز للشحن', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    SHIPPED: { en: 'Shipped', ar: 'تم الشحن', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
    DELIVERED: { en: 'Delivered', ar: 'تم التسليم', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    CANCELLED: { en: 'Cancelled', ar: 'ملغي', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">{t.title}</h1>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.totalOrders}</p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{shopSummary.totalOrders}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.grossRevenue}</p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{formatMoney(shopSummary.grossRevenue)}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.paidAmount}</p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{formatMoney(topupSummary.paidAmount)}</p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.operations}</p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{fulfillmentRate.toFixed(1)}%</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPieChartCard title={t.userDistribution} slices={userSlices} locale={locale} />
        <AdminPieChartCard title={t.orderDistribution} slices={orderSlices} locale={locale} />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.recentOrders}</h2>
          <Link href={`/${locale}/admin/shop/orders`} className="text-sm font-medium text-[color:var(--noon-teal)] hover:opacity-90">
            {t.viewAll}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.amount}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.createdAt}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">{t.open}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {recentOrders.map((order) => {
                  const status = statusMap[order.status];
                  const productNames = order.items.map((item) => (locale === 'ar' ? item.product_name_ar : item.product_name_en));
                  const productsText = productNames.length <= 2 ? productNames.join('، ') : `${productNames.slice(0, 2).join('، ')} +${productNames.length - 2}`;

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
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300" title={productNames.join('، ')}>{productsText || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-white">{formatMoney(order.subtotal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>
                          {status[locale]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/${locale}/admin/shop/orders/${order.id}`} className="text-sm font-medium text-[color:var(--noon-teal)] hover:opacity-90">
                          {t.open}
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
    </div>
  );
}
