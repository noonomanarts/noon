import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { updateShopOrderForAdmin } from '@/lib/db/shop';
import type { ShopOrderStatus } from '@/lib/db/types';

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

const allowedStatuses = new Set<ShopOrderStatus>([
  'PAID',
  'PROCESSING',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    const body = (await request.json()) as {
      status?: ShopOrderStatus;
      trackingNumber?: string | null;
      adminNotes?: string | null;
      cancellationReason?: string | null;
    };

    if (body.status && !allowedStatuses.has(body.status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    const order = await updateShopOrderForAdmin({
      orderId,
      changedByUserId: auth.user.id,
      status: body.status,
      trackingNumber: body.trackingNumber,
      adminNotes: body.adminNotes,
      cancellationReason: body.cancellationReason,
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating shop order:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid status transition')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === 'Tracking number is required for SHIPPED status') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message === 'Cancellation reason is required for CANCELLED status') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
