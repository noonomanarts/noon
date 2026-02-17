import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { query } from '@/lib/db/pool';
import {
  defaultWhatsAppAdminSettings,
  getAdminSettingsByKey,
  type WhatsAppAdminSettings,
} from '@/lib/db/adminSettings';

type SendPayload = {
  userIds?: string[];
  text?: string;
};

function normalizePhoneToChatId(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 8) {
    digits = `968${digits}`;
  }

  if (digits.length < 8) return null;
  return `${digits}@c.us`;
}

function resolveWahaEndpoint(sendApiUrl: string): string {
  const trimmed = sendApiUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  if (/\/api\/send(Text|Image)$/i.test(trimmed)) {
    return trimmed.replace(/\/api\/send(Text|Image)$/i, '/api/sendText');
  }

  return `${trimmed}/api/sendText`;
}

function normalizeApiKey(apiCode: string): string {
  const normalized = apiCode.trim();
  if (!normalized) return '';
  if (/^bearer\s+/i.test(normalized)) {
    return normalized.replace(/^bearer\s+/i, '').trim();
  }
  return normalized;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return null;
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
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

    const savedWhatsApp = await getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp');
    const settings = {
      ...defaultWhatsAppAdminSettings,
      ...(savedWhatsApp ?? {}),
    };

    const endpoint = resolveWahaEndpoint(settings.sendApiUrl);
    if (!endpoint) {
      return NextResponse.json({ error: 'WhatsApp API URL is not configured.' }, { status: 400 });
    }

    const apiCode = normalizeApiKey(settings.apiCode);
    if (!apiCode) {
      return NextResponse.json({ error: 'WhatsApp API Code is not configured.' }, { status: 400 });
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
        const chatId = normalizePhoneToChatId(recipient.phone_number || '');
        if (!chatId) {
          return {
            userId: recipient.id,
            name: recipient.full_name,
            success: false,
            error: 'Invalid phone number',
          };
        }

        const payload = {
          chatId,
          reply_to: null,
          text,
          linkPreview: true,
          linkPreviewHighQuality: false,
          session: settings.activeSession || 'default',
        };

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Api-Key': apiCode,
            },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();

          if (!response.ok) {
            return {
              userId: recipient.id,
              name: recipient.full_name,
              success: false,
              error: `WAHA ${response.status}: ${responseText.slice(0, 300)}`,
            };
          }

          return {
            userId: recipient.id,
            name: recipient.full_name,
            success: true,
          };
        } catch (error) {
          return {
            userId: recipient.id,
            name: recipient.full_name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
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
