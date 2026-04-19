import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { upsertPushSubscription } from '@/lib/push/subscriptions';

export const dynamic = 'force-dynamic';

type SubscribeBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  userAgent?: string;
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await getUserById(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as SubscribeBody | null;
    if (!body || typeof body.endpoint !== 'string' || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    const row = await upsertPushSubscription({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: body.userAgent ?? request.headers.get('user-agent') ?? null,
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error('[push/subscribe] failed:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
