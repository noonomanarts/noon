import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { setNotificationReadState } from '@/lib/db/notifications';

type ReadStatePayload = {
  notificationId?: string;
  isRead?: boolean;
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as ReadStatePayload;
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : '';
    const isRead = body.isRead === true;

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });
    }

    const ok = await setNotificationReadState(notificationId, user.id, user.role, isRead);
    if (!ok) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set notification read-state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
