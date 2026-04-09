import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import {
  defaultInvoiceTemplateSettings,
  sanitizeInvoiceTemplateSettings,
  type InvoiceTemplateSettings,
} from '@/lib/adminSettings';

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
    const saved = await getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template');
    const settings = sanitizeInvoiceTemplateSettings(saved ?? defaultInvoiceTemplateSettings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoice settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const settings = sanitizeInvoiceTemplateSettings(body);
    await upsertAdminSettings({
      key: 'invoice-template',
      value: settings,
      updatedByUserId: admin.id,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving invoice settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save invoice settings' },
      { status: 500 }
    );
  }
}
