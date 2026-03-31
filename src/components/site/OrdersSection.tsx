'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Booking, EventBooking, ShopOrder, ShopOrderItem } from '@/lib/db/types';
import { formatPlainNumber } from '@/lib/formatNumber';

interface OrdersSectionProps {
  bookings: Booking[];
  eventBookings: EventBooking[];
  shopOrders: (ShopOrder & { items: ShopOrderItem[] })[];
  locale: 'en' | 'ar';
}

export function OrdersSection({ bookings, eventBookings, shopOrders, locale }: OrdersSectionProps) {
  const isArabic = locale === 'ar';
  const ordersPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const allOrders = useMemo(
    () =>
      [
        ...bookings.map((booking) => ({ ...booking, type: 'class' as const })),
        ...eventBookings.map((booking) => ({ ...booking, type: 'event' as const })),
        ...shopOrders.map((order) => ({ ...order, type: 'shop' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bookings, eventBookings, shopOrders]
  );

  const totalPages = Math.max(1, Math.ceil(allOrders.length / ordersPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (effectivePage - 1) * ordersPerPage;
    return allOrders.slice(start, start + ordersPerPage);
  }, [allOrders, effectivePage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
      case 'DELIVERED':
        return 'text-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]';
      case 'PROCESSING':
      case 'READY_TO_SHIP':
      case 'SHIPPED':
        return 'text-[color:var(--noon-purple)] bg-[color:var(--noon-purple-soft)]';
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return 'text-[color:var(--noon-yellow)] bg-[color:var(--noon-yellow-soft)]';
      case 'CANCELLED':
        return 'text-[color:var(--noon-coral)] bg-[color:var(--noon-coral-soft)]';
      default:
        return 'text-[color:var(--noon-purple)] bg-[color:var(--noon-purple-soft)]';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { en: string; ar: string }> = {
      PENDING: { en: 'Pending', ar: 'معلق' },
      CONFIRMED: { en: 'Confirmed', ar: 'مؤكد' },
      PAID: { en: 'Paid', ar: 'مدفوع' },
      PROCESSING: { en: 'Processing', ar: 'قيد التجهيز' },
      READY_TO_SHIP: { en: 'Ready to Ship', ar: 'جاهز للشحن' },
      SHIPPED: { en: 'Shipped', ar: 'تم الشحن' },
      DELIVERED: { en: 'Delivered', ar: 'تم التسليم' },
      COMPLETED: { en: 'Completed', ar: 'مكتمل' },
      CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
      PENDING_PAYMENT: { en: 'Pending Payment', ar: 'دفع معلق' },
      NEW: { en: 'New', ar: 'جديد' },
      IN_PROGRESS: { en: 'In Progress', ar: 'قيد التنفيذ' },
      PENDING_CLIENT_CONFIRMATION: { en: 'Pending Confirmation', ar: 'تأكيد معلق' },
      CLIENT_CONFIRMED: { en: 'Client Confirmed', ar: 'تأكيد العميل' },
    };
    return statusMap[status]?.[locale] || status;
  };

  const formatAmount = (value: unknown) => {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? formatPlainNumber(amount) : null;
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap: Record<string, { en: string; ar: string }> = {
      PENDING: { en: 'Pending Payment', ar: 'بانتظار الدفع' },
      PAID: { en: 'Paid', ar: 'مدفوع' },
      REFUNDED: { en: 'Refunded', ar: 'مسترجع' },
      FAILED: { en: 'Failed', ar: 'فشل الدفع' },
    };

    return statusMap[status]?.[locale] || status;
  };

  const getPaymentMethodText = (method: string | null | undefined) => {
    if (method === 'WALLET') {
      return isArabic ? 'المحفظة' : 'Wallet';
    }

    return method || (isArabic ? 'غير محدد' : 'Not set');
  };

  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
        {isArabic ? 'طلباتي من المتجر' : 'My Orders'}
      </h3>

      {allOrders.length === 0 ? (
        <p className="text-[color:var(--text-subtle)]">
          {isArabic ? 'لم يتم العثور على طلبات' : 'No orders found'}
        </p>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-[color:var(--text)]">
                    {order.type === 'class' ? (
                      isArabic ? 'حجز ورشة' : 'Class Booking'
                    ) : order.type === 'shop' ? (
                      isArabic ? 'طلب متجر' : 'Shop Order'
                    ) : (
                      isArabic ? 'حدث جماعي' : 'Group Event'
                    )}
                  </h4>
                  <p className="text-sm text-[color:var(--text-muted)]">
                    {isArabic ? 'رقم الطلب:' : 'Order #:'} {'order_number' in order ? order.order_number : order.booking_number}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="mb-2 text-sm text-[color:var(--text-muted)]">
                {isArabic ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}
              </div>

              {order.type === 'class' && 'total_amount' in order && order.total_amount !== null && order.total_amount !== undefined && (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-[color:var(--text)]">
                    {isArabic ? 'المجموع:' : 'Total:'} {formatAmount(order.total_amount) ?? '-'} {order.currency}
                  </div>
                  <div className="text-[color:var(--text-muted)]">
                    {isArabic ? 'الدفع:' : 'Payment:'} {getPaymentStatusText(order.payment_status)} • {getPaymentMethodText(order.payment_method)}
                  </div>
                </div>
              )}

              {order.type === 'event' && 'total_amount' in order && order.total_amount !== null && order.total_amount !== undefined && (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-[color:var(--text)]">
                    {isArabic ? 'المجموع:' : 'Total:'} {formatAmount(order.total_amount) ?? '-'} {order.currency}
                  </div>
                  <div className="text-[color:var(--text-muted)]">
                    {isArabic ? 'الدفع:' : 'Payment:'} {getPaymentStatusText(order.payment_status)} • {getPaymentMethodText(order.payment_method)}
                  </div>
                </div>
              )}

              {order.type === 'shop' && (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-[color:var(--text)]">
                    {isArabic ? 'المجموع:' : 'Total:'} {formatPlainNumber(order.total_amount)} {order.currency}
                  </div>
                  <div className="text-[color:var(--text-muted)]">
                    {isArabic ? 'الدفع:' : 'Payment:'} {getPaymentStatusText('PAID')} • {getPaymentMethodText(order.payment_method)}
                  </div>
                  <div className="text-[color:var(--text-muted)]">
                    {isArabic ? 'العنوان:' : 'Address:'} {order.city} - {order.area}
                  </div>
                  <div className="text-[color:var(--text-muted)]">
                    {isArabic ? 'عدد المنتجات:' : 'Items:'} {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                </div>
              )}

              {order.type !== 'shop' && (
                <div className="mt-3">
                  <Link
                    href={`/${locale}/account/orders/${order.id}`}
                    className="text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-hover)]"
                  >
                    {isArabic ? 'عرض التفاصيل' : 'View Details'} →
                  </Link>
                </div>
              )}
            </div>
          ))}

          {allOrders.length > ordersPerPage && (
            <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
              <p className="text-xs text-[color:var(--text-subtle)]">
                {isArabic
                  ? `صفحة ${effectivePage} من ${totalPages}`
                  : `Page ${effectivePage} of ${totalPages}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, effectivePage - 1))}
                  disabled={effectivePage === 1}
                  className="rounded-lg border border-[color:var(--noon-teal)]/40 px-3 py-1.5 text-xs font-medium text-[color:var(--noon-teal)] hover:bg-[color:var(--noon-teal-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[color:var(--noon-teal)]/50 dark:text-[color:var(--noon-teal)] dark:hover:bg-[color:var(--noon-teal-soft)]"
                >
                  {isArabic ? 'السابق' : 'Previous'}
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, effectivePage + 1))}
                  disabled={effectivePage === totalPages}
                  className="rounded-lg border border-[color:var(--noon-teal)]/40 px-3 py-1.5 text-xs font-medium text-[color:var(--noon-teal)] hover:bg-[color:var(--noon-teal-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[color:var(--noon-teal)]/50 dark:text-[color:var(--noon-teal)] dark:hover:bg-[color:var(--noon-teal-soft)]"
                >
                  {isArabic ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
