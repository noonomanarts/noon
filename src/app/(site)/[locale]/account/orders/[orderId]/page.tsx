import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getBookingByIdForUser } from '@/lib/db/classes';
import { getEventBookingByIdForUser } from '@/lib/db/events';
import { getShopOrderByIdForUser } from '@/lib/db/shop';
import { formatPlainNumber } from '@/lib/formatNumber';
import { getPaymentMethodLabel } from '@/lib/paymentMethod';
import { OrderPaymentCard } from '@/components/site/OrderPaymentCard';

type ClassBookingDetails = {
  id: string;
  booking_number: string;
  status: string;
  total_amount: number | null;
  currency: string;
  number_of_participants: number;
  payment_status: string;
  payment_method: string | null;
  paid_at: string | Date | null;
  special_requests: string | null;
  start_date_time: string | Date | null;
  customer_recipe_pdf?: string | null;
  customer_recipe_title?: string | null;
  customer_recipe_brief?: string | null;
};

type EventBookingDetails = {
  id: string;
  booking_number: string;
  event_type: string;
  status: string;
  total_amount: number | null;
  currency: string;
  selected_date: string | Date | null;
  selected_time: string;
  full_name: string;
  email: string;
  phone_number: string;
  payment_status: string;
  payment_method: string | null;
  paid_at: string | Date | null;
  special_requests: string | null;
};

type ShopOrderDetails = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  promo_code: string | null;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  paid_at: string | Date | null;
  recipient_full_name: string;
  recipient_phone: string;
  city: string;
  area: string;
  street_address: string;
  created_at: string | Date;
  items: Array<{
    id: string;
    product_name_en: string;
    product_name_ar: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  history: Array<{
    id: string;
    next_status: string;
    created_at: string | Date;
    note: string | null;
  }>;
};

function formatDateTime(locale: Locale, value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(locale: Locale, value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? formatPlainNumber(amount) : '-';
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
    case 'DELIVERED':
    case 'CLIENT_CONFIRMED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'PENDING':
    case 'PENDING_PAYMENT':
    case 'NEW':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
  }
}

