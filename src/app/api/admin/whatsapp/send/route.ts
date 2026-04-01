import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { sendWhatsAppTextViaManagedSession } from '@/lib/whatsapp/wwebjsService';

export const runtime = 'nodejs';

type SendPayload = {
  userIds?: string[];
  text?: string;
};

type SendDiagnostics = {
  sessionId: string;
  status: string;
  hasClient: boolean;
  hasWid: boolean;
  updatedAt: string;
  attempts?: number;
};

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as SendPayload;

    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one recipient.' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Text message is required.' }, { status: 400 });
    }

    const recipientsResult = await query<{
      id: string;
      full_name: string;
      phone_number: string | null;
      role: string;
    }>(
      `SELECT id, full_name, phone_number, role
       FROM users
       WHERE id = ANY($1::uuid[])
         AND status = 'ACTIVE'`,
      [userIds]
    );

    const recipients = recipientsResult.rows;

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const response = await sendWhatsAppTextViaManagedSession({
            phoneNumber: recipient.phone_number || '',
            text,
          });

          if (!response.ok) {
            return {
              userId: recipient.id,
              name: recipient.full_name,
              success: false,
              error: `WhatsApp ${response.status}: ${response.body.slice(0, 300)}`,
              diagnostics: response.diagnostics ?? null,
            };
          }

          return {
            userId: recipient.id,
            name: recipient.full_name,
            success: true,
            diagnostics: response.diagnostics ?? null,
          };
        } catch (error) {
          return {
            userId: recipient.id,
            name: recipient.full_name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            diagnostics: null as SendDiagnostics | null,
          };
        }
      })
    );

    const sent = results.filter((item) => item.success).length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: failed === 0,
      summary: { total: results.length, sent, failed },
      results,
    });
  } catch (error) {
    console.error('Failed to send WhatsApp messages:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp messages' }, { status: 500 });
  }
}
