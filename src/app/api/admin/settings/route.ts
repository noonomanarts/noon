import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  defaultClassFinanceAdminSettings,
  defaultFooterAdminSettings,
  defaultGeneralAdminSettings,
  defaultLoyaltyAdminSettings,
  defaultWhatsAppFloatingButtonSettings,
  defaultWhatsAppAdminSettings,
  type ClassFinanceAdminSettings,
  type ClassFinanceCategorySettings,
  type FooterAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
  type LoyaltyAdminSettings,
  sanitizeFooterAdminSettings,
  type WhatsAppFloatingButtonIcon,
  type WhatsAppFloatingButtonSettings,
  type WhatsAppAdminSettings,
  upsertAdminSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';

function sanitizeHexColor(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return raw;
}

function sanitizeImagePath(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim().slice(0, 500) : '';
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.includes('..')) return fallback;
  return raw;
}

function sanitizeGeneralSettings(input: Partial<GeneralAdminSettings>): GeneralAdminSettings {
  return {
    siteName: (input.siteName ?? defaultGeneralAdminSettings.siteName).trim().slice(0, 120),
    supportEmail: (input.supportEmail ?? defaultGeneralAdminSettings.supportEmail).trim().slice(0, 180),
    supportPhone: (input.supportPhone ?? defaultGeneralAdminSettings.supportPhone).trim().slice(0, 40),
    defaultLocale: input.defaultLocale === 'ar' ? 'ar' : 'en',
    timezone: (input.timezone ?? defaultGeneralAdminSettings.timezone).trim().slice(0, 80),
    currency: (input.currency ?? defaultGeneralAdminSettings.currency).trim().slice(0, 10).toUpperCase(),
    headerColor: sanitizeHexColor(input.headerColor, defaultGeneralAdminSettings.headerColor),
    headerLogoUrl: sanitizeImagePath(input.headerLogoUrl, defaultGeneralAdminSettings.headerLogoUrl),
    maintenanceMode: Boolean(input.maintenanceMode),
    whatsappEnabled: Boolean(input.whatsappEnabled),
    bookingAutoConfirm: Boolean(input.bookingAutoConfirm),
    customerReminderHours: Math.min(72, Math.max(1, Number(input.customerReminderHours ?? defaultGeneralAdminSettings.customerReminderHours))),
    trainerReminderHours: Math.min(168, Math.max(1, Number(input.trainerReminderHours ?? defaultGeneralAdminSettings.trainerReminderHours))),
  };
}

function sanitizePhoneNumber(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return fallback;

  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\+/g, '').slice(0, 18);
    return digits ? `+${digits}` : fallback;
  }

  const digits = cleaned.replace(/\D/g, '').slice(0, 18);
  return digits || fallback;
}

function sanitizeWhatsAppIcon(value: unknown, fallback: WhatsAppFloatingButtonIcon): WhatsAppFloatingButtonIcon {
  if (value === 'whatsapp' || value === 'message' || value === 'phone') return value;
  return fallback;
}

function sanitizeWhatsAppFloatingButtonSettings(
  input: Partial<WhatsAppFloatingButtonSettings>
): WhatsAppFloatingButtonSettings {
  return {
    enabled: Boolean(input.enabled),
    phoneNumber: sanitizePhoneNumber(input.phoneNumber, defaultWhatsAppFloatingButtonSettings.phoneNumber),
    presetMessage: typeof input.presetMessage === 'string'
      ? input.presetMessage.trim().slice(0, 400)
      : defaultWhatsAppFloatingButtonSettings.presetMessage,
    buttonColor: sanitizeHexColor(input.buttonColor, defaultWhatsAppFloatingButtonSettings.buttonColor),
    iconColor: sanitizeHexColor(input.iconColor, defaultWhatsAppFloatingButtonSettings.iconColor),
    icon: sanitizeWhatsAppIcon(input.icon, defaultWhatsAppFloatingButtonSettings.icon),
    position: input.position === 'left' ? 'left' : 'right',
    sideOffsetPx: Math.min(80, Math.max(0, Math.trunc(Number(input.sideOffsetPx) || defaultWhatsAppFloatingButtonSettings.sideOffsetPx))),
    bottomOffsetPx: Math.min(120, Math.max(0, Math.trunc(Number(input.bottomOffsetPx) || defaultWhatsAppFloatingButtonSettings.bottomOffsetPx))),
    buttonSizePx: Math.min(96, Math.max(44, Math.trunc(Number(input.buttonSizePx) || defaultWhatsAppFloatingButtonSettings.buttonSizePx))),
    iconSizePx: Math.min(42, Math.max(16, Math.trunc(Number(input.iconSizePx) || defaultWhatsAppFloatingButtonSettings.iconSizePx))),
    showOnMobile: Boolean(input.showOnMobile),
    showOnDesktop: Boolean(input.showOnDesktop),
    pulseEffect: Boolean(input.pulseEffect),
  };
}

