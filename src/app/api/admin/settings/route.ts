import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  defaultGeneralAdminSettings,
  defaultWhatsAppAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
  type WhatsAppAdminSettings,
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

function sanitizeWhatsAppSettings(input: Partial<WhatsAppAdminSettings>): WhatsAppAdminSettings {
  return {
    sendApiUrl: (input.sendApiUrl ?? defaultWhatsAppAdminSettings.sendApiUrl).trim().slice(0, 500),
    activeSession: (input.activeSession ?? defaultWhatsAppAdminSettings.activeSession).trim().slice(0, 120),
    apiCode: (input.apiCode ?? defaultWhatsAppAdminSettings.apiCode).trim().slice(0, 300),
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

    const [savedGeneral, savedWhatsApp] = await Promise.all([
      getAdminSettingsByKey<GeneralAdminSettings>('general'),
      getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp'),
    ]);

    const general = sanitizeGeneralSettings(savedGeneral ?? defaultGeneralAdminSettings);
    const whatsapp = sanitizeWhatsAppSettings(savedWhatsApp ?? defaultWhatsAppAdminSettings);

    return NextResponse.json({ general, whatsapp });
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
      whatsapp?: Partial<WhatsAppAdminSettings>;
    };

    const [currentGeneral, currentWhatsApp] = await Promise.all([
      getAdminSettingsByKey<GeneralAdminSettings>('general'),
      getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp'),
    ]);

    const mergedGeneralInput = body.general
      ? { ...(currentGeneral ?? defaultGeneralAdminSettings), ...body.general }
      : (currentGeneral ?? defaultGeneralAdminSettings);

    const mergedWhatsAppInput = body.whatsapp
      ? { ...(currentWhatsApp ?? defaultWhatsAppAdminSettings), ...body.whatsapp }
      : (currentWhatsApp ?? defaultWhatsAppAdminSettings);

    const general = sanitizeGeneralSettings(mergedGeneralInput);
    const whatsapp = sanitizeWhatsAppSettings(mergedWhatsAppInput);

    await Promise.all([
      upsertAdminSettings({
        key: 'general',
        value: general,
        updatedByUserId: admin.id,
      }),
      upsertAdminSettings({
        key: 'whatsapp',
        value: whatsapp,
        updatedByUserId: admin.id,
      }),
    ]);

    return NextResponse.json({ success: true, general, whatsapp });
  } catch (error) {
    console.error('Failed to update admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
