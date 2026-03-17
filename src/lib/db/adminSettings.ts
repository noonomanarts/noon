import { pool } from './pool';

let adminSettingsTableReady = false;

export type GeneralAdminSettings = {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  defaultLocale: 'en' | 'ar';
  timezone: string;
  currency: string;
  headerColor: string;
  maintenanceMode: boolean;
  whatsappEnabled: boolean;
  bookingAutoConfirm: boolean;
  customerReminderHours: number;
  trainerReminderHours: number;
};

export type WhatsAppAdminSettings = {
  sendApiUrl: string;
  activeSession: string;
  apiCode: string;
};

export type WhatsAppFloatingButtonIcon = 'whatsapp' | 'message' | 'phone';

export type WhatsAppFloatingButtonSettings = {
  enabled: boolean;
  phoneNumber: string;
  presetMessage: string;
  buttonColor: string;
  iconColor: string;
  icon: WhatsAppFloatingButtonIcon;
  position: 'right' | 'left';
  sideOffsetPx: number;
  bottomOffsetPx: number;
  buttonSizePx: number;
  iconSizePx: number;
  showOnMobile: boolean;
  showOnDesktop: boolean;
  pulseEffect: boolean;
};

export type FooterAdminLink = {
  labelEn: string;
  labelAr: string;
  href: string;
  enabled: boolean;
};

export type FooterAdminSocialPlatform = 'instagram' | 'facebook';

export type FooterAdminSocialLink = {
  platform: FooterAdminSocialPlatform;
  labelEn: string;
  labelAr: string;
  href: string;
  enabled: boolean;
};

export type FooterAdminSettings = {
  footerColor: string;
  brandName: string;
  brandSubtitle: string;
  taglineEn: string;
  taglineAr: string;
  blurbEn: string;
  blurbAr: string;
  locationLabelEn: string;
  locationLabelAr: string;
  phoneLabelEn: string;
  phoneLabelAr: string;
  emailLabelEn: string;
  emailLabelAr: string;
  locationValue: string;
  phoneValue: string;
  emailValue: string;
  navigateTitleEn: string;
  navigateTitleAr: string;
  legalTitleEn: string;
  legalTitleAr: string;
  followTitleEn: string;
  followTitleAr: string;
  rightsEn: string;
  rightsAr: string;
  copyrightNameEn: string;
  copyrightNameAr: string;
  navLinks: FooterAdminLink[];
  legalLinks: FooterAdminLink[];
  bottomLinks: FooterAdminLink[];
  socialLinks: FooterAdminSocialLink[];
};

export type TrainerParticipantShareTier = {
  minParticipants: number;
  maxParticipants: number | null;
  percent: number;
};

export type ClassFinanceCategorySettings = {
  kitchenUsageRatePerHour: number;
  workshopContentRatePerParticipant: number;
};

export type ClassFinanceAdminSettings = {
  cooking: ClassFinanceCategorySettings;
  artsCrafts: ClassFinanceCategorySettings;
  defaultTrainerShareTiers: TrainerParticipantShareTier[];
};

export const defaultGeneralAdminSettings: GeneralAdminSettings = {
  siteName: 'Noon',
  supportEmail: 'support@noonomanarts.com',
  supportPhone: '+96800000000',
  defaultLocale: 'en',
  timezone: 'Asia/Muscat',
  currency: 'OMR',
  headerColor: '#7b3f8d',
  maintenanceMode: false,
  whatsappEnabled: true,
  bookingAutoConfirm: false,
  customerReminderHours: 6,
  trainerReminderHours: 24,
};

export const defaultWhatsAppAdminSettings: WhatsAppAdminSettings = {
  sendApiUrl: 'https://whatsapp.noonomanarts.com/',
  activeSession: 'default',
  apiCode: '',
};

