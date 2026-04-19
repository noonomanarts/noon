/**
 * Bulk "is this phone number registered on WhatsApp?" check.
 *
 * Posts the set of user IDs to verify; returns a map of userId → existence
 * flag plus the resolved WhatsApp chatId. Used by the admin broadcast UI
 * so operators can see who will actually receive a message before sending.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { checkNumberExists, readWahaSettings } from '@/lib/whatsapp/wahaClient';

export const runtime = 'nodejs';

type Body = { userIds?: string[] };

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'userIds required' }, { status: 400 });
    }

    const recipients = (
      await query<{ id: string; full_name: string; phone_number: string | null }>(
        `SELECT id, full_name, phone_number
           FROM users
          WHERE id = ANY($1::uuid[])`,
        [userIds]
      )
    ).rows;

    const settings = await readWahaSettings();
    const session = settings.activeSession;
    if (!session) {
      return NextResponse.json({ error: 'No active WhatsApp session configured.' }, { status: 400 });
    }

    // Run checks in parallel but with a small cap so we never DDoS WAHA.
    const CONCURRENCY = 6;
    const results: Array<{
      userId: string;
      name: string;
      phone: string | null;
      numberExists: boolean | null;
      chatId: string | null;
    }> = [];

    for (let i = 0; i < recipients.length; i += CONCURRENCY) {
      const slice = recipients.slice(i, i + CONCURRENCY);
      const sliceResults = await Promise.all(
        slice.map(async (recipient) => {
          if (!recipient.phone_number) {
            return {
              userId: recipient.id,
              name: recipient.full_name,
              phone: null,
              numberExists: null,
              chatId: null,
            };
          }
          const check = await checkNumberExists(settings, session, recipient.phone_number).catch(() => null);
          return {
            userId: recipient.id,
            name: recipient.full_name,
            phone: recipient.phone_number,
            numberExists: check?.numberExists ?? null,
            chatId: check?.chatId ?? null,
          };
        })
      );
      results.push(...sliceResults);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[admin/whatsapp/check-exists] failed:', error);
    return NextResponse.json({ error: 'Failed to check recipients' }, { status: 500 });
  }
}
