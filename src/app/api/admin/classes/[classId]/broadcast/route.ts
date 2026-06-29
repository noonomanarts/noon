import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { broadcastClassMessage } from '@/lib/classCustomMessages';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

type Params = {
  params: Promise<{ classId: string }>;
};

export async function POST(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as {
      messageEn?: unknown;
      messageAr?: unknown;
    };

    const messageEn = typeof body.messageEn === 'string' ? body.messageEn : '';
    const messageAr = typeof body.messageAr === 'string' ? body.messageAr : '';

    if (!messageEn.trim() && !messageAr.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const result = await broadcastClassMessage({ classId, messageEn, messageAr });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send broadcast.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