export const defaultWhatsAppFloatingButtonSettings: WhatsAppFloatingButtonSettings = {
  enabled: true,
  phoneNumber: '+96800000000',
  presetMessage: 'Hello Noon team, I need help with booking.',
  buttonColor: '#25d366',
  iconColor: '#ffffff',
  icon: 'whatsapp',
  position: 'right',
  sideOffsetPx: 20,
  bottomOffsetPx: 20,
  buttonSizePx: 58,
  iconSizePx: 28,
  showOnMobile: true,
  showOnDesktop: true,
  pulseEffect: true,
};

export const defaultFooterAdminSettings: FooterAdminSettings = {
  footerColor: '#7b3f8d',
  brandName: 'Noon',
  brandSubtitle: 'Noon Oman Arts',
  taglineEn: 'Cooking and art experiences designed to be simple, inspiring, and memorable.',
  taglineAr: 'تجارب طبخ وفنون مصممة لتكون بسيطة، ممتعة، وملهمة.',
  blurbEn: 'Culinary classes, arts workshops, and private events crafted for families, teams, and communities.',
  blurbAr: 'ورش الطبخ والفنون والفعاليات الخاصة بتجربة متقنة للعائلات والفرق والمجتمع.',
  locationLabelEn: 'Location',
  locationLabelAr: 'الموقع',
  phoneLabelEn: 'Phone',
  phoneLabelAr: 'الهاتف',
  emailLabelEn: 'Email',
  emailLabelAr: 'البريد الإلكتروني',
  locationValue: 'https://maps.app.goo.gl/9KykbqJSMsxVrkdZA',
  phoneValue: '+968 98199508',
  emailValue: 'info@noonomanarts.com',
  navigateTitleEn: 'Navigate',
  navigateTitleAr: 'تصفح',
  legalTitleEn: 'Quick links',
  legalTitleAr: 'روابط سريعة',
  followTitleEn: 'Follow us',
  followTitleAr: 'تابعنا',
  rightsEn: 'All rights reserved.',
  rightsAr: 'جميع الحقوق محفوظة.',
  copyrightNameEn: 'Noon.',
  copyrightNameAr: 'نون.',
  navLinks: [
    { labelEn: 'Home', labelAr: 'الرئيسية', href: '/', enabled: true },
    { labelEn: 'About Us', labelAr: 'من نحن', href: '/about', enabled: true },
    { labelEn: 'Classes', labelAr: 'الدورات', href: '/classes', enabled: true },
    { labelEn: 'Group Events', labelAr: 'فعاليات المجموعات', href: '/group-booking-events', enabled: true },
    { labelEn: 'Noon Recommends', labelAr: 'توصيات نون', href: '/noon-recommends', enabled: true },
    { labelEn: 'Contact Us', labelAr: 'تواصل معنا', href: '/contact', enabled: true },
  ],
  legalLinks: [
    { labelEn: 'FAQs', labelAr: 'الأسئلة الشائعة', href: '/faqs', enabled: true },
    { labelEn: 'Terms & Conditions', labelAr: 'الشروط والأحكام', href: '/terms', enabled: true },
  ],
  bottomLinks: [
    { labelEn: 'FAQs', labelAr: 'الأسئلة الشائعة', href: '/faqs', enabled: true },
    { labelEn: 'Terms & Conditions', labelAr: 'الشروط والأحكام', href: '/terms', enabled: true },
    { labelEn: 'Contact Us', labelAr: 'تواصل معنا', href: '/contact', enabled: true },
  ],
  socialLinks: [
    {
      platform: 'instagram',
      labelEn: 'Instagram',
      labelAr: 'إنستغرام',
      href: 'https://www.instagram.com/noon.omanarts',
      enabled: true,
    },
    {
      platform: 'facebook',
      labelEn: 'Facebook',
      labelAr: 'فيسبوك',
      href: 'https://www.facebook.com/noon.omanarts/',
      enabled: true,
    },
  ],
};

