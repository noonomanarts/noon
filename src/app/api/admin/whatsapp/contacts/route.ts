/**
 * Lists all WhatsApp contacts known to the active WAHA session.
 *
 * Returned alongside the saved phonebook so the admin can broadcast to
 * contacts that are not registered users of the application.
 */

import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import { readWahaSettings, getAllContacts } from '@/lib/whatsapp/wahaClient';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const settings = await readWahaSettings();
    if (!settings.activeSession) {
      return NextResponse.json({ error: 'No active WhatsApp session configured.' }, { status: 400 });
    }
    const contacts = await getAllContacts(settings, settings.activeSession);
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('[admin/whatsapp/contacts] failed:', error);
    return NextResponse.json({ error: 'Failed to load WhatsApp contacts' }, { status: 500 });
  }
}
