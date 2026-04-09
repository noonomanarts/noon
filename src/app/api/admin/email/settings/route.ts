import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import {
  defaultEmailSettings,
  sanitizeEmailSettings,
  type EmailSettings,
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
    const saved = await getAdminSettingsByKey<EmailSettings>('email-settings');
    const settings = sanitizeEmailSettings(saved ?? defaultEmailSettings);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch email settings' },
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
    const settings = sanitizeEmailSettings(body);
    await upsertAdminSettings({
      key: 'email-settings',
      value: settings,
      updatedByUserId: admin.id,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save email settings' },
      { status: 500 }
    );
  }
}
