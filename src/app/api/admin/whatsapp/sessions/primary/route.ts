import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { listWhatsAppSessions, setPrimaryWhatsAppSession } from '@/lib/whatsapp/apiService';

export const runtime = 'nodejs';

type PrimarySessionPayload = {
  sessionId?: string;
};

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as PrimarySessionPayload;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';

    await setPrimaryWhatsAppSession(sessionId);
    const data = await listWhatsAppSessions();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set primary WhatsApp session.';
    const status = /required|valid|exist/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
