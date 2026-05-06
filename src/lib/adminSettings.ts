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
    { labelEn: 'Classes', labelAr: 'الورش', href: '/classes', enabled: true },
    { labelEn: 'Group Events', labelAr: 'فعاليات المجموعات', href: '/group-booking-events', enabled: true },
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
  | 'login_success'
  | 'class_booking_paid'
  | 'class_booking_cancelled'
  | 'class_reminder'
  | 'class_cancelled_by_admin'
  | 'class_review_request'
  | 'class_repeat_available'
  | 'event_booking_paid'
  | 'event_booking_cancelled'
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
  | 'shop_purchase_paid'
  | 'shop_order_shipped'
  | 'shop_order_delivered'
  | 'trainer_workshop_assigned'
  | 'trainer_workshop_reminder'
  | 'welcome_message'
  | 'birthday_greeting';

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
    login_success: {
      enabled: true,
      en: 'Hi {{name}}, you have logged in successfully to your Noon account.',
      ar: 'مرحباً {{name}}، تم تسجيل دخولك إلى حساب Noon بنجاح.',
    },
    class_booking_paid: {
      enabled: true,
      en: 'Hi {{name}}, your class booking is confirmed. Paid {{amount}} {{currency}} for {{classTitle}}. Wallet balance: {{balance}} {{currency}}.',
      ar: 'مرحباً {{name}}، تم تأكيد حجزك للكلاس. تم دفع {{amount}} {{currency}} لـ {{classTitle}}. رصيد المحفظة الحالي: {{balance}} {{currency}}.',
    },
    class_reminder: {
      enabled: true,
      en: 'Hi {{name}}, this is a reminder that your workshop {{classTitle}} starts in 24 hours. Date: {{classDate}}. Time: {{classTime}}. {{classUrl}}',
      ar: 'مرحباً {{name}}، هذا تذكير بأن ورشتك {{classTitle}} تبدأ بعد 24 ساعة. التاريخ: {{classDate}}. الوقت: {{classTime}}. {{classUrl}}',
    },
    class_review_request: {
      enabled: true,
      en: 'Hi {{name}}, your workshop {{classTitle}} has just finished. We would love your feedback. You can reply to this message with your review, or open the workshop page here: {{classUrl}}',
      ar: 'مرحباً {{name}}، انتهت الآن ورشة {{classTitle}}. يسعدنا جداً سماع رأيك. يمكنك الرد على هذه الرسالة بمراجعتك، أو فتح صفحة الورشة من هنا: {{classUrl}}',
    },
    class_repeat_available: {
      enabled: true,
      en: 'Hi {{name}}, the workshop you asked us to repeat is now available again: {{classTitle}}. Book here: {{classUrl}}',
      ar: 'مرحباً {{name}}، الورشة التي طلبت إعادتها أصبحت متاحة مرة أخرى: {{classTitle}}. احجز من هنا: {{classUrl}}',
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
    class_booking_cancelled: {
      enabled: true,
      en: 'Hi {{name}}, your booking for {{classTitle}} has been cancelled. A credit of {{amount}} {{currency}} has been added to your wallet.',
      ar: 'مرحباً {{name}}، تم إلغاء حجزك لـ {{classTitle}}. تمت إضافة رصيد {{amount}} {{currency}} إلى محفظتك.',
    },
    class_cancelled_by_admin: {
      enabled: true,
      en: 'Hi {{name}}, unfortunately the class {{classTitle}} scheduled for {{classDate}} has been cancelled. A full refund of {{amount}} {{currency}} has been credited to your wallet. We apologise for the inconvenience.',
      ar: 'مرحباً {{name}}، للأسف تم إلغاء الكلاس {{classTitle}} المقرر في {{classDate}}. تم استرداد {{amount}} {{currency}} بالكامل إلى محفظتك. نعتذر عن الإزعاج.',
    },
    event_booking_cancelled: {
      enabled: true,
      en: 'Hi {{name}}, your event booking {{bookingNumber}} has been cancelled. Please contact us if you have any questions.',
      ar: 'مرحباً {{name}}، تم إلغاء حجز الفعالية {{bookingNumber}}. يرجى التواصل معنا إذا كان لديك أي استفسار.',
    },
    shop_order_shipped: {
      enabled: true,
      en: 'Hi {{name}}, your order {{orderNumber}} has been shipped and will arrive soon.',
      ar: 'مرحباً {{name}}، تم شحن طلبك {{orderNumber}} وسيصل قريباً.',
    },
    shop_order_delivered: {
      enabled: true,
      en: 'Hi {{name}}, your order {{orderNumber}} has been delivered. Thank you for shopping with Noon!',
      ar: 'مرحباً {{name}}، تم تسليم طلبك {{orderNumber}}. شكراً لتسوقك مع نون!',
    },
    trainer_workshop_assigned: {
      enabled: true,
      en: 'Hi {{name}}, you have been assigned to workshop {{classTitle}} on {{classDate}} at {{classTime}}. Please review your dashboard for details.',
      ar: 'مرحباً {{name}}، تم تعيينك لورشة {{classTitle}} في {{classDate}} الساعة {{classTime}}. يرجى مراجعة لوحة التحكم للاطلاع على التفاصيل.',
    },
    trainer_workshop_reminder: {
      enabled: true,
      en: 'Hi {{name}}, reminder: your workshop {{classTitle}} is tomorrow at {{classTime}}. Participants: {{participantsCount}}. Please be ready.',
      ar: 'مرحباً {{name}}، تذكير: ورشتك {{classTitle}} غداً الساعة {{classTime}}. عدد المشاركين: {{participantsCount}}. يرجى الاستعداد.',
    },
    welcome_message: {
      enabled: true,
      en: 'Welcome to Noon, {{name}}! Explore our classes, workshops and shop at {{siteUrl}}.',
      ar: 'مرحباً بك في نون، {{name}}! اكتشف كلاساتنا وورشاتنا ومتجرنا عبر {{siteUrl}}.',
    },
    birthday_greeting: {
      enabled: true,
      en: 'Happy birthday, {{name}}! 🎉 Enjoy {{discountPercent}}% off your next class with code {{couponCode}}. Valid until {{validUntil}}.',
      ar: 'عيد ميلاد سعيد، {{name}}! 🎉 استمتع بخصم {{discountPercent}}% على كلاسك القادم بالكود {{couponCode}}. ساري حتى {{validUntil}}.',
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

// =============================================================================
// Email Settings and Templates
// =============================================================================

export type EmailSettings = {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
};

export const defaultEmailSettings: EmailSettings = {
  enabled: true,
  smtpHost: 'smtp.zoho.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: 'info@noonomanarts.com',
  smtpPassword: 'ROKFvQ7rvH4Z',
  senderName: 'Noon',
  senderEmail: 'info@noonomanarts.com',
  replyToEmail: 'info@noonomanarts.com',
};

export function sanitizeEmailSettings(input: Partial<EmailSettings> | null | undefined): EmailSettings {
  const source = input ?? {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultEmailSettings.enabled,
    smtpHost: sanitizeTextValue(source.smtpHost, defaultEmailSettings.smtpHost, 200),
    smtpPort: typeof source.smtpPort === 'number' && source.smtpPort > 0 ? source.smtpPort : defaultEmailSettings.smtpPort,
    smtpSecure: typeof source.smtpSecure === 'boolean' ? source.smtpSecure : defaultEmailSettings.smtpSecure,
    smtpUser: sanitizeTextValue(source.smtpUser, defaultEmailSettings.smtpUser, 200),
    smtpPassword: typeof source.smtpPassword === 'string' ? source.smtpPassword : defaultEmailSettings.smtpPassword,
    senderName: sanitizeTextValue(source.senderName, defaultEmailSettings.senderName, 100),
    senderEmail: sanitizeTextValue(source.senderEmail, defaultEmailSettings.senderEmail, 200),
    replyToEmail: sanitizeTextValue(source.replyToEmail, defaultEmailSettings.replyToEmail, 200),
  };
}

export type EmailTransactionTemplateKey =
  | 'login_success'
  | 'class_booking_paid'
  | 'class_booking_cancelled'
  | 'class_reminder'
  | 'class_cancelled_by_admin'
  | 'event_booking_paid'
  | 'event_booking_cancelled'
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
  | 'shop_purchase_paid'
  | 'shop_order_shipped'
  | 'shop_order_delivered'
  | 'trainer_workshop_reminder'
  | 'trainer_workshop_assigned'
  | 'welcome_email'
  | 'password_reset'
  | 'birthday_greeting';

export type EmailTransactionTemplateItem = {
  enabled: boolean;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
};

export type EmailTransactionTemplatesSettings = {
  enabled: boolean;
  templates: Record<EmailTransactionTemplateKey, EmailTransactionTemplateItem>;
};

export const defaultEmailTransactionTemplatesSettings: EmailTransactionTemplatesSettings = {
  enabled: true,
  templates: {
    login_success: {
      enabled: false,
      subjectEn: 'Login Notification - Noon',
      subjectAr: 'إشعار تسجيل الدخول - نون',
      bodyEn: `<p>Hi {{name}},</p><p>You have successfully logged in to your Noon account.</p><p>If this wasn't you, please contact us immediately.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تسجيل دخولك إلى حساب نون بنجاح.</p><p>إذا لم تكن أنت، يرجى الاتصال بنا فوراً.</p>`,
    },
    class_booking_paid: {
      enabled: true,
      subjectEn: 'Booking Confirmed - {{classTitle}}',
      subjectAr: 'تأكيد الحجز - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your class booking has been confirmed!</p><p><strong>Class:</strong> {{classTitle}}<br><strong>Date:</strong> {{classDate}}<br><strong>Time:</strong> {{classTime}}<br><strong>Amount Paid:</strong> {{amount}} {{currency}}</p><p>We look forward to seeing you!</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تأكيد حجزك للكلاس!</p><p><strong>الكلاس:</strong> {{classTitle}}<br><strong>التاريخ:</strong> {{classDate}}<br><strong>الوقت:</strong> {{classTime}}<br><strong>المبلغ المدفوع:</strong> {{amount}} {{currency}}</p><p>نتطلع لرؤيتك!</p>`,
    },
    class_booking_cancelled: {
      enabled: true,
      subjectEn: 'Booking Cancelled - {{classTitle}}',
      subjectAr: 'إلغاء الحجز - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your booking for <strong>{{classTitle}}</strong> has been cancelled.</p><p>A credit of {{amount}} {{currency}} has been added to your wallet.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم إلغاء حجزك لـ <strong>{{classTitle}}</strong>.</p><p>تمت إضافة رصيد {{amount}} {{currency}} إلى محفظتك.</p>`,
    },
    class_reminder: {
      enabled: true,
      subjectEn: 'Reminder: Your Class Tomorrow - {{classTitle}}',
      subjectAr: 'تذكير: كلاسك غداً - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>This is a friendly reminder that your class <strong>{{classTitle}}</strong> is scheduled for tomorrow.</p><p><strong>Date:</strong> {{classDate}}<br><strong>Time:</strong> {{classTime}}<br><strong>Location:</strong> Noon Studio</p><p>We look forward to seeing you!</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>هذا تذكير بأن كلاسك <strong>{{classTitle}}</strong> مقرر غداً.</p><p><strong>التاريخ:</strong> {{classDate}}<br><strong>الوقت:</strong> {{classTime}}<br><strong>الموقع:</strong> استوديو نون</p><p>نتطلع لرؤيتك!</p>`,
    },
    class_cancelled_by_admin: {
      enabled: true,
      subjectEn: 'Class Cancelled - {{classTitle}}',
      subjectAr: 'تم إلغاء الكلاس - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>We regret to inform you that the class <strong>{{classTitle}}</strong> scheduled for {{classDate}} has been cancelled.</p><p>A full refund of {{amount}} {{currency}} has been credited to your wallet.</p><p>We apologize for any inconvenience.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>نأسف لإبلاغك بأن الكلاس <strong>{{classTitle}}</strong> المقرر في {{classDate}} قد تم إلغاؤه.</p><p>تم إضافة استرداد كامل بقيمة {{amount}} {{currency}} إلى محفظتك.</p><p>نعتذر عن أي إزعاج.</p>`,
    },
    event_booking_paid: {
      enabled: true,
      subjectEn: 'Event Booking Confirmed - {{bookingNumber}}',
      subjectAr: 'تأكيد حجز الفعالية - {{bookingNumber}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your event booking <strong>{{bookingNumber}}</strong> has been confirmed!</p><p><strong>Amount Paid:</strong> {{amount}} {{currency}}</p><p>Our team will contact you soon with more details.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تأكيد حجز الفعالية <strong>{{bookingNumber}}</strong>!</p><p><strong>المبلغ المدفوع:</strong> {{amount}} {{currency}}</p><p>سيتواصل فريقنا معك قريباً لمزيد من التفاصيل.</p>`,
    },
    event_booking_cancelled: {
      enabled: true,
      subjectEn: 'Event Booking Cancelled - {{bookingNumber}}',
      subjectAr: 'إلغاء حجز الفعالية - {{bookingNumber}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your event booking <strong>{{bookingNumber}}</strong> has been cancelled.</p><p>If you have any questions, please contact us.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم إلغاء حجز الفعالية <strong>{{bookingNumber}}</strong>.</p><p>إذا كان لديك أي استفسار، يرجى التواصل معنا.</p>`,
    },
    wallet_topup_paid: {
      enabled: true,
      subjectEn: 'Wallet Top-up Successful - {{reference}}',
      subjectAr: 'نجاح شحن المحفظة - {{reference}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your wallet top-up was successful!</p><p><strong>Reference:</strong> {{reference}}<br><strong>Amount Added:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تمت عملية شحن المحفظة بنجاح!</p><p><strong>المرجع:</strong> {{reference}}<br><strong>المبلغ المضاف:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_deposit: {
      enabled: true,
      subjectEn: 'Wallet Deposit Added',
      subjectAr: 'تمت إضافة إيداع للمحفظة',
      bodyEn: `<p>Hi {{name}},</p><p>A deposit has been added to your wallet.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تمت إضافة إيداع إلى محفظتك.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_points_conversion: {
      enabled: true,
      subjectEn: 'Points Converted to Wallet Credit',
      subjectAr: 'تم تحويل النقاط إلى رصيد المحفظة',
      bodyEn: `<p>Hi {{name}},</p><p>Your points have been converted to wallet credit!</p><p><strong>Amount Added:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تحويل نقاطك إلى رصيد في المحفظة!</p><p><strong>المبلغ المضاف:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_transfer_sent: {
      enabled: true,
      subjectEn: 'Wallet Transfer Sent',
      subjectAr: 'تم إرسال تحويل من المحفظة',
      bodyEn: `<p>Hi {{name}},</p><p>You have sent a wallet transfer.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>قمت بإرسال تحويل من محفظتك.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_transfer_received: {
      enabled: true,
      subjectEn: 'Wallet Transfer Received',
      subjectAr: 'تم استلام تحويل في المحفظة',
      bodyEn: `<p>Hi {{name}},</p><p>You have received a wallet transfer!</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>استلمت تحويلاً في محفظتك!</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    withdrawal_request_submitted: {
      enabled: true,
      subjectEn: 'Withdrawal Request Submitted',
      subjectAr: 'تم تقديم طلب السحب',
      bodyEn: `<p>Hi {{name}},</p><p>Your withdrawal request has been submitted and is pending review.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>Available Balance:</strong> {{availableBalance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تقديم طلب السحب الخاص بك وهو قيد المراجعة.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد المتاح:</strong> {{availableBalance}} {{currency}}</p>`,
    },
    withdrawal_request_cancelled: {
      enabled: true,
      subjectEn: 'Withdrawal Request Cancelled',
      subjectAr: 'تم إلغاء طلب السحب',
      bodyEn: `<p>Hi {{name}},</p><p>Your withdrawal request has been cancelled and the funds have been restored.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم إلغاء طلب السحب وتم إرجاع المبلغ.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    withdrawal_request_approved: {
      enabled: true,
      subjectEn: 'Withdrawal Request Approved',
      subjectAr: 'تمت الموافقة على طلب السحب',
      bodyEn: `<p>Hi {{name}},</p><p>Great news! Your withdrawal request has been approved.</p><p><strong>Amount:</strong> {{amount}} {{currency}}</p><p>The funds will be transferred to your account shortly.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>أخبار سارة! تمت الموافقة على طلب السحب الخاص بك.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}</p><p>سيتم تحويل المبلغ إلى حسابك قريباً.</p>`,
    },
    withdrawal_request_rejected: {
      enabled: true,
      subjectEn: 'Withdrawal Request Rejected',
      subjectAr: 'تم رفض طلب السحب',
      bodyEn: `<p>Hi {{name}},</p><p>Your withdrawal request has been rejected and the funds have been released back to your wallet.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم رفض طلب السحب وتم تحرير المبلغ إلى محفظتك.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_admin_credit: {
      enabled: true,
      subjectEn: 'Wallet Credit Added by Admin',
      subjectAr: 'تمت إضافة رصيد من الإدارة',
      bodyEn: `<p>Hi {{name}},</p><p>An admin has added credit to your wallet.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تمت إضافة رصيد إلى محفظتك من الإدارة.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    wallet_admin_deduct: {
      enabled: true,
      subjectEn: 'Wallet Deduction by Admin',
      subjectAr: 'تم خصم رصيد من الإدارة',
      bodyEn: `<p>Hi {{name}},</p><p>An admin has deducted credit from your wallet.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br><strong>New Balance:</strong> {{balance}} {{currency}}</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم خصم رصيد من محفظتك من الإدارة.</p><p><strong>المبلغ:</strong> {{amount}} {{currency}}<br><strong>الرصيد الجديد:</strong> {{balance}} {{currency}}</p>`,
    },
    shop_purchase_paid: {
      enabled: true,
      subjectEn: 'Order Confirmed - {{orderNumber}}',
      subjectAr: 'تأكيد الطلب - {{orderNumber}}',
      bodyEn: `<p>Hi {{name}},</p><p>Thank you for your order!</p><p><strong>Order Number:</strong> {{orderNumber}}<br><strong>Total:</strong> {{amount}} {{currency}}</p><p>We'll notify you when your order ships.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>شكراً لطلبك!</p><p><strong>رقم الطلب:</strong> {{orderNumber}}<br><strong>المجموع:</strong> {{amount}} {{currency}}</p><p>سنعلمك عندما يتم شحن طلبك.</p>`,
    },
    shop_order_shipped: {
      enabled: true,
      subjectEn: 'Order Shipped - {{orderNumber}}',
      subjectAr: 'تم شحن الطلب - {{orderNumber}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your order <strong>{{orderNumber}}</strong> has been shipped!</p><p>Track your delivery and expect it soon.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم شحن طلبك <strong>{{orderNumber}}</strong>!</p><p>تتبع طلبك وتوقعه قريباً.</p>`,
    },
    shop_order_delivered: {
      enabled: true,
      subjectEn: 'Order Delivered - {{orderNumber}}',
      subjectAr: 'تم تسليم الطلب - {{orderNumber}}',
      bodyEn: `<p>Hi {{name}},</p><p>Your order <strong>{{orderNumber}}</strong> has been delivered!</p><p>We hope you enjoy your purchase. Thank you for shopping with us!</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تسليم طلبك <strong>{{orderNumber}}</strong>!</p><p>نأمل أن تستمتع بمشترياتك. شكراً للتسوق معنا!</p>`,
    },
    trainer_workshop_reminder: {
      enabled: true,
      subjectEn: 'Workshop Reminder - {{classTitle}}',
      subjectAr: 'تذكير بالورشة - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>This is a reminder that you have a workshop scheduled.</p><p><strong>Workshop:</strong> {{classTitle}}<br><strong>Date:</strong> {{classDate}}<br><strong>Time:</strong> {{classTime}}<br><strong>Participants:</strong> {{participantsCount}}</p><p>Please review your materials and be ready!</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>هذا تذكير بأن لديك ورشة مقررة.</p><p><strong>الورشة:</strong> {{classTitle}}<br><strong>التاريخ:</strong> {{classDate}}<br><strong>الوقت:</strong> {{classTime}}<br><strong>المشاركون:</strong> {{participantsCount}}</p><p>يرجى مراجعة المواد والاستعداد!</p>`,
    },
    trainer_workshop_assigned: {
      enabled: true,
      subjectEn: 'New Workshop Assigned - {{classTitle}}',
      subjectAr: 'ورشة جديدة مكلف بها - {{classTitle}}',
      bodyEn: `<p>Hi {{name}},</p><p>You have been assigned to a new workshop!</p><p><strong>Workshop:</strong> {{classTitle}}<br><strong>Date:</strong> {{classDate}}<br><strong>Time:</strong> {{classTime}}</p><p>Please check your trainer dashboard for more details.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تم تكليفك بورشة جديدة!</p><p><strong>الورشة:</strong> {{classTitle}}<br><strong>التاريخ:</strong> {{classDate}}<br><strong>الوقت:</strong> {{classTime}}</p><p>يرجى التحقق من لوحة المدرب لمزيد من التفاصيل.</p>`,
    },
    welcome_email: {
      enabled: true,
      subjectEn: 'Welcome to Noon!',
      subjectAr: 'مرحباً بك في نون!',
      bodyEn: `<p>Hi {{name}},</p><p>Welcome to <strong>Noon</strong>! We're thrilled to have you join our community.</p><p>Explore our classes, workshops, and shop to discover amazing culinary and creative experiences.</p><p>If you have any questions, feel free to reach out to us!</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>أهلاً بك في <strong>نون</strong>! نحن سعداء بانضمامك إلى مجتمعنا.</p><p>استكشف كلاساتنا وورشاتنا ومتجرنا لاكتشاف تجارب طهي وإبداعية مذهلة.</p><p>إذا كان لديك أي استفسار، لا تتردد في التواصل معنا!</p>`,
    },
    password_reset: {
      enabled: true,
      subjectEn: 'Password Reset Request - Noon',
      subjectAr: 'طلب إعادة تعيين كلمة المرور - نون',
      bodyEn: `<p>Hi {{name}},</p><p>We received a request to reset your password.</p><p><a href="{{resetLink}}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Reset Password</a></p><p>If you didn't request this, please ignore this email.</p>`,
      bodyAr: `<p>مرحباً {{name}}،</p><p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p><p><a href="{{resetLink}}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">إعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب ذلك، يرجى تجاهل هذا البريد.</p>`,
    },
    birthday_greeting: {
      enabled: true,
      subjectEn: 'Happy Birthday from Noon, {{name}}! 🎉',
      subjectAr: 'عيد ميلاد سعيد من نون، {{name}}! 🎉',
      bodyEn: `<p>Happy Birthday, {{name}}!</p><p>As a gift, enjoy <strong>{{discountPercent}}% off</strong> your next class with code <code>{{couponCode}}</code> — valid until {{validUntil}}.</p><p>We can't wait to celebrate with you in the kitchen!</p>`,
      bodyAr: `<p>عيد ميلاد سعيد، {{name}}!</p><p>كهدية منا، استمتع بخصم <strong>{{discountPercent}}%</strong> على كلاسك القادم بالكود <code>{{couponCode}}</code> — ساري حتى {{validUntil}}.</p><p>لا نطيق الانتظار للاحتفال معك!</p>`,
    },
  },
};

export function sanitizeEmailTransactionTemplatesSettings(
  input: Partial<EmailTransactionTemplatesSettings> | null | undefined
): EmailTransactionTemplatesSettings {
  const source = input ?? {};
  const sourceTemplates = (source.templates ?? {}) as Partial<
    Record<EmailTransactionTemplateKey, Partial<EmailTransactionTemplateItem>>
  >;

  const templates = Object.entries(defaultEmailTransactionTemplatesSettings.templates).reduce(
    (acc, [key, fallback]) => {
      const typedKey = key as EmailTransactionTemplateKey;
      const raw = sourceTemplates[typedKey] ?? {};
      acc[typedKey] = {
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
        subjectEn: sanitizeTextValue(raw.subjectEn, fallback.subjectEn, 200),
        subjectAr: sanitizeTextValue(raw.subjectAr, fallback.subjectAr, 200),
        bodyEn: sanitizeTextValue(raw.bodyEn, fallback.bodyEn, 10000),
        bodyAr: sanitizeTextValue(raw.bodyAr, fallback.bodyAr, 10000),
      };
      return acc;
    },
    {} as Record<EmailTransactionTemplateKey, EmailTransactionTemplateItem>
  );

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultEmailTransactionTemplatesSettings.enabled,
    templates,
  };
}

// =============================================================================
// Invoice/Bill Template Settings
// =============================================================================

export type InvoiceTemplateSettings = {
  logoUrl: string;
  companyName: string;
  companyNameAr: string;
  companyAddress: string;
  companyAddressAr: string;
  companyPhone: string;
  companyEmail: string;
  taxNumber: string;
  bankName: string;
  bankAccount: string;
  bankIban: string;
  footerNotes: string;
  footerNotesAr: string;
  primaryColor: string;
  secondaryColor: string;
};

export const defaultInvoiceTemplateSettings: InvoiceTemplateSettings = {
  logoUrl: '/images/noon-logo.svg',
  companyName: 'Noon - Noonoman Arts',
  companyNameAr: 'نون - فنون النعمان',
  companyAddress: 'Muscat, Oman',
  companyAddressAr: 'مسقط، عمان',
  companyPhone: '+968 9999 9999',
  companyEmail: 'info@noonomanarts.com',
  taxNumber: '',
  bankName: '',
  bankAccount: '',
  bankIban: '',
  footerNotes: 'Thank you for your business!',
  footerNotesAr: 'شكراً لتعاملكم معنا!',
  primaryColor: '#14b8a6',
  secondaryColor: '#fb7185',
};

export function sanitizeInvoiceTemplateSettings(
  input: Partial<InvoiceTemplateSettings> | null | undefined
): InvoiceTemplateSettings {
  const source = input ?? {};
  return {
    logoUrl: sanitizeTextValue(source.logoUrl, defaultInvoiceTemplateSettings.logoUrl, 500),
    companyName: sanitizeTextValue(source.companyName, defaultInvoiceTemplateSettings.companyName, 200),
    companyNameAr: sanitizeTextValue(source.companyNameAr, defaultInvoiceTemplateSettings.companyNameAr, 200),
    companyAddress: sanitizeTextValue(source.companyAddress, defaultInvoiceTemplateSettings.companyAddress, 500),
    companyAddressAr: sanitizeTextValue(source.companyAddressAr, defaultInvoiceTemplateSettings.companyAddressAr, 500),
    companyPhone: sanitizeTextValue(source.companyPhone, defaultInvoiceTemplateSettings.companyPhone, 50),
    companyEmail: sanitizeTextValue(source.companyEmail, defaultInvoiceTemplateSettings.companyEmail, 200),
    taxNumber: sanitizeTextValue(source.taxNumber, defaultInvoiceTemplateSettings.taxNumber, 100),
    bankName: sanitizeTextValue(source.bankName, defaultInvoiceTemplateSettings.bankName, 200),
    bankAccount: sanitizeTextValue(source.bankAccount, defaultInvoiceTemplateSettings.bankAccount, 100),
    bankIban: sanitizeTextValue(source.bankIban, defaultInvoiceTemplateSettings.bankIban, 50),
    footerNotes: sanitizeTextValue(source.footerNotes, defaultInvoiceTemplateSettings.footerNotes, 1000),
    footerNotesAr: sanitizeTextValue(source.footerNotesAr, defaultInvoiceTemplateSettings.footerNotesAr, 1000),
    primaryColor: sanitizeTextValue(source.primaryColor, defaultInvoiceTemplateSettings.primaryColor, 20),
    secondaryColor: sanitizeTextValue(source.secondaryColor, defaultInvoiceTemplateSettings.secondaryColor, 20),
  };
}