export default async function AccountOrderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: rawLocale, orderId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isArabic = locale === 'ar';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [rawClassBooking, rawEventBooking, rawShopOrder] = await Promise.all([
    getBookingByIdForUser(user.id, orderId),
    getEventBookingByIdForUser(user.id, orderId),
    getShopOrderByIdForUser(user.id, orderId),
  ]);

  const classBooking = rawClassBooking as ClassBookingDetails | null;
  const eventBooking = rawEventBooking as EventBookingDetails | null;
  const shopOrder = rawShopOrder as ShopOrderDetails | null;

  if (!classBooking && !eventBooking && !shopOrder) {
    notFound();
  }

  const t = {
    back: isArabic ? 'العودة للطلبات' : 'Back to orders',
    total: isArabic ? 'الإجمالي' : 'Total',
    status: isArabic ? 'الحالة' : 'Status',
    created: isArabic ? 'تاريخ الإنشاء' : 'Created',
    updated: isArabic ? 'آخر تحديث' : 'Updated',
    payment: isArabic ? 'الدفع' : 'Payment',
    notes: isArabic ? 'الملاحظات' : 'Notes',
    participants: isArabic ? 'المشاركون' : 'Participants',
    schedule: isArabic ? 'الموعد' : 'Schedule',
    customer: isArabic ? 'العميل' : 'Customer',
    delivery: isArabic ? 'التوصيل' : 'Delivery',
    items: isArabic ? 'المنتجات' : 'Items',
    history: isArabic ? 'سجل الحالة' : 'Status history',
    classBooking: isArabic ? 'تفاصيل حجز الدورة' : 'Class Booking Details',
    eventBooking: isArabic ? 'تفاصيل حجز الفعالية' : 'Event Booking Details',
    shopOrder: isArabic ? 'تفاصيل طلب المتجر' : 'Shop Order Details',
    orderNumber: isArabic ? 'رقم الطلب' : 'Order Number',
    type: isArabic ? 'النوع' : 'Type',
    date: isArabic ? 'التاريخ' : 'Date',
    time: isArabic ? 'الوقت' : 'Time',
    phone: isArabic ? 'الهاتف' : 'Phone',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    address: isArabic ? 'العنوان' : 'Address',
    noNotes: isArabic ? 'لا توجد ملاحظات' : 'No notes',
    subtotal: isArabic ? 'الإجمالي الفرعي' : 'Subtotal',
    discount: isArabic ? 'الخصم' : 'Discount',
    shipping: isArabic ? 'الشحن' : 'Shipping',
    promoCode: isArabic ? 'كود الخصم' : 'Promo Code',
    paymentStatus: isArabic ? 'حالة الدفع' : 'Payment Status',
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment Method',
    finalRecipe: isArabic ? 'الوصفة النهائية' : 'Final Recipe',
    downloadRecipe: isArabic ? 'تحميل الوصفة (PDF)' : 'Download Recipe (PDF)',
    noRecipe: isArabic ? 'الوصفة النهائية غير متاحة بعد.' : 'Final recipe is not available yet.',
  };

  if (classBooking) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Link href={`/${locale}/account/orders`} className="text-sm font-semibold text-[color:var(--primary)] hover:underline">
          {t.back}
        </Link>
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[color:var(--text)]">{t.classBooking}</h1>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.orderNumber}: {classBooking.booking_number}</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(classBooking.status)}`}>
              {classBooking.status}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.schedule}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{formatDateTime(locale, classBooking.start_date_time)}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.total}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{formatAmount(classBooking.total_amount)} {classBooking.currency}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.participants}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{classBooking.number_of_participants}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.payment}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{classBooking.payment_status} {classBooking.payment_method ? `• ${getPaymentMethodLabel(classBooking.payment_method, locale)}` : ''}</p>
            </div>
          </div>

          <div className="mt-6">
            <OrderPaymentCard
              locale={locale}
              orderType="class"
              orderId={classBooking.id}
              orderStatus={classBooking.status}
              paymentStatus={classBooking.payment_status}
              paymentMethod={classBooking.payment_method}
              totalAmount={classBooking.total_amount}
              currency={classBooking.currency}
              paidAt={classBooking.paid_at}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[color:var(--border)] p-4 text-sm text-[color:var(--text-muted)]">
            <p className="font-medium text-[color:var(--text)]">{t.notes}</p>
            <p className="mt-2">{classBooking.special_requests || t.noNotes}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--border)] p-4 text-sm">
            <p className="font-medium text-[color:var(--text)]">{t.finalRecipe}</p>
            {classBooking.customer_recipe_pdf || classBooking.customer_recipe_brief ? (
              <div className="mt-2 space-y-2 text-[color:var(--text-muted)]">
                <p className="font-medium text-[color:var(--text)]">{classBooking.customer_recipe_title || t.finalRecipe}</p>
                {classBooking.customer_recipe_brief ? <p>{classBooking.customer_recipe_brief}</p> : null}
                {classBooking.customer_recipe_pdf ? (
                  <Link
                    href={classBooking.customer_recipe_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-[color:var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {t.downloadRecipe}
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-[color:var(--text-muted)]">{t.noRecipe}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (eventBooking) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Link href={`/${locale}/account/orders`} className="text-sm font-semibold text-[color:var(--primary)] hover:underline">
          {t.back}
        </Link>
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[color:var(--text)]">{t.eventBooking}</h1>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.orderNumber}: {eventBooking.booking_number}</p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(eventBooking.status)}`}>
              {eventBooking.status}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.type}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{eventBooking.event_type}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.total}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{formatAmount(eventBooking.total_amount)} {eventBooking.currency}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.date}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{formatDate(locale, eventBooking.selected_date)}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.time}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{eventBooking.selected_time}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.customer}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{eventBooking.full_name}</p>
              <p className="mt-1 text-[color:var(--text-muted)]">{eventBooking.email}</p>
              <p className="text-[color:var(--text-muted)]">{eventBooking.phone_number}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.payment}</p>
              <p className="mt-1 font-semibold text-[color:var(--text)]">{eventBooking.payment_status} {eventBooking.payment_method ? `• ${getPaymentMethodLabel(eventBooking.payment_method, locale)}` : ''}</p>
            </div>
          </div>

          <div className="mt-6">
            <OrderPaymentCard
              locale={locale}
              orderType="event"
              orderId={eventBooking.id}
              orderStatus={eventBooking.status}
              paymentStatus={eventBooking.payment_status}
              paymentMethod={eventBooking.payment_method}
              totalAmount={eventBooking.total_amount}
              currency={eventBooking.currency}
              paidAt={eventBooking.paid_at}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[color:var(--border)] p-4 text-sm text-[color:var(--text-muted)]">
            <p className="font-medium text-[color:var(--text)]">{t.notes}</p>
            <p className="mt-2">{eventBooking.special_requests || t.noNotes}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Link href={`/${locale}/account/orders`} className="text-sm font-semibold text-[color:var(--primary)] hover:underline">
        {t.back}
      </Link>
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--text)]">{t.shopOrder}</h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.orderNumber}: {shopOrder!.order_number}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClasses(shopOrder!.status)}`}>
            {shopOrder!.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] p-4">
              <p className="text-sm font-medium text-[color:var(--text)]">{t.items}</p>
              <div className="mt-3 space-y-3">
                {shopOrder!.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--muted)] p-3 text-sm">
                    <div>
                      <p className="font-semibold text-[color:var(--text)]">{isArabic ? item.product_name_ar : item.product_name_en}</p>
                      <p className="text-[color:var(--text-muted)]">{item.quantity} × {formatAmount(item.unit_price)} {shopOrder!.currency}</p>
                    </div>
                    <p className="font-semibold text-[color:var(--text)]">{formatAmount(item.line_total)} {shopOrder!.currency}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] p-4">
              <p className="text-sm font-medium text-[color:var(--text)]">{t.delivery}</p>
              <div className="mt-3 space-y-1 text-sm text-[color:var(--text-muted)]">
                <p>{shopOrder!.recipient_full_name}</p>
                <p>{shopOrder!.recipient_phone}</p>
                <p>{shopOrder!.city} - {shopOrder!.area}</p>
                <p>{shopOrder!.street_address}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[color:var(--muted)] p-4 text-sm">
              <p className="text-[color:var(--text-subtle)]">{t.total}</p>
              <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">{formatAmount(shopOrder!.total_amount)} {shopOrder!.currency}</p>
              <div className="mt-3 space-y-1 text-xs text-[color:var(--text-muted)]">
                <p>{t.subtotal}: {formatAmount(shopOrder!.subtotal)} {shopOrder!.currency}</p>
                {shopOrder!.discount_amount > 0 ? (
                  <p>{t.discount}: -{formatAmount(shopOrder!.discount_amount)} {shopOrder!.currency}</p>
                ) : null}
                <p>{t.shipping}: {formatAmount(shopOrder!.shipping_fee)} {shopOrder!.currency}</p>
                {shopOrder!.promo_code ? <p>{t.promoCode}: {shopOrder!.promo_code}</p> : null}
              </div>
              <p className="mt-2 text-[color:var(--text-muted)]">{t.created}: {formatDateTime(locale, shopOrder!.created_at)}</p>
            </div>

            <OrderPaymentCard
              locale={locale}
              orderType="shop"
              orderId={shopOrder!.id}
              orderStatus={shopOrder!.status}
              paymentStatus="PAID"
              paymentMethod={shopOrder!.payment_method}
              totalAmount={shopOrder!.total_amount}
              currency={shopOrder!.currency}
              paidAt={shopOrder!.paid_at}
            />

            <div className="rounded-2xl border border-[color:var(--border)] p-4">
              <p className="text-sm font-medium text-[color:var(--text)]">{t.history}</p>
              <div className="mt-3 space-y-3">
                {shopOrder!.history.map((history) => (
                  <div key={history.id} className="rounded-2xl bg-[color:var(--muted)] p-3 text-sm">
                    <p className="font-semibold text-[color:var(--text)]">{history.next_status}</p>
                    <p className="mt-1 text-[color:var(--text-muted)]">{formatDateTime(locale, history.created_at)}</p>
                    {history.note ? <p className="mt-2 text-[color:var(--text-muted)]">{history.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
