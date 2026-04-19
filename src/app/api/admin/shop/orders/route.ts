import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createAdminShopOrder, listShopOrdersForAdmin } from '@/lib/db/shop';
import { getWorkersWithOrdersPermission } from '@/lib/db/worker';
import { notifyUser } from '@/lib/notificationService';
import type { ShopOrderFulfillmentType, ShopOrderStatus } from '@/lib/db/types';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}

const allowedStatuses = new Set<ShopOrderStatus | 'ALL'>([
  'ALL',
  'PAID',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const statusRaw = (request.nextUrl.searchParams.get('status') ?? 'ALL').toUpperCase();
    const status = allowedStatuses.has(statusRaw as ShopOrderStatus | 'ALL')
      ? (statusRaw as ShopOrderStatus | 'ALL')
      : 'ALL';
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const pageRaw = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '20');

    const { orders, total } = await listShopOrdersForAdmin({
      status,
      search,
      page: Number.isFinite(pageRaw) ? pageRaw : 1,
      limit: Number.isFinite(limitRaw) ? limitRaw : 20,
    });

    return NextResponse.json({ orders, total });
  } catch (error) {
    console.error('Error fetching shop orders for admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ALLOWED_PAYMENT_METHODS = new Set(['BANK_TRANSFER', 'PAYMENT_LINK', 'CASH']);
const ALLOWED_FULFILLMENT_TYPES = new Set<ShopOrderFulfillmentType>(['DELIVERY', 'PICKUP']);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json().catch(() => null)) as {
      userId?: string;
      fulfillmentType?: string;
      paymentMethod?: string;
      shippingFee?: number;
      recipientFullName?: string;
      recipientPhone?: string;
      city?: string;
      area?: string;
      streetAddress?: string;
      postalCode?: string;
      notes?: string;
      adminNotes?: string;
      items?: Array<{ productId?: string; quantity?: number }>;
    } | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    const fulfillmentType = String(body.fulfillmentType || '').toUpperCase() as ShopOrderFulfillmentType;
    if (!ALLOWED_FULFILLMENT_TYPES.has(fulfillmentType)) {
      return NextResponse.json({ error: 'Invalid fulfillment type' }, { status: 400 });
    }

    const paymentMethod = String(body.paymentMethod || '').toUpperCase();
    if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .map((item) => ({
        productId: typeof item?.productId === 'string' ? item.productId.trim() : '',
        quantity: Number(item?.quantity ?? 0),
      }))
      .filter((item) => item.productId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);

    if (items.length === 0) {
      return NextResponse.json({ error: 'Select at least one product with a positive quantity' }, { status: 400 });
    }

    const order = await createAdminShopOrder({
      createdByAdminId: auth.user!.id,
      userId,
      fulfillmentType,
      paymentMethod: paymentMethod as 'BANK_TRANSFER' | 'PAYMENT_LINK' | 'CASH',
      items,
      shippingFee: typeof body.shippingFee === 'number' ? body.shippingFee : 0,
      recipientFullName: body.recipientFullName,
      recipientPhone: body.recipientPhone,
      city: body.city,
      area: body.area,
      streetAddress: body.streetAddress,
      postalCode: body.postalCode,
      notes: body.notes,
      adminNotes: body.adminNotes,
    });

    void (async () => {
      try {
        const workers = await getWorkersWithOrdersPermission();
        for (const worker of workers) {
          await notifyUser(worker.id, {
            title: 'New Admin-Created Order',
            message: `Order #${order.order_number} was created by admin (${order.total_amount.toFixed(3)} ${order.currency})`,
            type: 'shop_order',
            data: { link: '/worker/orders' },
          });
        }
      } catch (error) {
        console.error('Failed to notify workers about admin-created order:', error);
      }
    })();

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    console.error('Error creating admin shop order:', error);
    const status = /required|invalid|insufficient stock|inactive|not found|no longer/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
