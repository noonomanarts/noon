import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  reprocessPendingWalletTopupPayments,
  reprocessWalletTopupPaymentFromStoredPayload,
} from '@/lib/db/wallet';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      reference?: string;
      limit?: number;
    };

    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (reference) {
      const result = await reprocessWalletTopupPaymentFromStoredPayload(reference);
      if (!result.payment && result.reason === 'not_found') {
        return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        mode: 'single',
        reference,
        reprocessed: result.reprocessed,
        reason: result.reason,
        payment: result.payment,
        actedByUserId: admin.id,
      });
    }

    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : 20;
    const results = await reprocessPendingWalletTopupPayments(limit);

    return NextResponse.json({
      success: true,
      mode: 'batch',
      limit: Math.min(100, Math.max(1, Math.floor(limit))),
      processedCount: results.length,
      reprocessedCount: results.filter((item) => item.reprocessed).length,
      results,
      actedByUserId: admin.id,
    });
  } catch (error) {
    console.error('Failed to reprocess wallet top-up payments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reprocess wallet top-ups' },
      { status: 400 }
    );
  }
}