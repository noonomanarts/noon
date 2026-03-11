'use client';

import { useState } from 'react';
import { FiDatabase, FiDollarSign, FiMessageSquare, FiSettings, FiShield, FiTool } from 'react-icons/fi';
import BackupSection from '@/components/admin/BackupSection';
import type { Locale } from '@/lib/locale';
import type { ClassFinanceAdminSettings, GeneralAdminSettings, WhatsAppAdminSettings } from '@/lib/db/adminSettings';

type TabId = 'general' | 'class-finance' | 'whatsapp' | 'backup';

export default function AdminSettingsPageClient({
  locale,
  initialGeneral,
  initialWhatsApp,
  initialClassFinance,
}: {
  locale: Locale;
  initialGeneral: GeneralAdminSettings;
  initialWhatsApp: WhatsAppAdminSettings;
  initialClassFinance: ClassFinanceAdminSettings;
}) {
  const isArabic = locale === 'ar';
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [general, setGeneral] = useState<GeneralAdminSettings>(initialGeneral);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAdminSettings>(initialWhatsApp);
  const [classFinance, setClassFinance] = useState<ClassFinanceAdminSettings>(initialClassFinance);

  const t = {
    title: isArabic ? 'إعدادات الإدارة' : 'Admin Settings',
    subtitle: isArabic
      ? 'تحكم كامل في الإعدادات العامة، مالية الكلاسات، والنسخ الاحتياطي.'
      : 'Centralized control for general configuration, class finance rules, and backup operations.',
    tabGeneral: isArabic ? 'الإعدادات العامة' : 'General Settings',
    tabClassFinance: isArabic ? 'مالية الكلاسات' : 'Class Finance',
    tabWhatsapp: isArabic ? 'إعدادات واتساب' : 'WhatsApp Settings',
    tabBackup: isArabic ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore',
    siteConfig: isArabic ? 'إعدادات المنصة' : 'Platform Configuration',
    operationsConfig: isArabic ? 'إعدادات التشغيل' : 'Operational Rules',
    siteName: isArabic ? 'اسم المنصة' : 'Site Name',
    supportEmail: isArabic ? 'بريد الدعم' : 'Support Email',
    supportPhone: isArabic ? 'رقم الدعم' : 'Support Phone',
    defaultLocale: isArabic ? 'اللغة الافتراضية' : 'Default Locale',
    timezone: isArabic ? 'المنطقة الزمنية' : 'Timezone',
    currency: isArabic ? 'العملة' : 'Currency',
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
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
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
              ['whatsapp', t.tabWhatsapp],
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
