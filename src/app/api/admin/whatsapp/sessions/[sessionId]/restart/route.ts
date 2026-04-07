import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { listWhatsAppSessions, restartWhatsAppSession } from '@/lib/whatsapp/apiService';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    await restartWhatsAppSession(params.sessionId || '');

    const data = await listWhatsAppSessions();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restart WhatsApp session.';
    const status = /required|valid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
