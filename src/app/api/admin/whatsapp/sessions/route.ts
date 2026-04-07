import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { addWhatsAppSession, listWhatsAppSessions } from '@/lib/whatsapp/apiService';

export const runtime = 'nodejs';

type CreateSessionPayload = {
  sessionId?: string;
};

export async function GET() {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await listWhatsAppSessions();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load WhatsApp sessions.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateSessionPayload;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';

    await addWhatsAppSession(sessionId);
    const data = await listWhatsAppSessions();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add WhatsApp session.';
    const status = /required|valid|exist/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
