import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getWorkerPermissions } from '@/lib/db/worker';
import { updateShopOrderForAdmin } from '@/lib/db/shop';
import type { ShopOrderStatus } from '@/lib/db/types';

const ALLOWED_STATUSES: ShopOrderStatus[] = ['PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || (user.role !== 'WORKER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const permissions = user.role === 'ADMIN' ? { can_manage_orders: true } : await getWorkerPermissions(user.id);
    if (!permissions?.can_manage_orders) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, status, note, trackingNumber } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update the order status using the admin function
    const updatedOrder = await updateShopOrderForAdmin({
      orderId,
      changedByUserId: user.id,
      status,
      adminNotes: note,
      trackingNumber: status === 'SHIPPED' ? trackingNumber : undefined,
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order status' },
      { status: 500 }
    );
  }
}
