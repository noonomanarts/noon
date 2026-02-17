import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { listWalletTopupPaymentsForAdmin } from '@/lib/db/wallet';
import type { WalletTopupPaymentStatus } from '@/lib/db/types';

const allowedStatuses = new Set(['ALL', 'PENDING', 'PAID', 'FAILED', 'CANCELLED']);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const statusParam = (request.nextUrl.searchParams.get('status') ?? 'ALL').toUpperCase();
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '15');

    const status = allowedStatuses.has(statusParam) ? statusParam : 'ALL';
    const page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, limitParam)) : 15;

    const { payments, total } = await listWalletTopupPaymentsForAdmin({
      status: status as WalletTopupPaymentStatus | 'ALL',
      search,
      page,
      limit,
    });

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
