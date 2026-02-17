'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Booking, EventBooking } from '@/lib/db/types';

interface OrdersSectionProps {
  bookings: Booking[];
  eventBookings: EventBooking[];
  locale: 'en' | 'ar';
}

export function OrdersSection({ bookings, eventBookings, locale }: OrdersSectionProps) {
  const isArabic = locale === 'ar';
  const ordersPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  const allOrders = useMemo(
    () =>
      [
        ...bookings.map((booking) => ({ ...booking, type: 'class' as const })),
        ...eventBookings.map((booking) => ({ ...booking, type: 'event' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bookings, eventBookings]
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
        return 'text-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]';
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200/40 p-6">
      <h3 className="text-lg font-semibold mb-4">
        {isArabic ? 'طلباتي' : 'My Orders'}
      </h3>

      {allOrders.length === 0 ? (
        <p className="text-gray-500">
          {isArabic ? 'لم يتم العثور على طلبات' : 'No orders found'}
        </p>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div key={order.id} className="border border-zinc-200/60 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50/30">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium">
                    {order.type === 'class' ? (
                      isArabic ? 'حجز فصل' : 'Class Booking'
                    ) : (
                      isArabic ? 'حدث جماعي' : 'Group Event'
                    )}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isArabic ? 'رقم الطلب:' : 'Order #:'} {order.booking_number}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                {isArabic ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}
              </div>

              {order.type === 'class' && 'total_amount' in order && order.total_amount && (
                <div className="text-sm font-medium">
                  {isArabic ? 'المجموع:' : 'Total:'} {order.total_amount.toFixed(3)} {order.currency}
                </div>
              )}

              {order.type === 'event' && 'total_amount' in order && order.total_amount && (
                <div className="text-sm font-medium">
                  {isArabic ? 'المجموع:' : 'Total:'} {order.total_amount.toFixed(3)} {order.currency}
                </div>
              )}

              <div className="mt-3">
                <Link
                  href={`/${locale}/account/orders/${order.id}`}
                  className="text-sm font-medium text-[color:var(--noon-teal)] hover:text-[color:var(--noon-teal-dark)]"
                >
                  {isArabic ? 'عرض التفاصيل' : 'View Details'} →
                </Link>
              </div>
            </div>
          ))}

          {allOrders.length > ordersPerPage && (
            <div className="flex items-center justify-between border-t border-zinc-200/70 pt-4 dark:border-zinc-700/60">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
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