function sanitizeWhatsAppSettings(input: Partial<WhatsAppAdminSettings>): WhatsAppAdminSettings {
  return {
    sendApiUrl: (input.sendApiUrl ?? defaultWhatsAppAdminSettings.sendApiUrl).trim().slice(0, 500),
    activeSession: (input.activeSession ?? defaultWhatsAppAdminSettings.activeSession).trim().slice(0, 120),
    apiCode: (input.apiCode ?? defaultWhatsAppAdminSettings.apiCode).trim().slice(0, 300),
  };
}

function sanitizeCategorySettings(
  input: Partial<ClassFinanceCategorySettings>,
  fallback: ClassFinanceCategorySettings
): ClassFinanceCategorySettings {
  return {
    kitchenUsageRatePerHour: Math.max(0, Number(input.kitchenUsageRatePerHour ?? fallback.kitchenUsageRatePerHour) || 0),
    workshopContentRatePerParticipant: Math.max(
      0,
      Number(input.workshopContentRatePerParticipant ?? fallback.workshopContentRatePerParticipant) || 0
    ),
  };
}

function sanitizeClassFinanceSettings(input: Partial<ClassFinanceAdminSettings>): ClassFinanceAdminSettings {
  const tiersSource = Array.isArray(input.defaultTrainerShareTiers)
    ? input.defaultTrainerShareTiers
    : defaultClassFinanceAdminSettings.defaultTrainerShareTiers;

  const tiers = tiersSource
    .map((tier, index) => {
      if (!tier || typeof tier !== 'object') return null;
      const minParticipants = Math.max(0, Math.trunc(Number(tier.minParticipants ?? 0) || 0));
      const rawMax = tier.maxParticipants;
      const maxParticipants = rawMax === null || rawMax === undefined ? null : Math.max(minParticipants, Math.trunc(Number(rawMax) || 0));
      const percent = Math.min(100, Math.max(0, Number(tier.percent ?? 0) || 0));

      return {
        minParticipants,
        maxParticipants,
        percent: Number(percent.toFixed(2)),
        order: index,
      };
    })
    .filter((tier): tier is { minParticipants: number; maxParticipants: number | null; percent: number; order: number } => Boolean(tier))
    .sort((left, right) => left.minParticipants - right.minParticipants || left.order - right.order)
    .map((tier) => ({
      minParticipants: tier.minParticipants,
      maxParticipants: tier.maxParticipants,
      percent: tier.percent,
    }));

  return {
    cooking: sanitizeCategorySettings(input.cooking ?? {}, defaultClassFinanceAdminSettings.cooking),
    artsCrafts: sanitizeCategorySettings(input.artsCrafts ?? {}, defaultClassFinanceAdminSettings.artsCrafts),
    defaultTrainerShareTiers: tiers.length > 0 ? tiers : defaultClassFinanceAdminSettings.defaultTrainerShareTiers,
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

    const [savedGeneral, savedWhatsApp, savedClassFinance, savedWhatsAppFloatingButton, savedFooter, savedLoyalty] = await Promise.all([
      getAdminSettingsByKey<GeneralAdminSettings>('general'),
      getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp'),
      getAdminSettingsByKey<ClassFinanceAdminSettings>('class-finance'),
      getAdminSettingsByKey<WhatsAppFloatingButtonSettings>('whatsapp-floating-button'),
      getAdminSettingsByKey<FooterAdminSettings>('footer'),
      getAdminSettingsByKey<LoyaltyAdminSettings>('loyalty'),
    ]);

    const general = sanitizeGeneralSettings(savedGeneral ?? defaultGeneralAdminSettings);
    const whatsapp = sanitizeWhatsAppSettings(savedWhatsApp ?? defaultWhatsAppAdminSettings);
    const classFinance = sanitizeClassFinanceSettings(savedClassFinance ?? defaultClassFinanceAdminSettings);
    const whatsappFloatingButton = sanitizeWhatsAppFloatingButtonSettings(
      savedWhatsAppFloatingButton ?? defaultWhatsAppFloatingButtonSettings
    );
    const footer = sanitizeFooterAdminSettings(savedFooter ?? defaultFooterAdminSettings);
    const loyalty: LoyaltyAdminSettings = {
      pointConversionRate: Math.max(0.001, Math.min(1, Number(savedLoyalty?.pointConversionRate ?? defaultLoyaltyAdminSettings.pointConversionRate) || 0.05)),
    };

    return NextResponse.json({ general, whatsapp, classFinance, whatsappFloatingButton, footer, loyalty });
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
      classFinance?: Partial<ClassFinanceAdminSettings>;
      whatsappFloatingButton?: Partial<WhatsAppFloatingButtonSettings>;
      footer?: Partial<FooterAdminSettings>;
      loyalty?: Partial<LoyaltyAdminSettings>;
    };

    const [currentGeneral, currentWhatsApp, currentClassFinance, currentWhatsAppFloatingButton, currentFooter, currentLoyalty] = await Promise.all([
      getAdminSettingsByKey<GeneralAdminSettings>('general'),
      getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp'),
      getAdminSettingsByKey<ClassFinanceAdminSettings>('class-finance'),
      getAdminSettingsByKey<WhatsAppFloatingButtonSettings>('whatsapp-floating-button'),
      getAdminSettingsByKey<FooterAdminSettings>('footer'),
      getAdminSettingsByKey<LoyaltyAdminSettings>('loyalty'),
    ]);

    const mergedGeneralInput = body.general
      ? { ...(currentGeneral ?? defaultGeneralAdminSettings), ...body.general }
      : (currentGeneral ?? defaultGeneralAdminSettings);

    const mergedWhatsAppInput = body.whatsapp
      ? { ...(currentWhatsApp ?? defaultWhatsAppAdminSettings), ...body.whatsapp }
      : (currentWhatsApp ?? defaultWhatsAppAdminSettings);

    const mergedClassFinanceInput = body.classFinance
      ? { ...(currentClassFinance ?? defaultClassFinanceAdminSettings), ...body.classFinance }
      : (currentClassFinance ?? defaultClassFinanceAdminSettings);
    const mergedWhatsAppFloatingButtonInput = body.whatsappFloatingButton
      ? { ...(currentWhatsAppFloatingButton ?? defaultWhatsAppFloatingButtonSettings), ...body.whatsappFloatingButton }
      : (currentWhatsAppFloatingButton ?? defaultWhatsAppFloatingButtonSettings);
    const mergedFooterInput = body.footer
      ? { ...(currentFooter ?? defaultFooterAdminSettings), ...body.footer }
      : (currentFooter ?? defaultFooterAdminSettings);

    const general = sanitizeGeneralSettings(mergedGeneralInput);
    const whatsapp = sanitizeWhatsAppSettings(mergedWhatsAppInput);
    const classFinance = sanitizeClassFinanceSettings(mergedClassFinanceInput);
    const whatsappFloatingButton = sanitizeWhatsAppFloatingButtonSettings(mergedWhatsAppFloatingButtonInput);
    const footer = sanitizeFooterAdminSettings(mergedFooterInput);
    const loyalty: LoyaltyAdminSettings = {
      pointConversionRate: Math.max(
        0.001,
        Math.min(
          1,
          Number(body.loyalty?.pointConversionRate ?? currentLoyalty?.pointConversionRate ?? defaultLoyaltyAdminSettings.pointConversionRate) || 0.05
        )
      ),
    };

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
      upsertAdminSettings({
        key: 'class-finance',
        value: classFinance,
        updatedByUserId: admin.id,
      }),
      upsertAdminSettings({
        key: 'whatsapp-floating-button',
        value: whatsappFloatingButton,
        updatedByUserId: admin.id,
      }),
      upsertAdminSettings({
        key: 'footer',
        value: footer,
        updatedByUserId: admin.id,
      }),
      upsertAdminSettings({
        key: 'loyalty',
        value: loyalty,
        updatedByUserId: admin.id,
      }),
    ]);

    return NextResponse.json({ success: true, general, whatsapp, classFinance, whatsappFloatingButton, footer, loyalty });
  } catch (error) {
    console.error('Failed to update admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
