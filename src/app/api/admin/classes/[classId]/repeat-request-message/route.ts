import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { sendManualRepeatRequestUpdate } from '@/lib/db/classRepeatRequests';
import { getUserById } from '@/lib/db/users';

export async function POST(
  request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { classId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      subjectEn?: string;
      subjectAr?: string;
      messageEn?: string;
      messageAr?: string;
      sendEmailChannel?: boolean;
      sendWhatsAppChannel?: boolean;
    };

    const subjectEn = body.subjectEn?.trim() ?? '';
    const subjectAr = body.subjectAr?.trim() ?? '';
    const messageEn = body.messageEn?.trim() ?? '';
    const messageAr = body.messageAr?.trim() ?? '';

    if (!messageEn || !messageAr) {
      return NextResponse.json({ error: 'Both Arabic and English messages are required.' }, { status: 400 });
    }

    if ((body.sendEmailChannel ?? false) && (!subjectEn || !subjectAr)) {
      return NextResponse.json({ error: 'Both Arabic and English email subjects are required.' }, { status: 400 });
    }

    const result = await sendManualRepeatRequestUpdate({
      classId,
      subjectEn,
      subjectAr,
      messageEn,
      messageAr,
      sendEmailChannel: Boolean(body.sendEmailChannel),
      sendWhatsAppChannel: Boolean(body.sendWhatsAppChannel),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send repeat request update.';
    const status =
      message === 'Class not found.'
        ? 404
        : message === 'Select at least one delivery channel.'
          || message === 'There are no pending repeat requesters for this workshop.'
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}