import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getBookingsByUserId } from '@/lib/db/classes';
import { getEventBookingsByUserId } from '@/lib/db/events';
import { listShopOrdersByUserId } from '@/lib/db/shop';
import { OrdersSection } from '@/components/site/OrdersSection';
import type { Booking, EventBooking, ShopOrder, ShopOrderItem } from '@/lib/db/types';

export default async function AccountOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const bookings = (await getBookingsByUserId(user.id)) as Booking[];
  const eventBookings = (await getEventBookingsByUserId(user.id)) as EventBooking[];
  const shopOrders = (await listShopOrdersByUserId(user.id)) as (ShopOrder & { items: ShopOrderItem[] })[];

  return <OrdersSection bookings={bookings} eventBookings={eventBookings} shopOrders={shopOrders} locale={locale} />;
}
