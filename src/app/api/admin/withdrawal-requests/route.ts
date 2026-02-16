import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getPendingWithdrawalRequests, approveWithdrawalRequest, rejectWithdrawalRequest } from '@/lib/db/wallet';

export async function GET() {
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

    const requests = await getPendingWithdrawalRequests();
    return NextResponse.json({ requests });
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}