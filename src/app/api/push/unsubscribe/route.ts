import { NextRequest, NextResponse } from 'next/server';
import { deletePushSubscriptionByEndpoint } from '@/lib/push/subscriptions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
    if (!body?.endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }
    await deletePushSubscriptionByEndpoint(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[push/unsubscribe] failed:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
