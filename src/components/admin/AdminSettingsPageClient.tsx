'use client';

import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiDatabase, FiDollarSign, FiMessageCircle, FiMessageSquare, FiPhoneCall, FiSettings, FiShield, FiTool } from 'react-icons/fi';
import BackupSection from '@/components/admin/BackupSection';
import type { Locale } from '@/lib/locale';
import type {
  ClassFinanceAdminSettings,
  FooterAdminSettings,
  GeneralAdminSettings,
  WhatsAppAdminSettings,
  WhatsAppFloatingButtonSettings,
} from '@/lib/db/adminSettings';

type TabId = 'general' | 'class-finance' | 'footer' | 'whatsapp' | 'whatsapp-floating-button' | 'backup';

const NOON_HEADER_COLORS = [
  { key: 'coral', hex: '#f77d6b', labelEn: 'Coral', labelAr: 'كورال' },
  { key: 'coral-strong', hex: '#ef6b58', labelEn: 'Coral Strong', labelAr: 'كورال قوي' },
  { key: 'yellow', hex: '#f2cb56', labelEn: 'Yellow', labelAr: 'أصفر' },
  { key: 'yellow-strong', hex: '#e8be40', labelEn: 'Yellow Strong', labelAr: 'أصفر قوي' },
  { key: 'purple', hex: '#7b3f8d', labelEn: 'Purple', labelAr: 'بنفسجي' },
  { key: 'purple-strong', hex: '#6a347b', labelEn: 'Purple Strong', labelAr: 'بنفسجي قوي' },
  { key: 'teal', hex: '#17b0ad', labelEn: 'Teal', labelAr: 'فيروزي' },
  { key: 'teal-strong', hex: '#109d9a', labelEn: 'Teal Strong', labelAr: 'فيروزي قوي' },
] as const;

const WHATSAPP_ICON_OPTIONS = [
  { value: 'whatsapp', labelEn: 'WhatsApp', labelAr: 'واتساب' },
  { value: 'message', labelEn: 'Message Bubble', labelAr: 'فقاعة رسالة' },
  { value: 'phone', labelEn: 'Phone', labelAr: 'هاتف' },
] as const;

function normalizeHexColor(value: string, fallback = '#7b3f8d'): string {
  const input = value.trim().toLowerCase();
  const match = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return input;
}

function FloatingButtonIcon({
  icon,
  className,
  style,
}: {
  icon: WhatsAppFloatingButtonSettings['icon'];
  className?: string;
  style?: { width?: number; height?: number };
}) {
  if (icon === 'message') return <FiMessageCircle className={className} style={style} />;
  if (icon === 'phone') return <FiPhoneCall className={className} style={style} />;
  return <FaWhatsapp className={className} style={style} />;
}