export const defaultClassFinanceAdminSettings: ClassFinanceAdminSettings = {
  cooking: {
    kitchenUsageRatePerHour: 2.8,
    workshopContentRatePerParticipant: 0.2,
  },
  artsCrafts: {
    kitchenUsageRatePerHour: 0,
    workshopContentRatePerParticipant: 0.2,
  },
  defaultTrainerShareTiers: [
    {
      minParticipants: 0,
      maxParticipants: 11,
      percent: 25,
    },
    {
      minParticipants: 12,
      maxParticipants: null,
      percent: 30,
    },
  ],
};

function sanitizeTextValue(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

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

function sanitizeHrefValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 500);
  return normalized || fallback;
}

function sanitizeFooterLink(value: unknown, fallback: FooterAdminLink): FooterAdminLink {
  const input = value && typeof value === 'object' ? (value as Partial<FooterAdminLink>) : {};
  return {
    labelEn: sanitizeTextValue(input.labelEn, fallback.labelEn, 80),
    labelAr: sanitizeTextValue(input.labelAr, fallback.labelAr, 80),
    href: sanitizeHrefValue(input.href, fallback.href),
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
  };
}

function sanitizeFooterSocialLink(
  value: unknown,
  fallback: FooterAdminSocialLink
): FooterAdminSocialLink {
  const input = value && typeof value === 'object' ? (value as Partial<FooterAdminSocialLink>) : {};
  return {
    platform: input.platform === 'facebook' || input.platform === 'instagram' ? input.platform : fallback.platform,
    labelEn: sanitizeTextValue(input.labelEn, fallback.labelEn, 60),
    labelAr: sanitizeTextValue(input.labelAr, fallback.labelAr, 60),
    href: sanitizeHrefValue(input.href, fallback.href),
    enabled: typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
  };
}

