import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import PrintShopOrderReceiptClient from './PrintShopOrderReceiptClient';
import { getShopOrderForAdminById } from '@/lib/db/shop';
import { getUserById } from '@/lib/db/users';
import { isLocale } from '@/lib/locale';

type ShopOrderStatus = 'PAID' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type PrintShopOrder = {
  id: string;
  order_number: string;
  status: ShopOrderStatus;
  city: string;
  area: string;
  street_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  postal_code: string | null;
  recipient_full_name: string;
  recipient_phone: string;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  paid_at: string;
  created_at: string;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_name_en: string;
    product_name_ar: string;
  }>;
};

function serializeOrder(order: Awaited<ReturnType<typeof getShopOrderForAdminById>>): PrintShopOrder | null {
  if (!order) return null;

  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    city: order.city,
    area: order.area,
    street_address: order.street_address,
    delivery_latitude: order.delivery_latitude,
    delivery_longitude: order.delivery_longitude,
    postal_code: order.postal_code,
    recipient_full_name: order.recipient_full_name,
    recipient_phone: order.recipient_phone,
    notes: order.notes,
    subtotal: order.subtotal,
    discount_amount: order.discount_amount,
    shipping_fee: order.shipping_fee,
    total_amount: order.total_amount,
    currency: order.currency,
    payment_method: order.payment_method,
    paid_at: order.paid_at.toISOString(),
    created_at: order.created_at.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      product_name_en: item.product_name_en,
      product_name_ar: item.product_name_ar,
    })),
  };
}

export default async function AdminShopOrderPrintPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: rawLocale, orderId } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : 'en';
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  const order = await getShopOrderForAdminById(orderId);
  const serializedOrder = serializeOrder(order);

  if (!serializedOrder) {
    notFound();
  }

  return <PrintShopOrderReceiptClient locale={locale} order={serializedOrder} />;
}