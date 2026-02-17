import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { listShopOrdersForAdmin } from '@/lib/db/shop';
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