export function sanitizeFooterAdminSettings(input: Partial<FooterAdminSettings> | null | undefined): FooterAdminSettings {
  const source = input ?? {};
  const sourceNavLinks = Array.isArray(source.navLinks) ? source.navLinks : [];
  const sourceLegalLinks = Array.isArray(source.legalLinks) ? source.legalLinks : [];
  const sourceBottomLinks = Array.isArray(source.bottomLinks) ? source.bottomLinks : [];
  const sourceSocialLinks = Array.isArray(source.socialLinks) ? source.socialLinks : [];

  return {
    footerColor: sanitizeHexColor(source.footerColor, defaultFooterAdminSettings.footerColor),
    brandName: sanitizeTextValue(source.brandName, defaultFooterAdminSettings.brandName, 80),
    brandSubtitle: sanitizeTextValue(source.brandSubtitle, defaultFooterAdminSettings.brandSubtitle, 120),
    taglineEn: sanitizeTextValue(source.taglineEn, defaultFooterAdminSettings.taglineEn, 240),
    taglineAr: sanitizeTextValue(source.taglineAr, defaultFooterAdminSettings.taglineAr, 240),
    blurbEn: sanitizeTextValue(source.blurbEn, defaultFooterAdminSettings.blurbEn, 320),
    blurbAr: sanitizeTextValue(source.blurbAr, defaultFooterAdminSettings.blurbAr, 320),
    locationLabelEn: sanitizeTextValue(source.locationLabelEn, defaultFooterAdminSettings.locationLabelEn, 50),
    locationLabelAr: sanitizeTextValue(source.locationLabelAr, defaultFooterAdminSettings.locationLabelAr, 50),
    phoneLabelEn: sanitizeTextValue(source.phoneLabelEn, defaultFooterAdminSettings.phoneLabelEn, 50),
    phoneLabelAr: sanitizeTextValue(source.phoneLabelAr, defaultFooterAdminSettings.phoneLabelAr, 50),
    emailLabelEn: sanitizeTextValue(source.emailLabelEn, defaultFooterAdminSettings.emailLabelEn, 50),
    emailLabelAr: sanitizeTextValue(source.emailLabelAr, defaultFooterAdminSettings.emailLabelAr, 50),
    locationValue: sanitizeTextValue(source.locationValue, defaultFooterAdminSettings.locationValue, 160),
    phoneValue: sanitizeTextValue(source.phoneValue, defaultFooterAdminSettings.phoneValue, 40),
    emailValue: sanitizeTextValue(source.emailValue, defaultFooterAdminSettings.emailValue, 180),
    navigateTitleEn: sanitizeTextValue(source.navigateTitleEn, defaultFooterAdminSettings.navigateTitleEn, 50),
    navigateTitleAr: sanitizeTextValue(source.navigateTitleAr, defaultFooterAdminSettings.navigateTitleAr, 50),
    legalTitleEn: sanitizeTextValue(source.legalTitleEn, defaultFooterAdminSettings.legalTitleEn, 50),
    legalTitleAr: sanitizeTextValue(source.legalTitleAr, defaultFooterAdminSettings.legalTitleAr, 50),
    followTitleEn: sanitizeTextValue(source.followTitleEn, defaultFooterAdminSettings.followTitleEn, 50),
    followTitleAr: sanitizeTextValue(source.followTitleAr, defaultFooterAdminSettings.followTitleAr, 50),
    rightsEn: sanitizeTextValue(source.rightsEn, defaultFooterAdminSettings.rightsEn, 120),
    rightsAr: sanitizeTextValue(source.rightsAr, defaultFooterAdminSettings.rightsAr, 120),
    copyrightNameEn: sanitizeTextValue(
      source.copyrightNameEn,
      defaultFooterAdminSettings.copyrightNameEn,
      70
    ),
    copyrightNameAr: sanitizeTextValue(
      source.copyrightNameAr,
      defaultFooterAdminSettings.copyrightNameAr,
      70
    ),
    navLinks: defaultFooterAdminSettings.navLinks.map((fallback, index) =>
      sanitizeFooterLink(sourceNavLinks[index], fallback)
    ),
    legalLinks: defaultFooterAdminSettings.legalLinks.map((fallback, index) =>
      sanitizeFooterLink(sourceLegalLinks[index], fallback)
    ),
    bottomLinks: defaultFooterAdminSettings.bottomLinks.map((fallback, index) =>
      sanitizeFooterLink(sourceBottomLinks[index], fallback)
    ),
    socialLinks: defaultFooterAdminSettings.socialLinks.map((fallback, index) =>
      sanitizeFooterSocialLink(sourceSocialLinks[index], fallback)
    ),
  };
}

async function ensureAdminSettingsTable(): Promise<void> {
  if (adminSettingsTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key VARCHAR(80) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC)`);

  adminSettingsTableReady = true;
}

export async function getAdminSettingsByKey<T>(key: string): Promise<T | null> {
  await ensureAdminSettingsTable();

  const result = await pool.query(
    `SELECT value
     FROM admin_settings
     WHERE key = $1
     LIMIT 1`,
    [key]
  );

  if (!result.rows[0]) return null;
  return result.rows[0].value as T;
}

export async function getAdminSettingsByPrefix<T>(prefix: string): Promise<Record<string, T>> {
  await ensureAdminSettingsTable();

  const result = await pool.query(
    `SELECT key, value
     FROM admin_settings
     WHERE key LIKE $1`,
    [`${prefix}%`]
  );

  const mapped: Record<string, T> = {};
  for (const row of result.rows) {
    mapped[row.key as string] = row.value as T;
  }

  return mapped;
}

export async function upsertAdminSettings<T>(input: {
  key: string;
  value: T;
  updatedByUserId?: string;
}): Promise<void> {
  await ensureAdminSettingsTable();

  await pool.query(
    `INSERT INTO admin_settings (key, value, updated_by_user_id, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET
       value = EXCLUDED.value,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at = NOW()`,
    [input.key, JSON.stringify(input.value), input.updatedByUserId ?? null]
  );
}
