import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { listWithdrawalRequestsForAdmin, approveWithdrawalRequest, rejectWithdrawalRequest } from '@/lib/db/wallet';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const statusParam = request.nextUrl.searchParams.get('status') ?? 'ALL';
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const limitParam = Number(request.nextUrl.searchParams.get('limit') ?? '10');

    const allowedStatuses = new Set(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
    const status = allowedStatuses.has(statusParam) ? statusParam : 'ALL';
    const page = Number.isFinite(pageParam) ? Math.max(1, pageParam) : 1;
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, limitParam)) : 10;

    const { requests, total } = await listWithdrawalRequestsForAdmin({
      status: status as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
      search,
      page,
      limit,
    });

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, transactionId, reason } = await request.json();

    if (!action || !transactionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'approve') {
      await approveWithdrawalRequest(transactionId, reason);
      return NextResponse.json({ success: true, message: 'Withdrawal request approved' });
    } else if (action === 'reject') {
      await rejectWithdrawalRequest(transactionId, reason);
      return NextResponse.json({ success: true, message: 'Withdrawal request rejected' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Process withdrawal request error:', error);

    if (error instanceof Error) {
      const knownErrors = new Set([
        'Pending withdrawal request not found',
        'Wallet not found',
        'Insufficient balance',
      ]);

      if (knownErrors.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}