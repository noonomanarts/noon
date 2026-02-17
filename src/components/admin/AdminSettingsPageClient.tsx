'use client';

import { useState } from 'react';
import { FiDatabase, FiSettings, FiShield, FiTool, FiMessageSquare } from 'react-icons/fi';
import BackupSection from '@/components/admin/BackupSection';
import type { Locale } from '@/lib/locale';
import type { GeneralAdminSettings, WhatsAppAdminSettings } from '@/lib/db/adminSettings';

type TabId = 'general' | 'whatsapp' | 'backup';

export default function AdminSettingsPageClient({
  locale,
  initialGeneral,
  initialWhatsApp,
}: {
  locale: Locale;
  initialGeneral: GeneralAdminSettings;
  initialWhatsApp: WhatsAppAdminSettings;
}) {
  const isArabic = locale === 'ar';
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [general, setGeneral] = useState<GeneralAdminSettings>(initialGeneral);
  const [whatsapp, setWhatsapp] = useState<WhatsAppAdminSettings>(initialWhatsApp);

  const t = {
    title: isArabic ? 'إعدادات الإدارة' : 'Admin Settings',
    subtitle: isArabic
      ? 'تحكم كامل في الإعدادات العامة والنسخ الاحتياطي والاستعادة.'
      : 'Centralized control for general configuration and backup/restore operations.',
    tabGeneral: isArabic ? 'الإعدادات العامة' : 'General Settings',
    tabWhatsapp: isArabic ? 'إعدادات واتساب' : 'WhatsApp Settings',
    tabBackup: isArabic ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore',
    siteConfig: isArabic ? 'إعدادات المنصة' : 'Platform Configuration',
    operationsConfig: isArabic ? 'إعدادات التشغيل' : 'Operational Rules',
    securityConfig: isArabic ? 'الأمان والتنبيهات' : 'Security & Notifications',
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
        error?: string;
      };

      if (!response.ok || !payload.general) {
        throw new Error(payload.error || t.loadError);
      }

      setGeneral(payload.general);
      if (payload.whatsapp) {
        setWhatsapp(payload.whatsapp);
      }
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

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                activeTab === 'general'
                  ? 'border-b-2 border-[color:var(--noon-teal)] text-[color:var(--noon-teal)]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {t.tabGeneral}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                activeTab === 'whatsapp'
                  ? 'border-b-2 border-[color:var(--noon-teal)] text-[color:var(--noon-teal)]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {t.tabWhatsapp}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`rounded-t-lg px-4 py-3 text-sm font-medium transition ${
                activeTab === 'backup'
                  ? 'border-b-2 border-[color:var(--noon-teal)] text-[color:var(--noon-teal)]'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {t.tabBackup}
            </button>
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
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.siteName}</span>
                    <input
                      value={general.siteName}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, siteName: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.currency}</span>
                    <input
                      value={general.currency}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.supportEmail}</span>
                    <input
                      type="email"
                      value={general.supportEmail}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, supportEmail: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.supportPhone}</span>
                    <input
                      value={general.supportPhone}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, supportPhone: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.defaultLocale}</span>
                    <select
                      value={general.defaultLocale}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, defaultLocale: e.target.value as 'en' | 'ar' }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.timezone}</span>
                    <input
                      value={general.timezone}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, timezone: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiShield className="size-4 text-[color:var(--noon-teal)]" />
                  <span>{t.operationsConfig}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.maintenanceMode}</span>
                    <button
                      type="button"
                      onClick={() => setGeneral((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        general.maintenanceMode
                          ? 'bg-[color:var(--noon-coral)]/15 text-[color:var(--noon-coral)]'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {general.maintenanceMode ? t.on : t.off}
                    </button>
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.whatsappEnabled}</span>
                    <button
                      type="button"
                      onClick={() => setGeneral((prev) => ({ ...prev, whatsappEnabled: !prev.whatsappEnabled }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        general.whatsappEnabled
                          ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal)]'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {general.whatsappEnabled ? t.on : t.off}
                    </button>
                  </label>

                  <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                    <span className="text-zinc-700 dark:text-zinc-300">{t.bookingAutoConfirm}</span>
                    <button
                      type="button"
                      onClick={() => setGeneral((prev) => ({ ...prev, bookingAutoConfirm: !prev.bookingAutoConfirm }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        general.bookingAutoConfirm
                          ? 'bg-[color:var(--noon-purple)]/15 text-[color:var(--noon-purple)]'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {general.bookingAutoConfirm ? t.on : t.off}
                    </button>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.customerReminderHours}</span>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={general.customerReminderHours}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, customerReminderHours: Number(e.target.value || 1) }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.trainerReminderHours}</span>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={general.trainerReminderHours}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, trainerReminderHours: Number(e.target.value || 1) }))}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveGeneral()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          ) : activeTab === 'whatsapp' ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FiMessageSquare className="size-4 text-[color:var(--noon-teal)]" />
                  <span>{t.wahaConfig}</span>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.wahaHint}</p>

                <div className="grid gap-4">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.sendApiUrl}</span>
                    <input
                      value={whatsapp.sendApiUrl}
                      onChange={(e) => setWhatsapp((prev) => ({ ...prev, sendApiUrl: e.target.value }))}
                      placeholder="https://whatsapp.noonomanarts.com/"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.activeSession}</span>
                    <input
                      value={whatsapp.activeSession}
                      onChange={(e) => setWhatsapp((prev) => ({ ...prev, activeSession: e.target.value }))}
                      placeholder="default"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.apiCode}</span>
                    <input
                      type="password"
                      value={whatsapp.apiCode}
                      onChange={(e) => setWhatsapp((prev) => ({ ...prev, apiCode: e.target.value }))}
                      placeholder="WAHA_API_KEY_OR_TOKEN"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveWhatsApp()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <FiDatabase className="size-4 text-[color:var(--noon-teal)]" />
                <span>{t.tabBackup}</span>
              </div>
              <BackupSection locale={locale} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
