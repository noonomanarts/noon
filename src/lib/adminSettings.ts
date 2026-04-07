export type GeneralAdminSettings = {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  defaultLocale: 'en' | 'ar';
  timezone: string;
  currency: string;
  headerColor: string;
  headerLogoUrl: string;
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

export type FooterAdminSocialIcon = 'instagram' | 'facebook' | 'tiktok' | 'youtube';

export type FooterAdminSocialLink = {
  icon: FooterAdminSocialIcon;
  labelEn: string;
  labelAr: string;
  href: string;
  enabled: boolean;
};

export type FooterAdminSettings = {
  footerColor: string;
  footerLogoUrl: string;
  copyrightText: string;
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

export type LoyaltyAdminSettings = {
  pointConversionRate: number; // OMR per point (default 0.05)
};

export const defaultLoyaltyAdminSettings: LoyaltyAdminSettings = {
  pointConversionRate: 0.05,
};

export const defaultGeneralAdminSettings: GeneralAdminSettings = {
  siteName: 'Noon',
  supportEmail: 'support@noonomanarts.com',
  supportPhone: '+96800000000',
  defaultLocale: 'en',
  timezone: 'Asia/Muscat',
  currency: 'OMR',
  headerColor: '#7b3f8d',
  headerLogoUrl: '/images/logo-noon.png',
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
  footerLogoUrl: '/images/logo-noon.png',
  copyrightText: '© {year} {brand}. All rights reserved.',
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
      icon: 'instagram',
      labelEn: 'Instagram',
      labelAr: 'إنستغرام',
      href: 'https://www.instagram.com/noon.omanarts',
      enabled: true,
    },
    {
      icon: 'facebook',
      labelEn: 'Facebook',
      labelAr: 'فيسبوك',
      href: 'https://www.facebook.com/noon.omanarts/',
      enabled: true,
    },
    {
      icon: 'tiktok',
      labelEn: 'TikTok',
      labelAr: 'تيك توك',
      href: 'https://www.tiktok.com/',
      enabled: false,
    },
    {
      icon: 'youtube',
      labelEn: 'YouTube',
      labelAr: 'يوتيوب',
      href: 'https://www.youtube.com/',
      enabled: false,
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

function sanitizeImagePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().slice(0, 500);
  if (!normalized) return fallback;
  if (!normalized.startsWith('/')) return fallback;
  if (normalized.includes('..')) return fallback;
  return normalized;
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
  const input = value && typeof value === 'object'
    ? (value as Partial<FooterAdminSocialLink> & { platform?: unknown })
    : {};
  const legacyPlatform = input.platform;
  const icon =
    input.icon === 'instagram' ||
    input.icon === 'facebook' ||
    input.icon === 'tiktok' ||
    input.icon === 'youtube'
      ? input.icon
      : legacyPlatform === 'instagram' ||
          legacyPlatform === 'facebook' ||
          legacyPlatform === 'tiktok' ||
          legacyPlatform === 'youtube'
        ? legacyPlatform
        : fallback.icon;
  return {
    icon,
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
    footerLogoUrl: sanitizeImagePath(source.footerLogoUrl, defaultFooterAdminSettings.footerLogoUrl),
    copyrightText: sanitizeTextValue(source.copyrightText, defaultFooterAdminSettings.copyrightText, 240),
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

export type WhatsAppTransactionTemplateKey =
  | 'class_booking_paid'
  | 'event_booking_paid'
  | 'wallet_topup_paid'
  | 'wallet_deposit'
  | 'wallet_points_conversion'
  | 'wallet_transfer_sent'
  | 'wallet_transfer_received'
  | 'withdrawal_request_submitted'
  | 'withdrawal_request_cancelled'
  | 'withdrawal_request_approved'
  | 'withdrawal_request_rejected'
  | 'wallet_admin_credit'
  | 'wallet_admin_deduct'
  | 'shop_purchase_paid';

export type WhatsAppTransactionTemplateItem = {
  enabled: boolean;
  en: string;
  ar: string;
};

export type WhatsAppTransactionTemplatesSettings = {
  enabled: boolean;
  templates: Record<WhatsAppTransactionTemplateKey, WhatsAppTransactionTemplateItem>;
};

export const defaultWhatsAppTransactionTemplatesSettings: WhatsAppTransactionTemplatesSettings = {
  enabled: true,
  templates: {
    class_booking_paid: {
      enabled: true,
      en: 'Hi {{name}}, your class booking is confirmed. Paid {{amount}} {{currency}} for {{classTitle}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم تأكيد حجزك للكلاس. تم دفع {{amount}} {{currency}} لـ {{classTitle}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    event_booking_paid: {
      enabled: true,
      en: 'Hi {{name}}, your event booking {{bookingNumber}} is paid successfully. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم دفع حجز الفعالية {{bookingNumber}} بنجاح. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_topup_paid: {
      enabled: true,
      en: 'Hi {{name}}, your wallet top-up {{reference}} was successful. Added: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تمت عملية شحن المحفظة {{reference}} بنجاح. تمت إضافة: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_deposit: {
      enabled: true,
      en: 'Hi {{name}}, a wallet deposit was added. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تمت إضافة إيداع للمحفظة. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_points_conversion: {
      enabled: true,
      en: 'Hi {{name}}, your points were converted to wallet credit. Added: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم تحويل نقاطك إلى رصيد في المحفظة. تمت إضافة: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_transfer_sent: {
      enabled: true,
      en: 'Hi {{name}}, you sent {{amount}} {{currency}} from your wallet. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، قمت بتحويل {{amount}} {{currency}} من محفظتك. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_transfer_received: {
      enabled: true,
      en: 'Hi {{name}}, you received {{amount}} {{currency}} in your wallet. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، استلمت {{amount}} {{currency}} في محفظتك. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    withdrawal_request_submitted: {
      enabled: true,
      en: 'Hi {{name}}, your withdrawal request was submitted. Amount: {{amount}} {{currency}}. Available balance: {{availableBalance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم إرسال طلب السحب الخاص بك. المبلغ: {{amount}} {{currency}}. الرصيد المتاح: {{availableBalance}} {{currency}}.',
    },
    withdrawal_request_cancelled: {
      enabled: true,
      en: 'Hi {{name}}, your withdrawal request was cancelled and funds were restored. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم إلغاء طلب السحب وإرجاع المبلغ. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    withdrawal_request_approved: {
      enabled: true,
      en: 'Hi {{name}}, your withdrawal request was approved. Amount: {{amount}} {{currency}}.',
      ar: 'مرحباً {{name}}، تمت الموافقة على طلب السحب الخاص بك. المبلغ: {{amount}} {{currency}}.',
    },
    withdrawal_request_rejected: {
      enabled: true,
      en: 'Hi {{name}}, your withdrawal request was rejected and funds were released. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم رفض طلب السحب وتم تحرير المبلغ. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_admin_credit: {
      enabled: true,
      en: 'Hi {{name}}, admin added credit to your wallet. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تمت إضافة رصيد إلى محفظتك من الإدارة. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    wallet_admin_deduct: {
      enabled: true,
      en: 'Hi {{name}}, admin deducted credit from your wallet. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم خصم رصيد من محفظتك من الإدارة. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    shop_purchase_paid: {
      enabled: true,
      en: 'Hi {{name}}, your shop order {{orderNumber}} was paid successfully. Amount: {{amount}} {{currency}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم دفع طلب المتجر {{orderNumber}} بنجاح. المبلغ: {{amount}} {{currency}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
  },
};

export function sanitizeWhatsAppTransactionTemplatesSettings(
  input: Partial<WhatsAppTransactionTemplatesSettings> | null | undefined
): WhatsAppTransactionTemplatesSettings {
  const source = input ?? {};
  const sourceTemplates = (source.templates ?? {}) as Partial<
    Record<WhatsAppTransactionTemplateKey, Partial<WhatsAppTransactionTemplateItem>>
  >;

  const templates = Object.entries(defaultWhatsAppTransactionTemplatesSettings.templates).reduce(
    (acc, [key, fallback]) => {
      const typedKey = key as WhatsAppTransactionTemplateKey;
      const raw = sourceTemplates[typedKey] ?? {};
      acc[typedKey] = {
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
        en: sanitizeTextValue(raw.en, fallback.en, 1500),
        ar: sanitizeTextValue(raw.ar, fallback.ar, 1500),
      };
      return acc;
    },
    {} as Record<WhatsAppTransactionTemplateKey, WhatsAppTransactionTemplateItem>
  );

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultWhatsAppTransactionTemplatesSettings.enabled,
    templates,
  };
}