export default function AdminSettingsPageClient({
  locale,
  initialGeneral,
  initialWhatsApp,
  initialClassFinance,
  initialWhatsAppFloatingButton,
  initialFooter,
}: {
  locale: Locale;
  initialGeneral: GeneralAdminSettings;
  initialWhatsApp: WhatsAppAdminSettings;
  initialClassFinance: ClassFinanceAdminSettings;
  initialWhatsAppFloatingButton: WhatsAppFloatingButtonSettings;
  initialFooter: FooterAdminSettings;
}) {
  const isArabic = locale === 'ar';
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [general, setGeneral] = useState<GeneralAdminSettings>(initialGeneral);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAdminSettings>(initialWhatsApp);
  const [classFinance, setClassFinance] = useState<ClassFinanceAdminSettings>(initialClassFinance);
  const [footer, setFooter] = useState<FooterAdminSettings>(initialFooter);
  const [whatsappFloatingButton, setWhatsAppFloatingButton] = useState<WhatsAppFloatingButtonSettings>(
    initialWhatsAppFloatingButton
  );

  const t = {
    title: isArabic ? 'إعدادات الإدارة' : 'Admin Settings',
    subtitle: isArabic
      ? 'تحكم كامل في الإعدادات العامة، مالية الكلاسات، والنسخ الاحتياطي.'
      : 'Centralized control for general configuration, class finance rules, and backup operations.',
    tabGeneral: isArabic ? 'الإعدادات العامة' : 'General Settings',
    tabClassFinance: isArabic ? 'مالية الكلاسات' : 'Class Finance',
    tabFooter: isArabic ? 'إعدادات الفوتر' : 'Footer Settings',
    tabWhatsapp: isArabic ? 'إعدادات واتساب' : 'WhatsApp Settings',
    tabWhatsappFloatingButton: isArabic ? 'زر واتساب العائم' : 'Floating WhatsApp Button',
    tabBackup: isArabic ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore',
    siteConfig: isArabic ? 'إعدادات المنصة' : 'Platform Configuration',
    operationsConfig: isArabic ? 'إعدادات التشغيل' : 'Operational Rules',
    siteName: isArabic ? 'اسم المنصة' : 'Site Name',
    supportEmail: isArabic ? 'بريد الدعم' : 'Support Email',
    supportPhone: isArabic ? 'رقم الدعم' : 'Support Phone',
    defaultLocale: isArabic ? 'اللغة الافتراضية' : 'Default Locale',
    timezone: isArabic ? 'المنطقة الزمنية' : 'Timezone',
    currency: isArabic ? 'العملة' : 'Currency',
    headerBranding: isArabic ? 'هوية ألوان الهيدر' : 'Header Branding',
    headerBrandingHint: isArabic
      ? 'اختر من جميع ألوان نون أو استخدم لونًا مخصصًا. هذا اللون يطبق مباشرة على هيدر الموقع.'
      : 'Choose from all Noon colors or set a custom color. This is applied directly to the site header.',
    headerColorSelected: isArabic ? 'اللون الحالي' : 'Current Color',
    customHeaderColor: isArabic ? 'لون مخصص (Hex)' : 'Custom Header Color (Hex)',
    customHeaderColorHint: isArabic ? 'مثال: #7b3f8d' : 'Example: #7b3f8d',
    customColorPicker: isArabic ? 'منتقي اللون' : 'Color Picker',
    maintenanceMode: isArabic ? 'وضع الصيانة' : 'Maintenance Mode',
    whatsappEnabled: isArabic ? 'تفعيل واتساب' : 'Enable WhatsApp',
    bookingAutoConfirm: isArabic ? 'تأكيد الحجوزات تلقائيًا' : 'Auto-confirm bookings',
    customerReminderHours: isArabic ? 'تذكير العملاء قبل (ساعة)' : 'Customer reminder (hours before)',
    trainerReminderHours: isArabic ? 'تذكير المدرب قبل (ساعة)' : 'Trainer reminder (hours before)',
    wahaConfig: isArabic ? 'إعدادات WAHA' : 'WAHA Configuration',
    wahaHint: isArabic
      ? 'أدخل رابط API الخاص بالإرسال، اسم السشن النشط، وكود API لخدمة WAHA.'
      : 'Enter the send API URL, active session name, and API code for your WAHA service.',
    classFinanceTitle: isArabic ? 'إعدادات مالية الكلاسات' : 'Class Finance Rules',
    classFinanceHint: isArabic
      ? 'حدّد تكاليف الكلاسات حسب الفئة، واضبط نسب المدربين الافتراضية حسب عدد المشاركين.'
      : 'Configure category-based class costs and default trainer payout percentages by participant count.',
    cookingClasses: isArabic ? 'كلاسات الطبخ' : 'Cooking Classes',
    artsClasses: isArabic ? 'كلاسات الفن' : 'Arts Classes',
    kitchenUsageRate: isArabic ? 'Kitchen Usage لكل ساعة' : 'Kitchen Usage per Hour',
    workshopContentRate: isArabic ? 'Workshop Content لكل مشارك' : 'Workshop Content per Participant',
    cookingHint: isArabic ? 'في الطبخ تُحسب تكلفة المطبخ ومحتوى الورشة.' : 'Cooking classes use both kitchen usage and workshop content costs.',
    artsHint: isArabic ? 'في الفن لا توجد تكلفة مطبخ، فقط محتوى الورشة.' : 'Arts classes do not use kitchen costs, only workshop content.',
    trainerDefaultTiers: isArabic ? 'النسب الافتراضية للمدربين' : 'Default Trainer Share Tiers',
    trainerDefaultHint: isArabic
      ? 'تستخدم هذه القيم تلقائياً إذا لم يتم تخصيص نسب مختلفة على ملف المدرب.'
      : 'These values are used automatically when a trainer does not have custom share tiers.',
    minParticipants: isArabic ? 'الحد الأدنى للمشاركين' : 'Min Participants',
    maxParticipants: isArabic ? 'الحد الأعلى للمشاركين' : 'Max Participants',
    percent: isArabic ? 'النسبة %' : 'Percent %',
    addTier: isArabic ? 'إضافة شريحة' : 'Add Tier',
    removeTier: isArabic ? 'حذف' : 'Remove',
    sendApiUrl: isArabic ? 'رابط API للإرسال' : 'Send API URL',
    activeSession: isArabic ? 'السشن النشط' : 'Active Session',
    apiCode: isArabic ? 'API Code' : 'API Code',
    floatingWidgetTitle: isArabic ? 'إعدادات زر واتساب العائم' : 'Floating WhatsApp Button Settings',
    floatingWidgetHint: isArabic
      ? 'تحكم كامل في ظهور الزر العائم على الصفحات العامة: التفعيل، الرقم، الألوان، الأيقونة، الحجم، والموقع.'
      : 'Full control of the floating button on public pages: visibility, phone number, colors, icon, size, and position.',
    floatingEnabled: isArabic ? 'تفعيل الزر العائم' : 'Enable Floating Button',
    floatingPhone: isArabic ? 'رقم واتساب' : 'WhatsApp Number',
    floatingMessage: isArabic ? 'رسالة افتراضية' : 'Default Message',
    floatingPosition: isArabic ? 'الموقع' : 'Position',
    floatingPositionRight: isArabic ? 'يمين' : 'Right',
    floatingPositionLeft: isArabic ? 'يسار' : 'Left',
    floatingButtonColor: isArabic ? 'لون الزر' : 'Button Color',
    floatingIconColor: isArabic ? 'لون الأيقونة' : 'Icon Color',
    floatingIcon: isArabic ? 'نوع الأيقونة' : 'Icon Type',
    floatingButtonSize: isArabic ? 'حجم الزر (px)' : 'Button Size (px)',
    floatingIconSize: isArabic ? 'حجم الأيقونة (px)' : 'Icon Size (px)',
    floatingSideOffset: isArabic ? 'مسافة جانبية (px)' : 'Side Offset (px)',
    floatingBottomOffset: isArabic ? 'مسافة من الأسفل (px)' : 'Bottom Offset (px)',
    floatingShowMobile: isArabic ? 'إظهار على الموبايل' : 'Show on Mobile',
    floatingShowDesktop: isArabic ? 'إظهار على الكمبيوتر' : 'Show on Desktop',
    floatingPulse: isArabic ? 'نبضة لافتة' : 'Pulse Effect',
    floatingPreview: isArabic ? 'معاينة مباشرة' : 'Live Preview',
    floatingPhoneHint: isArabic ? 'مثال: +96891234567' : 'Example: +96891234567',
    floatingMessageHint: isArabic
      ? 'تظهر هذه الرسالة تلقائياً عند فتح واتساب من الزر.'
      : 'This message is auto-filled when WhatsApp opens from the button.',
    footerEditorTitle: isArabic ? 'إعدادات الفوتر' : 'Footer Content Settings',
    footerEditorHint: isArabic
      ? 'تحكم كامل بكل محتوى الفوتر: النصوص، معلومات التواصل، الروابط، والسوشال.'
      : 'Manage all footer content: copy, contact information, links, and social items.',
    footerBrandSection: isArabic ? 'الهوية والنصوص' : 'Brand & Text',
    footerContactSection: isArabic ? 'معلومات التواصل' : 'Contact Details',
    footerLinksSection: isArabic ? 'روابط الفوتر' : 'Footer Links',
    footerSocialSection: isArabic ? 'روابط التواصل الاجتماعي' : 'Social Links',
    footerMetaSection: isArabic ? 'حقوق النشر' : 'Copyright Line',
    footerBrandName: isArabic ? 'اسم العلامة' : 'Brand Name',
    footerBrandSubtitle: isArabic ? 'وصف قصير تحت الاسم' : 'Brand Subtitle',
    footerTaglineEn: isArabic ? 'الوصف (English)' : 'Tagline (English)',
    footerTaglineAr: isArabic ? 'الوصف (Arabic)' : 'Tagline (Arabic)',
    footerBlurbEn: isArabic ? 'نص إضافي (English)' : 'Blurb (English)',
    footerBlurbAr: isArabic ? 'نص إضافي (Arabic)' : 'Blurb (Arabic)',
    footerLocationLabelEn: isArabic ? 'عنوان الموقع (English)' : 'Location Label (English)',
    footerLocationLabelAr: isArabic ? 'عنوان الموقع (Arabic)' : 'Location Label (Arabic)',
    footerPhoneLabelEn: isArabic ? 'عنوان الهاتف (English)' : 'Phone Label (English)',
    footerPhoneLabelAr: isArabic ? 'عنوان الهاتف (Arabic)' : 'Phone Label (Arabic)',
    footerEmailLabelEn: isArabic ? 'عنوان البريد (English)' : 'Email Label (English)',
    footerEmailLabelAr: isArabic ? 'عنوان البريد (Arabic)' : 'Email Label (Arabic)',
    footerLocationValue: isArabic ? 'الموقع الفعلي' : 'Location Value',
    footerPhoneValue: isArabic ? 'رقم الهاتف' : 'Phone Value',
    footerEmailValue: isArabic ? 'البريد الإلكتروني' : 'Email Value',
    footerNavigateTitleEn: isArabic ? 'عنوان التصفح (English)' : 'Navigate Title (English)',
    footerNavigateTitleAr: isArabic ? 'عنوان التصفح (Arabic)' : 'Navigate Title (Arabic)',
    footerLegalTitleEn: isArabic ? 'عنوان القانوني (English)' : 'Legal Title (English)',
    footerLegalTitleAr: isArabic ? 'عنوان القانوني (Arabic)' : 'Legal Title (Arabic)',
    footerFollowTitleEn: isArabic ? 'عنوان المتابعة (English)' : 'Follow Title (English)',
    footerFollowTitleAr: isArabic ? 'عنوان المتابعة (Arabic)' : 'Follow Title (Arabic)',
    footerRightsEn: isArabic ? 'جملة الحقوق (English)' : 'Rights Text (English)',
    footerRightsAr: isArabic ? 'جملة الحقوق (Arabic)' : 'Rights Text (Arabic)',
    footerCopyrightNameEn: isArabic ? 'اسم الحقوق (English)' : 'Copyright Name (English)',
    footerCopyrightNameAr: isArabic ? 'اسم الحقوق (Arabic)' : 'Copyright Name (Arabic)',
    footerNavLinks: isArabic ? 'روابط التصفح' : 'Navigate Links',
    footerLegalLinks: isArabic ? 'الروابط القانونية' : 'Legal Links',
    footerBottomLinks: isArabic ? 'روابط أسفل الفوتر' : 'Bottom Row Links',
    footerLinkLabelEn: isArabic ? 'العنوان EN' : 'Label EN',
    footerLinkLabelAr: isArabic ? 'العنوان AR' : 'Label AR',
    footerLinkHref: isArabic ? 'الرابط' : 'Href',
    footerLinkEnabled: isArabic ? 'إظهار' : 'Show',
    footerPlatform: isArabic ? 'المنصة' : 'Platform',
    footerPlatformInstagram: isArabic ? 'إنستغرام' : 'Instagram',
    footerPlatformFacebook: isArabic ? 'فيسبوك' : 'Facebook',
    save: isArabic ? 'حفظ الإعدادات' : 'Save Settings',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    saved: isArabic ? 'تم حفظ الإعدادات بنجاح.' : 'Settings saved successfully.',
    loadError: isArabic ? 'تعذر حفظ الإعدادات.' : 'Failed to save settings.',
    on: isArabic ? 'مفعل' : 'Enabled',
    off: isArabic ? 'معطل' : 'Disabled',
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ general }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        general?: GeneralAdminSettings;
        whatsapp?: WhatsAppAdminSettings;
        classFinance?: ClassFinanceAdminSettings;
        error?: string;
      };

      if (!response.ok || !payload.general) {
        throw new Error(payload.error || t.loadError);
      }

      setGeneral(payload.general);
      if (payload.whatsapp) setWhatsapp(payload.whatsapp);
      if (payload.classFinance) setClassFinance(payload.classFinance);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        whatsapp?: WhatsAppAdminSettings;
        error?: string;
      };

      if (!response.ok || !payload.whatsapp) {
        throw new Error(payload.error || t.loadError);
      }

      setWhatsapp(payload.whatsapp);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsAppFloatingButton = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappFloatingButton }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        whatsappFloatingButton?: WhatsAppFloatingButtonSettings;
        error?: string;
      };

      if (!response.ok || !payload.whatsappFloatingButton) {
        throw new Error(payload.error || t.loadError);
      }

      setWhatsAppFloatingButton(payload.whatsappFloatingButton);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClassFinance = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classFinance }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        classFinance?: ClassFinanceAdminSettings;
        error?: string;
      };

      if (!response.ok || !payload.classFinance) {
        throw new Error(payload.error || t.loadError);
      }

      setClassFinance(payload.classFinance);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFooter = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ footer }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        footer?: FooterAdminSettings;
        error?: string;
      };

      if (!response.ok || !payload.footer) {
        throw new Error(payload.error || t.loadError);
      }

      setFooter(payload.footer);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const updateFooterLink = (
    list: 'navLinks' | 'legalLinks' | 'bottomLinks',
    index: number,
    patch: Partial<FooterAdminSettings['navLinks'][number]>
  ) => {
    setFooter((prev) => {
      const next = prev[list].map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
      return { ...prev, [list]: next } as FooterAdminSettings;
    });
  };

  const updateFooterSocial = (
    index: number,
    patch: Partial<FooterAdminSettings['socialLinks'][number]>
  ) => {
    setFooter((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const updateTier = (index: number, key: 'minParticipants' | 'maxParticipants' | 'percent', value: number | null) => {
    setClassFinance((prev) => ({
      ...prev,
      defaultTrainerShareTiers: prev.defaultTrainerShareTiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, [key]: value } : tier
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]">
          <FiSettings className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">{error}</div> : null}
      {info ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">{info}</div> : null}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex gap-2 overflow-x-auto">
            {[
              ['general', t.tabGeneral],
              ['class-finance', t.tabClassFinance],
              ['footer', t.tabFooter],
              ['whatsapp', t.tabWhatsapp],
              ['whatsapp-floating-button', t.tabWhatsappFloatingButton],
              ['backup', t.tabBackup],
            ].map(([tabId, label]) => (
              <button key={tabId} type="button" onClick={() => setActiveTab(tabId as TabId)} className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${activeTab === tabId ? 'border-b-2 border-[color:var(--noon-teal)] text-[color:var(--noon-teal)]' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiTool className="size-4 text-[color:var(--noon-teal)]" />
                  <span>{t.siteConfig}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.siteName}</span><input value={general.siteName} onChange={(e) => setGeneral((prev) => ({ ...prev, siteName: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.currency}</span><input value={general.currency} onChange={(e) => setGeneral((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.supportEmail}</span><input type="email" value={general.supportEmail} onChange={(e) => setGeneral((prev) => ({ ...prev, supportEmail: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.supportPhone}</span><input value={general.supportPhone} onChange={(e) => setGeneral((prev) => ({ ...prev, supportPhone: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.defaultLocale}</span><select value={general.defaultLocale} onChange={(e) => setGeneral((prev) => ({ ...prev, defaultLocale: e.target.value as 'en' | 'ar' }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"><option value="en">English</option><option value="ar">العربية</option></select></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.timezone}</span><input value={general.timezone} onChange={(e) => setGeneral((prev) => ({ ...prev, timezone: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiSettings className="size-4 text-[color:var(--noon-purple)]" />
                  <span>{t.headerBranding}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.headerBrandingHint}</p>

                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.headerColorSelected}</span>
                    <span
                      className="inline-flex h-8 w-8 border border-black/10"
                      style={{ backgroundColor: normalizeHexColor(general.headerColor) }}
                      aria-hidden="true"
                    />
                    <code className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {normalizeHexColor(general.headerColor)}
                    </code>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {NOON_HEADER_COLORS.map((color) => {
                      const selected = normalizeHexColor(general.headerColor) === color.hex;
                      return (
                        <button
                          key={color.key}
                          type="button"
                          onClick={() => setGeneral((prev) => ({ ...prev, headerColor: color.hex }))}
                          className={`group rounded-lg border p-3 text-start transition ${
                            selected
                              ? 'border-[color:var(--noon-teal)] ring-2 ring-[color:var(--noon-teal)]/35'
                              : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
                          }`}
                        >
                          <span
                            className="mb-2 block h-9 w-full border border-black/10"
                            style={{ backgroundColor: color.hex }}
                            aria-hidden="true"
                          />
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {isArabic ? color.labelAr : color.labelEn}
                          </div>
                          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{color.hex}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr] md:items-end">
                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-600 dark:text-zinc-300">{t.customColorPicker}</span>
                      <input
                        type="color"
                        value={normalizeHexColor(general.headerColor)}
                        onChange={(e) => setGeneral((prev) => ({ ...prev, headerColor: normalizeHexColor(e.target.value) }))}
                        className="h-10 w-16 cursor-pointer border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-zinc-600 dark:text-zinc-300">{t.customHeaderColor}</span>
                      <input
                        value={general.headerColor}
                        onChange={(e) => setGeneral((prev) => ({ ...prev, headerColor: e.target.value }))}
                        onBlur={() =>
                          setGeneral((prev) => ({ ...prev, headerColor: normalizeHexColor(prev.headerColor) }))
                        }
                        placeholder="#7b3f8d"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.customHeaderColorHint}</p>
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><FiShield className="size-4 text-[color:var(--noon-teal)]" /><span>{t.operationsConfig}</span></div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['maintenanceMode', t.maintenanceMode],
                    ['whatsappEnabled', t.whatsappEnabled],
                    ['bookingAutoConfirm', t.bookingAutoConfirm],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                      <button type="button" onClick={() => setGeneral((prev) => ({ ...prev, [key]: !Boolean(prev[key as keyof GeneralAdminSettings]) }))} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${general[key as keyof GeneralAdminSettings] ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{general[key as keyof GeneralAdminSettings] ? t.on : t.off}</button>
                    </label>
                  ))}
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.customerReminderHours}</span><input type="number" min={1} max={72} value={general.customerReminderHours} onChange={(e) => setGeneral((prev) => ({ ...prev, customerReminderHours: Number(e.target.value || 1) }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.trainerReminderHours}</span><input type="number" min={1} max={168} value={general.trainerReminderHours} onChange={(e) => setGeneral((prev) => ({ ...prev, trainerReminderHours: Number(e.target.value || 1) }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                </div>
              </section>

              <div className="flex justify-end"><button type="button" onClick={() => void handleSaveGeneral()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? t.saving : t.save}</button></div>
            </div>
          ) : activeTab === 'class-finance' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><FiDollarSign className="size-4 text-[color:var(--noon-teal)]" /><span>{t.classFinanceTitle}</span></div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.classFinanceHint}</p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.cookingClasses}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.cookingHint}</p>
                    <div className="mt-4 grid gap-4">
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.kitchenUsageRate}</span><input type="number" min={0} step="0.001" value={classFinance.cooking.kitchenUsageRatePerHour} onChange={(e) => setClassFinance((prev) => ({ ...prev, cooking: { ...prev.cooking, kitchenUsageRatePerHour: Number(e.target.value || 0) } }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.workshopContentRate}</span><input type="number" min={0} step="0.001" value={classFinance.cooking.workshopContentRatePerParticipant} onChange={(e) => setClassFinance((prev) => ({ ...prev, cooking: { ...prev.cooking, workshopContentRatePerParticipant: Number(e.target.value || 0) } }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.artsClasses}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.artsHint}</p>
                    <div className="mt-4 grid gap-4">
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.kitchenUsageRate}</span><input type="number" min={0} step="0.001" value={classFinance.artsCrafts.kitchenUsageRatePerHour} onChange={(e) => setClassFinance((prev) => ({ ...prev, artsCrafts: { ...prev.artsCrafts, kitchenUsageRatePerHour: Number(e.target.value || 0) } }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.workshopContentRate}</span><input type="number" min={0} step="0.001" value={classFinance.artsCrafts.workshopContentRatePerParticipant} onChange={(e) => setClassFinance((prev) => ({ ...prev, artsCrafts: { ...prev.artsCrafts, workshopContentRatePerParticipant: Number(e.target.value || 0) } }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                    </div>
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><FiShield className="size-4 text-[color:var(--noon-teal)]" /><span>{t.trainerDefaultTiers}</span></div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.trainerDefaultHint}</p>
                <div className="space-y-3">
                  {classFinance.defaultTrainerShareTiers.map((tier, index) => (
                    <div key={`default-tier-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.minParticipants}</span><input type="number" min={0} value={tier.minParticipants} onChange={(e) => updateTier(index, 'minParticipants', Number(e.target.value || 0))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.maxParticipants}</span><input type="number" min={tier.minParticipants} value={tier.maxParticipants ?? ''} placeholder="∞" onChange={(e) => updateTier(index, 'maxParticipants', e.target.value === '' ? null : Number(e.target.value || 0))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                      <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.percent}</span><input type="number" min={0} max={100} step="0.01" value={tier.percent} onChange={(e) => updateTier(index, 'percent', Number(e.target.value || 0))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                      <div className="flex items-end"><button type="button" onClick={() => setClassFinance((prev) => ({ ...prev, defaultTrainerShareTiers: prev.defaultTrainerShareTiers.length > 1 ? prev.defaultTrainerShareTiers.filter((_, tierIndex) => tierIndex !== index) : prev.defaultTrainerShareTiers }))} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20">{t.removeTier}</button></div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setClassFinance((prev) => ({ ...prev, defaultTrainerShareTiers: [...prev.defaultTrainerShareTiers, { minParticipants: prev.defaultTrainerShareTiers.length > 0 ? ((prev.defaultTrainerShareTiers[prev.defaultTrainerShareTiers.length - 1].maxParticipants ?? prev.defaultTrainerShareTiers[prev.defaultTrainerShareTiers.length - 1].minParticipants) + 1) : 0, maxParticipants: null, percent: 0 }] }))} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">{t.addTier}</button>
                </div>
              </section>
              <div className="flex justify-end"><button type="button" onClick={() => void handleSaveClassFinance()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? t.saving : t.save}</button></div>
            </div>
          ) : activeTab === 'footer' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiSettings className="size-4 text-[color:var(--noon-teal)]" />
                  <span>{t.footerEditorTitle}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.footerEditorHint}</p>
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerBrandSection}</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerBrandName}</span>
                    <input value={footer.brandName} onChange={(e) => setFooter((prev) => ({ ...prev, brandName: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerBrandSubtitle}</span>
                    <input value={footer.brandSubtitle} onChange={(e) => setFooter((prev) => ({ ...prev, brandSubtitle: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerTaglineEn}</span>
                    <textarea rows={2} value={footer.taglineEn} onChange={(e) => setFooter((prev) => ({ ...prev, taglineEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerTaglineAr}</span>
                    <textarea rows={2} value={footer.taglineAr} onChange={(e) => setFooter((prev) => ({ ...prev, taglineAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerBlurbEn}</span>
                    <textarea rows={3} value={footer.blurbEn} onChange={(e) => setFooter((prev) => ({ ...prev, blurbEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.footerBlurbAr}</span>
                    <textarea rows={3} value={footer.blurbAr} onChange={(e) => setFooter((prev) => ({ ...prev, blurbAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerContactSection}</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerLocationLabelEn}</span><input value={footer.locationLabelEn} onChange={(e) => setFooter((prev) => ({ ...prev, locationLabelEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerLocationLabelAr}</span><input value={footer.locationLabelAr} onChange={(e) => setFooter((prev) => ({ ...prev, locationLabelAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerPhoneLabelEn}</span><input value={footer.phoneLabelEn} onChange={(e) => setFooter((prev) => ({ ...prev, phoneLabelEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerPhoneLabelAr}</span><input value={footer.phoneLabelAr} onChange={(e) => setFooter((prev) => ({ ...prev, phoneLabelAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerEmailLabelEn}</span><input value={footer.emailLabelEn} onChange={(e) => setFooter((prev) => ({ ...prev, emailLabelEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerEmailLabelAr}</span><input value={footer.emailLabelAr} onChange={(e) => setFooter((prev) => ({ ...prev, emailLabelAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerLocationValue}</span><input value={footer.locationValue} onChange={(e) => setFooter((prev) => ({ ...prev, locationValue: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerPhoneValue}</span><input value={footer.phoneValue} onChange={(e) => setFooter((prev) => ({ ...prev, phoneValue: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm md:col-span-2"><span className="text-zinc-600 dark:text-zinc-300">{t.footerEmailValue}</span><input value={footer.emailValue} onChange={(e) => setFooter((prev) => ({ ...prev, emailValue: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerMetaSection}</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerNavigateTitleEn}</span><input value={footer.navigateTitleEn} onChange={(e) => setFooter((prev) => ({ ...prev, navigateTitleEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerNavigateTitleAr}</span><input value={footer.navigateTitleAr} onChange={(e) => setFooter((prev) => ({ ...prev, navigateTitleAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerLegalTitleEn}</span><input value={footer.legalTitleEn} onChange={(e) => setFooter((prev) => ({ ...prev, legalTitleEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerLegalTitleAr}</span><input value={footer.legalTitleAr} onChange={(e) => setFooter((prev) => ({ ...prev, legalTitleAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerFollowTitleEn}</span><input value={footer.followTitleEn} onChange={(e) => setFooter((prev) => ({ ...prev, followTitleEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerFollowTitleAr}</span><input value={footer.followTitleAr} onChange={(e) => setFooter((prev) => ({ ...prev, followTitleAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerRightsEn}</span><input value={footer.rightsEn} onChange={(e) => setFooter((prev) => ({ ...prev, rightsEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerRightsAr}</span><input value={footer.rightsAr} onChange={(e) => setFooter((prev) => ({ ...prev, rightsAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerCopyrightNameEn}</span><input value={footer.copyrightNameEn} onChange={(e) => setFooter((prev) => ({ ...prev, copyrightNameEn: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.footerCopyrightNameAr}</span><input value={footer.copyrightNameAr} onChange={(e) => setFooter((prev) => ({ ...prev, copyrightNameAr: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerLinksSection}</div>
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerNavLinks}</h3>
                    <div className="space-y-3">
                      {footer.navLinks.map((item, index) => (
                        <div key={`footer-nav-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 md:grid-cols-[1fr_1fr_1.4fr_auto]">
                          <input value={item.labelEn} onChange={(e) => updateFooterLink('navLinks', index, { labelEn: e.target.value })} placeholder={t.footerLinkLabelEn} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.labelAr} onChange={(e) => updateFooterLink('navLinks', index, { labelAr: e.target.value })} placeholder={t.footerLinkLabelAr} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.href} onChange={(e) => updateFooterLink('navLinks', index, { href: e.target.value })} placeholder={t.footerLinkHref} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <label className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-700">
                            <span>{t.footerLinkEnabled}</span>
                            <button type="button" onClick={() => updateFooterLink('navLinks', index, { enabled: !item.enabled })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.enabled ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item.enabled ? t.on : t.off}</button>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerLegalLinks}</h3>
                    <div className="space-y-3">
                      {footer.legalLinks.map((item, index) => (
                        <div key={`footer-legal-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 md:grid-cols-[1fr_1fr_1.4fr_auto]">
                          <input value={item.labelEn} onChange={(e) => updateFooterLink('legalLinks', index, { labelEn: e.target.value })} placeholder={t.footerLinkLabelEn} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.labelAr} onChange={(e) => updateFooterLink('legalLinks', index, { labelAr: e.target.value })} placeholder={t.footerLinkLabelAr} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.href} onChange={(e) => updateFooterLink('legalLinks', index, { href: e.target.value })} placeholder={t.footerLinkHref} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <label className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-700">
                            <span>{t.footerLinkEnabled}</span>
                            <button type="button" onClick={() => updateFooterLink('legalLinks', index, { enabled: !item.enabled })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.enabled ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item.enabled ? t.on : t.off}</button>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerBottomLinks}</h3>
                    <div className="space-y-3">
                      {footer.bottomLinks.map((item, index) => (
                        <div key={`footer-bottom-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 md:grid-cols-[1fr_1fr_1.4fr_auto]">
                          <input value={item.labelEn} onChange={(e) => updateFooterLink('bottomLinks', index, { labelEn: e.target.value })} placeholder={t.footerLinkLabelEn} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.labelAr} onChange={(e) => updateFooterLink('bottomLinks', index, { labelAr: e.target.value })} placeholder={t.footerLinkLabelAr} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <input value={item.href} onChange={(e) => updateFooterLink('bottomLinks', index, { href: e.target.value })} placeholder={t.footerLinkHref} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                          <label className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-700">
                            <span>{t.footerLinkEnabled}</span>
                            <button type="button" onClick={() => updateFooterLink('bottomLinks', index, { enabled: !item.enabled })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.enabled ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item.enabled ? t.on : t.off}</button>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.footerSocialSection}</div>
                <div className="space-y-3">
                  {footer.socialLinks.map((item, index) => (
                    <div key={`footer-social-${index}`} className="grid gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 md:grid-cols-[0.75fr_1fr_1fr_1.4fr_auto]">
                      <select value={item.platform} onChange={(e) => updateFooterSocial(index, { platform: e.target.value === 'facebook' ? 'facebook' : 'instagram' })} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                        <option value="instagram">{t.footerPlatformInstagram}</option>
                        <option value="facebook">{t.footerPlatformFacebook}</option>
                      </select>
                      <input value={item.labelEn} onChange={(e) => updateFooterSocial(index, { labelEn: e.target.value })} placeholder={t.footerLinkLabelEn} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                      <input value={item.labelAr} onChange={(e) => updateFooterSocial(index, { labelAr: e.target.value })} placeholder={t.footerLinkLabelAr} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                      <input value={item.href} onChange={(e) => updateFooterSocial(index, { href: e.target.value })} placeholder={t.footerLinkHref} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                      <label className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-700">
                        <span>{t.footerLinkEnabled}</span>
                        <button type="button" onClick={() => updateFooterSocial(index, { enabled: !item.enabled })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.enabled ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>{item.enabled ? t.on : t.off}</button>
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-end">
                <button type="button" onClick={() => void handleSaveFooter()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          ) : activeTab === 'whatsapp' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><FiMessageSquare className="size-4 text-[color:var(--noon-teal)]" /><span>{t.wahaConfig}</span></div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.wahaHint}</p>
                <div className="grid gap-4">
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.sendApiUrl}</span><input value={whatsapp.sendApiUrl} onChange={(e) => setWhatsapp((prev) => ({ ...prev, sendApiUrl: e.target.value }))} placeholder="https://whatsapp.noonomanarts.com/" className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.activeSession}</span><input value={whatsapp.activeSession} onChange={(e) => setWhatsapp((prev) => ({ ...prev, activeSession: e.target.value }))} placeholder="default" className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                  <label className="space-y-1 text-sm"><span className="text-zinc-600 dark:text-zinc-300">{t.apiCode}</span><input type="password" value={whatsapp.apiCode} onChange={(e) => setWhatsapp((prev) => ({ ...prev, apiCode: e.target.value }))} placeholder="WAHA_API_KEY_OR_TOKEN" className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" /></label>
                </div>
              </section>
              <div className="flex justify-end"><button type="button" onClick={() => void handleSaveWhatsApp()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60">{saving ? t.saving : t.save}</button></div>
            </div>
          ) : activeTab === 'whatsapp-floating-button' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiMessageSquare className="size-4 text-[color:var(--noon-teal)]" />
                  <span>{t.floatingWidgetTitle}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.floatingWidgetHint}</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.floatingEnabled}</span>
                    <button
                      type="button"
                      onClick={() => setWhatsAppFloatingButton((prev) => ({ ...prev, enabled: !prev.enabled }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${whatsappFloatingButton.enabled ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
                    >
                      {whatsappFloatingButton.enabled ? t.on : t.off}
                    </button>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingPhone}</span>
                    <input
                      value={whatsappFloatingButton.phoneNumber}
                      onChange={(e) => setWhatsAppFloatingButton((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="+96891234567"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.floatingPhoneHint}</p>
                  </label>

                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingMessage}</span>
                    <textarea
                      rows={3}
                      value={whatsappFloatingButton.presetMessage}
                      onChange={(e) => setWhatsAppFloatingButton((prev) => ({ ...prev, presetMessage: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.floatingMessageHint}</p>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingPosition}</span>
                    <select
                      value={whatsappFloatingButton.position}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({
                          ...prev,
                          position: e.target.value === 'left' ? 'left' : 'right',
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="right">{t.floatingPositionRight}</option>
                      <option value="left">{t.floatingPositionLeft}</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingIcon}</span>
                    <select
                      value={whatsappFloatingButton.icon}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({
                          ...prev,
                          icon: (e.target.value as WhatsAppFloatingButtonSettings['icon']),
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      {WHATSAPP_ICON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {isArabic ? option.labelAr : option.labelEn}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingButtonSize}</span>
                    <input
                      type="number"
                      min={44}
                      max={96}
                      value={whatsappFloatingButton.buttonSizePx}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({ ...prev, buttonSizePx: Number(e.target.value || 44) }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingIconSize}</span>
                    <input
                      type="number"
                      min={16}
                      max={42}
                      value={whatsappFloatingButton.iconSizePx}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({ ...prev, iconSizePx: Number(e.target.value || 16) }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingSideOffset}</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={whatsappFloatingButton.sideOffsetPx}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({ ...prev, sideOffsetPx: Number(e.target.value || 0) }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingBottomOffset}</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={whatsappFloatingButton.bottomOffsetPx}
                      onChange={(e) =>
                        setWhatsAppFloatingButton((prev) => ({ ...prev, bottomOffsetPx: Number(e.target.value || 0) }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingButtonColor}</span>
                    <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end">
                      <input
                        type="color"
                        value={normalizeHexColor(whatsappFloatingButton.buttonColor, '#25d366')}
                        onChange={(e) =>
                          setWhatsAppFloatingButton((prev) => ({
                            ...prev,
                            buttonColor: normalizeHexColor(e.target.value, '#25d366'),
                          }))
                        }
                        className="h-10 w-16 cursor-pointer border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        value={whatsappFloatingButton.buttonColor}
                        onChange={(e) => setWhatsAppFloatingButton((prev) => ({ ...prev, buttonColor: e.target.value }))}
                        onBlur={() =>
                          setWhatsAppFloatingButton((prev) => ({
                            ...prev,
                            buttonColor: normalizeHexColor(prev.buttonColor, '#25d366'),
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.floatingIconColor}</span>
                    <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-end">
                      <input
                        type="color"
                        value={normalizeHexColor(whatsappFloatingButton.iconColor, '#ffffff')}
                        onChange={(e) =>
                          setWhatsAppFloatingButton((prev) => ({
                            ...prev,
                            iconColor: normalizeHexColor(e.target.value, '#ffffff'),
                          }))
                        }
                        className="h-10 w-16 cursor-pointer border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        value={whatsappFloatingButton.iconColor}
                        onChange={(e) => setWhatsAppFloatingButton((prev) => ({ ...prev, iconColor: e.target.value }))}
                        onBlur={() =>
                          setWhatsAppFloatingButton((prev) => ({
                            ...prev,
                            iconColor: normalizeHexColor(prev.iconColor, '#ffffff'),
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.floatingShowMobile}</span>
                    <button
                      type="button"
                      onClick={() => setWhatsAppFloatingButton((prev) => ({ ...prev, showOnMobile: !prev.showOnMobile }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${whatsappFloatingButton.showOnMobile ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
                    >
                      {whatsappFloatingButton.showOnMobile ? t.on : t.off}
                    </button>
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.floatingShowDesktop}</span>
                    <button
                      type="button"
                      onClick={() => setWhatsAppFloatingButton((prev) => ({ ...prev, showOnDesktop: !prev.showOnDesktop }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${whatsappFloatingButton.showOnDesktop ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
                    >
                      {whatsappFloatingButton.showOnDesktop ? t.on : t.off}
                    </button>
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.floatingPulse}</span>
                    <button
                      type="button"
                      onClick={() => setWhatsAppFloatingButton((prev) => ({ ...prev, pulseEffect: !prev.pulseEffect }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${whatsappFloatingButton.pulseEffect ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}
                    >
                      {whatsappFloatingButton.pulseEffect ? t.on : t.off}
                    </button>
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.floatingPreview}</p>
                  <div className="relative h-40 overflow-hidden border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="absolute inset-0 bg-[linear-gradient(145deg,#f8fafc_0%,#eef2ff_60%,#ecfeff_100%)] opacity-80 dark:bg-[linear-gradient(145deg,#0f172a_0%,#111827_60%,#082f49_100%)]" />
                    <div
                      className={`absolute ${whatsappFloatingButton.position === 'left' ? 'left-0' : 'right-0'} bottom-0`}
                      style={{
                        left: whatsappFloatingButton.position === 'left' ? whatsappFloatingButton.sideOffsetPx : undefined,
                        right: whatsappFloatingButton.position === 'right' ? whatsappFloatingButton.sideOffsetPx : undefined,
                        bottom: whatsappFloatingButton.bottomOffsetPx,
                      }}
                    >
                      <button
                        type="button"
                        className={`relative inline-flex items-center justify-center rounded-full shadow-[0_12px_26px_-14px_rgba(0,0,0,0.7)] ${whatsappFloatingButton.pulseEffect ? 'ring-8 ring-emerald-400/20' : ''}`}
                        style={{
                          width: whatsappFloatingButton.buttonSizePx,
                          height: whatsappFloatingButton.buttonSizePx,
                          backgroundColor: normalizeHexColor(whatsappFloatingButton.buttonColor, '#25d366'),
                          color: normalizeHexColor(whatsappFloatingButton.iconColor, '#ffffff'),
                        }}
                      >
                        <FloatingButtonIcon
                          icon={whatsappFloatingButton.icon}
                          className="shrink-0"
                          style={{ width: whatsappFloatingButton.iconSizePx, height: whatsappFloatingButton.iconSizePx }}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{whatsappFloatingButton.phoneNumber || '-'}</code>
                    <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{normalizeHexColor(whatsappFloatingButton.buttonColor, '#25d366')}</code>
                    <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{normalizeHexColor(whatsappFloatingButton.iconColor, '#ffffff')}</code>
                    <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{whatsappFloatingButton.position}</code>
                  </div>
                </div>
              </section>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveWhatsAppFloatingButton()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"><FiDatabase className="size-4 text-[color:var(--noon-teal)]" /><span>{t.tabBackup}</span></div>
              <BackupSection locale={locale} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
