import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  defaultWhatsAppTransactionTemplatesSettings,
  getAdminSettingsByKey,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type WhatsAppTransactionTemplatesSettings,
  upsertAdminSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saved = await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>('whatsapp-transaction-templates');
    const templates = sanitizeWhatsAppTransactionTemplatesSettings(
      saved ?? defaultWhatsAppTransactionTemplatesSettings
    );

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to load WhatsApp transaction templates:', error);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      templates?: Partial<WhatsAppTransactionTemplatesSettings>;
    };

    const current = await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>(
      'whatsapp-transaction-templates'
    );

    const merged = {
      ...(current ?? defaultWhatsAppTransactionTemplatesSettings),
      ...(body.templates ?? {}),
      templates: {
        ...(current?.templates ?? defaultWhatsAppTransactionTemplatesSettings.templates),
        ...(body.templates?.templates ?? {}),
      },
    } as Partial<WhatsAppTransactionTemplatesSettings>;

    const templates = sanitizeWhatsAppTransactionTemplatesSettings(merged);

    await upsertAdminSettings({
      key: 'whatsapp-transaction-templates',
      value: templates,
      updatedByUserId: admin.id,
    });

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Failed to update WhatsApp transaction templates:', error);
    return NextResponse.json({ error: 'Failed to update templates' }, { status: 500 });
  }
}
