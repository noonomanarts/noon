'use client';

import Link from 'next/link';
import type { Booking, EventBooking } from '@/lib/db/types';

interface OrdersSectionProps {
  bookings: Booking[];
  eventBookings: EventBooking[];
  locale: 'en' | 'ar';
}

export function OrdersSection({ bookings, eventBookings, locale }: OrdersSectionProps) {
  const isArabic = locale === 'ar';

  const allOrders = [
    ...bookings.map(b => ({ ...b, type: 'class' as const })),
    ...eventBookings.map(b => ({ ...b, type: 'event' as const }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return 'text-yellow-600 bg-yellow-50';
      case 'CANCELLED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
          {allOrders.map((order) => (
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
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {isArabic ? 'عرض التفاصيل' : 'View Details'} →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}