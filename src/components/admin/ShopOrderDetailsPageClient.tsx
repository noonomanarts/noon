'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { Locale } from '@/lib/locale';

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

type OrderDraft = {
  status: ShopOrderStatus;
  trackingNumber: string;
  adminNotes: string;
  cancellationReason: string;
};

const statusFlow: ShopOrderStatus[] = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function ShopOrderDetailsPageClient({
  locale,
  initialOrder,
}: {
  locale: Locale;
  initialOrder: AdminShopOrder;
}) {
  const isArabic = locale === 'ar';
  const [order, setOrder] = useState(initialOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrderDraft>({
    status: initialOrder.status,
    trackingNumber: initialOrder.tracking_number ?? '',
    adminNotes: initialOrder.admin_notes ?? '',
    cancellationReason: initialOrder.cancellation_reason ?? '',
  });

  const t = {
    back: isArabic ? 'رجوع لقائمة الطلبات' : 'Back to Orders',
    title: isArabic ? 'تفاصيل طلب المتجر' : 'Shop Order Details',
    customer: isArabic ? 'العميل' : 'Customer',
    recipient: isArabic ? 'المستلم' : 'Recipient',
    address: isArabic ? 'العنوان' : 'Address',
    payment: isArabic ? 'الدفع' : 'Payment',
    walletTx: isArabic ? 'معرف عملية المحفظة' : 'Wallet transaction ID',
    createdAt: isArabic ? 'تاريخ الإنشاء' : 'Created at',
    paidAt: isArabic ? 'تاريخ الدفع' : 'Paid at',
    shippedAt: isArabic ? 'تاريخ الشحن' : 'Shipped at',
    deliveredAt: isArabic ? 'تاريخ التسليم' : 'Delivered at',
    cancelledAt: isArabic ? 'تاريخ الإلغاء' : 'Cancelled at',
    subtotal: isArabic ? 'الإجمالي الفرعي' : 'Subtotal',
    shipping: isArabic ? 'الشحن' : 'Shipping',
    total: isArabic ? 'الإجمالي' : 'Total',
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment method',
    qty: isArabic ? 'الكمية' : 'Qty',
    unitPrice: isArabic ? 'سعر الوحدة' : 'Unit price',
    lineTotal: isArabic ? 'الإجمالي' : 'Line total',
    statusLabel: isArabic ? 'الحالة' : 'Status',
    tracking: isArabic ? 'رقم التتبع' : 'Tracking number',
    adminNotes: isArabic ? 'ملاحظات الإدارة' : 'Admin notes',
    cancellationReason: isArabic ? 'سبب الإلغاء' : 'Cancellation reason',
    save: isArabic ? 'حفظ التحديث' : 'Save Update',
    saving: isArabic ? 'جارِ الحفظ...' : 'Saving...',
    history: isArabic ? 'سجل الحالة' : 'Status History',
    orderItems: isArabic ? 'عناصر الطلب' : 'Order Items',
    noHistory: isArabic ? 'لا يوجد سجل حالات بعد.' : 'No status history yet.',
    saved: isArabic ? 'تم تحديث الطلب بنجاح.' : 'Order updated successfully.',
    requiredTracking: isArabic ? 'رقم التتبع مطلوب عند الشحن.' : 'Tracking number is required when status is SHIPPED.',
    requiredCancelReason: isArabic ? 'سبب الإلغاء مطلوب عند الإلغاء.' : 'Cancellation reason is required when status is CANCELLED.',
    orderNotes: isArabic ? 'ملاحظات الطلب' : 'Order Notes',
  };

  const statusLabelMap: Record<ShopOrderStatus, { en: string; ar: string }> = {
    PAID: { en: 'Paid', ar: 'مدفوع' },
    PROCESSING: { en: 'Processing', ar: 'قيد التجهيز' },
    READY_TO_SHIP: { en: 'Ready to Ship', ar: 'جاهز للشحن' },
    SHIPPED: { en: 'Shipped', ar: 'تم الشحن' },
    DELIVERED: { en: 'Delivered', ar: 'تم التسليم' },
    CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
  };

  const statusClass: Record<ShopOrderStatus, string> = {
    PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    PROCESSING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    READY_TO_SHIP: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    SHIPPED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  };

  const getInitial = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
  };

  const saveOrderUpdate = async () => {
    if (draft.status === 'SHIPPED' && !draft.trackingNumber.trim()) {
      setError(t.requiredTracking);
      return;
    }

    if (draft.status === 'CANCELLED' && !draft.cancellationReason.trim()) {
      setError(t.requiredCancelReason);
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/shop/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: draft.status,
          trackingNumber: draft.trackingNumber || null,
          adminNotes: draft.adminNotes || null,
          cancellationReason: draft.cancellationReason || null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        order?: AdminShopOrder;
        error?: string;
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || 'Failed to update order');
      }

      setOrder(payload.order);
      setDraft({
        status: payload.order.status,
        trackingNumber: payload.order.tracking_number ?? '',
        adminNotes: payload.order.admin_notes ?? '',
        cancellationReason: payload.order.cancellation_reason ?? '',
      });
      setMessage(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/admin/shop/orders`}
          className="inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← {t.back}
        </Link>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[order.status]}`}>
          {statusLabelMap[order.status][locale]}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title} #{order.order_number}</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {message}
        </div>
      )}

      <article className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.createdAt}: {new Date(order.created_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t.paidAt}: {new Date(order.paid_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
          </p>
          {order.shipped_at && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.shippedAt}: {new Date(order.shipped_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
            </p>
          )}
          {order.delivered_at && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.deliveredAt}: {new Date(order.delivered_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
            </p>
          )}
          {order.cancelled_at && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.cancelledAt}: {new Date(order.cancelled_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.customer}</p>
            <div className="flex items-start gap-3">
              {order.user_profile_image ? (
                <Image
                  src={order.user_profile_image}
                  alt={order.user_full_name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
                />
              ) : (
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 ring-2 ring-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-700">
                  {getInitial(order.user_full_name)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{order.user_full_name}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{order.user_email}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">{order.user_phone_number}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.recipient}</p>
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{order.recipient_full_name}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">{order.recipient_phone}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.address}</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.city} - {order.area}</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.street_address}</p>
            {order.postal_code && <p className="text-xs text-zinc-600 dark:text-zinc-300">{order.postal_code}</p>}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t.payment}</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{t.paymentMethod}: {order.payment_method}</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{t.subtotal}: {order.subtotal.toFixed(3)} {order.currency}</p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">{t.shipping}: {order.shipping_fee.toFixed(3)} {order.currency}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.total}: {order.total_amount.toFixed(3)} {order.currency}</p>
          </div>
        </div>

        {order.wallet_transaction_id && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
            {t.walletTx}: <span className="font-mono">{order.wallet_transaction_id}</span>
          </p>
        )}

        {order.notes && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="font-semibold">{t.orderNotes}: </span>{order.notes}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.statusLabel}</label>
              <select
                value={draft.status}
                onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as ShopOrderStatus }))}
                className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                {statusFlow.map((status) => (
                  <option key={status} value={status}>
                    {statusLabelMap[status][locale]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.tracking}</label>
              <input
                value={draft.trackingNumber}
                onChange={(event) => setDraft((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                placeholder={t.tracking}
                className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div className="space-y-1 md:col-span-2 xl:col-span-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.adminNotes}</label>
              <input
                value={draft.adminNotes}
                onChange={(event) => setDraft((prev) => ({ ...prev, adminNotes: event.target.value }))}
                placeholder={t.adminNotes}
                className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {draft.status === 'CANCELLED' && (
              <div className="space-y-1 md:col-span-2 xl:col-span-4">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t.cancellationReason}</label>
                <input
                  value={draft.cancellationReason}
                  onChange={(event) => setDraft((prev) => ({ ...prev, cancellationReason: event.target.value }))}
                  placeholder={t.cancellationReason}
                  className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void saveOrderUpdate()}
            disabled={saving}
            className="mt-3 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {t.orderItems} ({order.items.length})
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {order.items.map((item) => (
              <div key={item.id} className="grid gap-2 px-3 py-3 text-xs md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div className="flex items-center gap-3">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={isArabic ? item.product_name_ar : item.product_name_en}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700">
                      <span className="text-[10px] font-semibold">No Image</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{isArabic ? item.product_name_ar : item.product_name_en}</p>
                    <p className="text-zinc-500 dark:text-zinc-400">/{item.product_slug}</p>
                  </div>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300">{t.qty}: {item.quantity}</p>
                <p className="text-zinc-700 dark:text-zinc-300">{t.unitPrice}: {item.unit_price.toFixed(3)} {order.currency}</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.lineTotal}: {item.line_total.toFixed(3)} {order.currency}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {t.history}
          </div>
          {order.history.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">{t.noHistory}</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {order.history.slice(0, 6).map((entry) => (
                <div key={entry.id} className="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <p>
                    <span className="font-semibold">
                      {entry.previous_status ? statusLabelMap[entry.previous_status][locale] : '—'}
                    </span>
                    {' → '}
                    <span className="font-semibold">{statusLabelMap[entry.next_status][locale]}</span>
                  </p>
                  {entry.note && <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{entry.note}</p>}
                  <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{new Date(entry.created_at).toLocaleString(locale === 'ar' ? 'ar' : 'en')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
