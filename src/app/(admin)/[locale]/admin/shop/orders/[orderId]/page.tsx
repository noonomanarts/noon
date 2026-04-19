import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ShopOrderDetailsPageClient from '@/components/admin/ShopOrderDetailsPageClient';
import { getShopOrderForAdminById } from '@/lib/db/shop';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';

type ShopOrderStatus = 'PAID' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type AdminShopOrderClient = {
  id: string;
  order_number: string;
  user_id: string;
  status: ShopOrderStatus;
  city: string | null;
  area: string | null;
  street_address: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  postal_code: string | null;
  recipient_full_name: string;
  recipient_phone: string;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  promo_code_id: string | null;
  promo_code: string | null;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: 'WALLET' | 'BANK_TRANSFER' | 'PAYMENT_LINK' | 'CASH';
  fulfillment_type: 'DELIVERY' | 'PICKUP';
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
  items: {
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
  }[];
  history: {
    id: string;
    order_id: string;
    previous_status: ShopOrderStatus | null;
    next_status: ShopOrderStatus;
    changed_by_user_id: string | null;
    note: string | null;
    created_at: string;
  }[];
};

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializeAdminShopOrder(order: Awaited<ReturnType<typeof getShopOrderForAdminById>>): AdminShopOrderClient | null {
  if (!order) return null;

  return {
    ...order,
    paid_at: order.paid_at.toISOString(),
    shipped_at: toIsoString(order.shipped_at),
    delivered_at: toIsoString(order.delivered_at),
    cancelled_at: toIsoString(order.cancelled_at),
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
    items: order.items.map((item) => ({
      ...item,
      created_at: item.created_at.toISOString(),
    })),
    history: order.history.map((entry) => ({
      ...entry,
      created_at: entry.created_at.toISOString(),
    })),
  };
}

export default async function AdminShopOrderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: rawLocale, orderId } = await params;
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

  const order = await getShopOrderForAdminById(orderId);
  if (!order) {
    notFound();
  }

  const initialOrder = serializeAdminShopOrder(order);
  if (!initialOrder) {
    notFound();
  }

  return <ShopOrderDetailsPageClient locale={locale} initialOrder={initialOrder} />;
}
