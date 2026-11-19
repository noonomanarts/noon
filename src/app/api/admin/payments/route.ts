import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  ADMIN_PAYMENT_SOURCES,
  ADMIN_PAYMENT_STATUSES,
  listPaymentsForAdmin,
  type AdminPaymentSource,
  type AdminPaymentStatus,
} from '@/lib/db/payments';
import { isPaymentSandboxEnabled } from '@/lib/amwal';

export const dynamic = 'force-dynamic';

const allowedStatuses = new Set<string>(['ALL', ...ADMIN_PAYMENT_STATUSES]);
const allowedSources = new Set<string>(['ALL', ...ADMIN_PAYMENT_SOURCES]);

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
    const sourceParam = (request.nextUrl.searchParams.get('source') ?? 'ALL').toUpperCase();
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '20');

    const status = allowedStatuses.has(statusParam) ? statusParam : 'ALL';
    const source = allowedSources.has(sourceParam) ? sourceParam : 'ALL';
    const page = Number.isFinite(pageParam) ? Math.max(1, Math.floor(pageParam)) : 1;
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 20;

    const { payments, total, summary } = await listPaymentsForAdmin({
      status: status as AdminPaymentStatus | 'ALL',
      source: source as AdminPaymentSource | 'ALL',
      search,
      page,
      limit,
    });

    return NextResponse.json(
      {
        payments,
        summary,
        sandboxEnabled: isPaymentSandboxEnabled(),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
