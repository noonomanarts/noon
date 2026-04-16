import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueClassWhatsAppNotifications } from '@/lib/classWhatsAppNotifications';
import { getUserById } from '@/lib/db/users';

async function canRun(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CLASS_NOTIFICATION_SECRET;
  if (cronSecret) {
    const provided = request.headers.get('x-class-notification-secret');
    const querySecret = request.nextUrl.searchParams.get('secret');
    if ((provided && provided === cronSecret) || (querySecret && querySecret === cronSecret)) {
      return true;
    }
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return false;

  const user = await getUserById(sessionId);
  return Boolean(user && user.role === 'ADMIN');
}

async function run(request: NextRequest) {
  try {
    const allowed = await canRun(request);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchDueClassWhatsAppNotifications(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Run class WhatsApp notifications error:', error);
    return NextResponse.json({ error: 'Failed to run class WhatsApp notifications' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
