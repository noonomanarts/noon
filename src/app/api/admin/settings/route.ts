import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  defaultGeneralAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
  upsertAdminSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';

function sanitizeGeneralSettings(input: Partial<GeneralAdminSettings>): GeneralAdminSettings {
  return {
    siteName: (input.siteName ?? defaultGeneralAdminSettings.siteName).trim().slice(0, 120),
    supportEmail: (input.supportEmail ?? defaultGeneralAdminSettings.supportEmail).trim().slice(0, 180),
    supportPhone: (input.supportPhone ?? defaultGeneralAdminSettings.supportPhone).trim().slice(0, 40),
    defaultLocale: input.defaultLocale === 'ar' ? 'ar' : 'en',
    timezone: (input.timezone ?? defaultGeneralAdminSettings.timezone).trim().slice(0, 80),
    currency: (input.currency ?? defaultGeneralAdminSettings.currency).trim().slice(0, 10).toUpperCase(),
    maintenanceMode: Boolean(input.maintenanceMode),
    whatsappEnabled: Boolean(input.whatsappEnabled),
    bookingAutoConfirm: Boolean(input.bookingAutoConfirm),
    customerReminderHours: Math.min(72, Math.max(1, Number(input.customerReminderHours ?? defaultGeneralAdminSettings.customerReminderHours))),
    trainerReminderHours: Math.min(168, Math.max(1, Number(input.trainerReminderHours ?? defaultGeneralAdminSettings.trainerReminderHours))),
  };
}

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

    const saved = await getAdminSettingsByKey<GeneralAdminSettings>('general');
    const general = sanitizeGeneralSettings(saved ?? defaultGeneralAdminSettings);

    return NextResponse.json({ general });
  } catch (error) {
    console.error('Failed to load admin settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      general?: Partial<GeneralAdminSettings>;
    };

    const general = sanitizeGeneralSettings(body.general ?? {});

    await upsertAdminSettings({
      key: 'general',
      value: general,
      updatedByUserId: admin.id,
    });

    return NextResponse.json({ success: true, general });
  } catch (error) {
    console.error('Failed to update admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
