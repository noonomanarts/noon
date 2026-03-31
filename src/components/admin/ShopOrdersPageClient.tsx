'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type ShopOrderStatus = 'PAID' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type ShopOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name_en: string;
  product_name_ar: string;
  product_slug: string;
  product_image: string | null;
  created_at: string;
};

type ShopOrderStatusHistory = {
  id: string;
  order_id: string;
  previous_status: ShopOrderStatus | null;
  next_status: ShopOrderStatus;
  changed_by_user_id: string | null;
  note: string | null;
  created_at: string;
};

type AdminShopOrder = {
  id: string;
  order_number: string;
  user_id: string;
  status: ShopOrderStatus;
  city: string;
  area: string;
  street_address: string;
  postal_code: string | null;
  recipient_full_name: string;
  recipient_phone: string;
  notes: string | null;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: 'WALLET';
  wallet_transaction_id: string | null;
  tracking_number: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  paid_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  user_full_name: string;
  user_email: string;
  user_phone_number: string;
  user_profile_image: string | null;
  items: ShopOrderItem[];
  history: ShopOrderStatusHistory[];
};

const PAGE_SIZE = 12;
const statusFlow: ShopOrderStatus[] = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function ShopOrdersPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [orders, setOrders] = useState<AdminShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShopOrderStatus>('ALL');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'طلبات المتجر' : 'Shop Orders',
    subtitle: isArabic
      ? 'اختر أي طلب من القائمة لفتح صفحة التفاصيل الكاملة.'
      : 'Click any order row to open its full details page.',
    search: isArabic ? 'بحث برقم الطلب/اسم العميل/الهاتف...' : 'Search by order number/customer/phone...',
    all: isArabic ? 'الكل' : 'All',
    noOrders: isArabic ? 'لا توجد طلبات حالياً.' : 'No orders found.',
    page: isArabic ? 'الصفحة' : 'Page',
    of: isArabic ? 'من' : 'of',
    prev: isArabic ? 'السابق' : 'Previous',
    next: isArabic ? 'التالي' : 'Next',
    orderNumber: isArabic ? 'رقم الطلب' : 'Order #',
    customer: isArabic ? 'العميل' : 'Customer',
    products: isArabic ? 'المنتجات' : 'Products',
    amount: isArabic ? 'قيمة المنتجات' : 'Products Total',
    shipping: isArabic ? 'الشحن' : 'Shipping',
    statusLabel: isArabic ? 'الحالة' : 'Status',
    createdAt: isArabic ? 'تاريخ الإنشاء' : 'Created at',
    openDetails: isArabic ? 'عرض التفاصيل' : 'Open details',
  };

  const statusLabelMap: Record<ShopOrderStatus, { en: string; ar: string }> = {
    PAID: { en: 'Paid', ar: 'مدفوع' },
    PROCESSING: { en: 'Processing', ar: 'قيد التجهيز' },
    READY_TO_SHIP: { en: 'Ready to Ship', ar: 'جاهز للشحن' },
    SHIPPED: { en: 'Shipped', ar: 'تم الشحن' },
    DELIVERED: { en: 'Delivered', ar: 'تم التسليم' },
    CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          status: statusFilter,
        });

        if (searchDebounced) {
          params.set('search', searchDebounced);
        }

        const response = await fetch(`/api/admin/shop/orders?${params.toString()}`, { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as {
          orders?: AdminShopOrder[];
          total?: number;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load orders');
        }

        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
        setTotal(typeof payload.total === 'number' ? payload.total : 0);
      } catch (requestError) {
        setOrders([]);
        setTotal(0);
        setError(requestError instanceof Error ? requestError.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, [page, searchDebounced, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const statusClass = useMemo(
    () => ({
      PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      PROCESSING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      READY_TO_SHIP: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      SHIPPED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    }),
    []
  );

  const getProductsSummary = (order: AdminShopOrder) => {
    if (order.items.length === 0) {
      return isArabic ? '—' : '—';
    }

    const names = order.items.map((item) => (isArabic ? item.product_name_ar : item.product_name_en));
    const shown = names.slice(0, 2);
    const rest = names.length - shown.length;

    if (rest <= 0) {
      return shown.join('، ');
    }

    return `${shown.join('، ')} +${rest}`;
  };

  const getInitial = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.search}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ShopOrderStatus)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
          >
            <option value="ALL">{t.all}</option>
            {statusFlow.map((status) => (
              <option key={status} value={status}>
                {statusLabelMap[status][locale]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            Loading...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {t.noOrders}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="min-w-[1140px]">
              <div className="grid grid-cols-[170px_230px_1fr_210px_150px_190px_140px] items-center gap-4 border-b border-zinc-200 px-5 py-3 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <span className="whitespace-nowrap">{t.orderNumber}</span>
                <span className="whitespace-nowrap">{t.customer}</span>
                <span className="whitespace-nowrap">{t.products}</span>
                <span className="whitespace-nowrap">{t.amount}</span>
                <span className="whitespace-nowrap">{t.statusLabel}</span>
                <span className="whitespace-nowrap">{t.createdAt}</span>
                <span className="whitespace-nowrap" />
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/${locale}/admin/shop/orders/${order.id}`}
                    className="grid grid-cols-[170px_230px_1fr_210px_150px_190px_140px] items-center gap-4 px-5 py-3 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <span className="truncate whitespace-nowrap font-semibold text-zinc-900 dark:text-zinc-100" title={`#${order.order_number}`}>
                      #{order.order_number}
                    </span>

                    <span className="flex min-w-0 items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      {order.user_profile_image ? (
                        <Image
                          src={order.user_profile_image}
                          alt={order.user_full_name}
                          width={24}
                          height={24}
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                          {getInitial(order.user_full_name)}
                        </span>
                      )}
                      <span className="truncate whitespace-nowrap" title={order.user_full_name}>{order.user_full_name}</span>
                    </span>

                    <span className="truncate whitespace-nowrap text-zinc-700 dark:text-zinc-300" title={getProductsSummary(order)}>
                      {getProductsSummary(order)}
                    </span>

                    <span className="truncate whitespace-nowrap text-zinc-700 dark:text-zinc-300" title={`${formatAmountWithCurrency(order.subtotal, order.currency)} • ${t.shipping}: ${formatAmountWithCurrency(order.shipping_fee, order.currency)}`}>
                      <span className="font-semibold">{formatAmountWithCurrency(order.subtotal, order.currency)}</span>
                      <span className="text-zinc-500 dark:text-zinc-400"> • {t.shipping}: {formatAmountWithCurrency(order.shipping_fee, order.currency)}</span>
                    </span>

                    <span className={`w-fit whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${statusClass[order.status]}`}>
                      {statusLabelMap[order.status][locale]}
                    </span>

                    <span className="truncate whitespace-nowrap text-zinc-600 dark:text-zinc-400" title={new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}>
                      {new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}
                    </span>

                    <span className="whitespace-nowrap font-medium text-[color:var(--noon-teal)]">{t.openDetails}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.page} {page} {t.of} {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.prev}
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
