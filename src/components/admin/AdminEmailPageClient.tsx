'use client';

import { useMemo, useState } from 'react';
import {
  type EmailSettings,
  type EmailTransactionTemplateKey,
  type EmailTransactionTemplatesSettings,
  type InvoiceTemplateSettings,
} from '@/lib/adminSettings';
import type { Locale } from '@/lib/locale';

const EMAIL_TEMPLATE_KEYS: EmailTransactionTemplateKey[] = [
  'login_success',
  'class_booking_paid',
  'class_booking_cancelled',
  'class_reminder',
  'class_cancelled_by_admin',
  'event_booking_paid',
  'event_booking_cancelled',
  'wallet_topup_paid',
  'wallet_deposit',
  'wallet_points_conversion',
  'wallet_transfer_sent',
  'wallet_transfer_received',
  'withdrawal_request_submitted',
  'withdrawal_request_cancelled',
  'withdrawal_request_approved',
  'withdrawal_request_rejected',
  'wallet_admin_credit',
  'wallet_admin_deduct',
  'shop_purchase_paid',
  'shop_order_shipped',
  'shop_order_delivered',
  'trainer_workshop_reminder',
  'trainer_workshop_assigned',
  'welcome_email',
  'password_reset',
];

type Tab = 'settings' | 'templates' | 'invoice';

export default function AdminEmailPageClient({
  locale,
  initialSettings,
  initialTemplates,
  initialInvoice,
}: {
  locale: Locale;
  initialSettings: EmailSettings;
  initialTemplates: EmailTransactionTemplatesSettings;
  initialInvoice: InvoiceTemplateSettings;
}) {
  const isArabic = locale === 'ar';
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [settings, setSettings] = useState<EmailSettings>(initialSettings);
  const [templates, setTemplates] = useState<EmailTransactionTemplatesSettings>(initialTemplates);
  const [invoice, setInvoice] = useState<InvoiceTemplateSettings>(initialInvoice);

  const [testEmail, setTestEmail] = useState('');

  const labels = useMemo<Record<EmailTransactionTemplateKey, { en: string; ar: string }>>(
    () => ({
      login_success: { en: 'Login success', ar: 'نجاح تسجيل الدخول' },
      class_booking_paid: { en: 'Class booking paid', ar: 'دفع حجز كلاس' },
      class_booking_cancelled: { en: 'Class booking cancelled', ar: 'إلغاء حجز كلاس' },
      class_reminder: { en: 'Class reminder', ar: 'تذكير بالكلاس' },
      class_cancelled_by_admin: { en: 'Class cancelled by admin', ar: 'إلغاء الكلاس بواسطة الإدارة' },
      event_booking_paid: { en: 'Event booking paid', ar: 'دفع حجز فعالية' },
      event_booking_cancelled: { en: 'Event booking cancelled', ar: 'إلغاء حجز فعالية' },
      wallet_topup_paid: { en: 'Wallet top-up paid', ar: 'نجاح شحن المحفظة' },
      wallet_deposit: { en: 'Wallet deposit', ar: 'إيداع محفظة' },
      wallet_points_conversion: { en: 'Points conversion', ar: 'تحويل النقاط' },
      wallet_transfer_sent: { en: 'Transfer sent', ar: 'تحويل صادر' },
      wallet_transfer_received: { en: 'Transfer received', ar: 'تحويل وارد' },
      withdrawal_request_submitted: { en: 'Withdrawal submitted', ar: 'تقديم طلب سحب' },
      withdrawal_request_cancelled: { en: 'Withdrawal cancelled', ar: 'إلغاء طلب السحب' },
      withdrawal_request_approved: { en: 'Withdrawal approved', ar: 'الموافقة على السحب' },
      withdrawal_request_rejected: { en: 'Withdrawal rejected', ar: 'رفض السحب' },
      wallet_admin_credit: { en: 'Admin wallet credit', ar: 'إضافة رصيد بواسطة الإدارة' },
      wallet_admin_deduct: { en: 'Admin wallet deduction', ar: 'خصم رصيد بواسطة الإدارة' },
      shop_purchase_paid: { en: 'Shop purchase paid', ar: 'دفع شراء من المتجر' },
      shop_order_shipped: { en: 'Shop order shipped', ar: 'تم شحن الطلب' },
      shop_order_delivered: { en: 'Shop order delivered', ar: 'تم توصيل الطلب' },
      trainer_workshop_reminder: { en: 'Trainer workshop reminder', ar: 'تذكير المدرب بالورشة' },
      trainer_workshop_assigned: { en: 'Trainer workshop assigned', ar: 'تعيين ورشة للمدرب' },
      welcome_email: { en: 'Welcome email', ar: 'رسالة ترحيب' },
      password_reset: { en: 'Password reset', ar: 'إعادة تعيين كلمة المرور' },
      birthday_greeting: { en: 'Birthday greeting', ar: 'تهنئة عيد الميلاد' },
    }),
    []
  );

  const t = {
    title: isArabic ? 'إعدادات البريد الإلكتروني' : 'Email Settings',
    tabSettings: isArabic ? 'إعدادات SMTP' : 'SMTP Settings',
    tabTemplates: isArabic ? 'تمبليتات الرسائل' : 'Message Templates',
    tabInvoice: isArabic ? 'تصميم الفاتورة' : 'Invoice Design',

    smtpHost: isArabic ? 'SMTP Host' : 'SMTP Host',
    smtpPort: isArabic ? 'SMTP Port' : 'SMTP Port',
    smtpSecure: isArabic ? 'استخدام SSL/TLS' : 'Use SSL/TLS',
    smtpUser: isArabic ? 'اسم المستخدم' : 'Username',
    smtpPass: isArabic ? 'كلمة المرور' : 'Password',
    senderEmail: isArabic ? 'بريد المرسل' : 'Sender Email',
    senderName: isArabic ? 'اسم المرسل' : 'Sender Name',
    testConnection: isArabic ? 'اختبار الاتصال' : 'Test Connection',
    sendTestEmail: isArabic ? 'إرسال بريد تجريبي' : 'Send Test Email',
    testEmailPlaceholder: isArabic ? 'أدخل البريد للاختبار' : 'Enter email for test',

    globalEnable: isArabic ? 'تفعيل الرسائل التلقائية' : 'Enable automatic emails',
    eventEnable: isArabic ? 'تفعيل هذا الحدث' : 'Enable this event',
    subjectEn: isArabic ? 'العنوان (English)' : 'Subject (English)',
    subjectAr: isArabic ? 'العنوان (Arabic)' : 'Subject (Arabic)',
    bodyEn: isArabic ? 'المحتوى (English)' : 'Body (English)',
    bodyAr: isArabic ? 'المحتوى (Arabic)' : 'Body (Arabic)',
    placeholders: isArabic
      ? 'المتغيرات: {{name}} {{amount}} {{currency}} {{balance}} {{reference}} {{bookingNumber}} {{orderNumber}} {{classTitle}}'
      : 'Placeholders: {{name}} {{amount}} {{currency}} {{balance}} {{reference}} {{bookingNumber}} {{orderNumber}} {{classTitle}}',

    companyName: isArabic ? 'اسم الشركة (EN)' : 'Company Name (EN)',
    companyNameAr: isArabic ? 'اسم الشركة (AR)' : 'Company Name (AR)',
    companyAddress: isArabic ? 'العنوان (EN)' : 'Address (EN)',
    companyAddressAr: isArabic ? 'العنوان (AR)' : 'Address (AR)',
    companyPhone: isArabic ? 'الهاتف' : 'Phone',
    companyEmail: isArabic ? 'البريد' : 'Email',
    taxNumber: isArabic ? 'الرقم الضريبي' : 'Tax Number',
    logoUrl: isArabic ? 'رابط الشعار' : 'Logo URL',
    primaryColor: isArabic ? 'اللون الرئيسي' : 'Primary Color',
    secondaryColor: isArabic ? 'اللون الثانوي' : 'Secondary Color',
    bankName: isArabic ? 'اسم البنك' : 'Bank Name',
    bankAccount: isArabic ? 'رقم الحساب' : 'Account Number',
    bankIban: isArabic ? 'IBAN' : 'IBAN',
    footerNotes: isArabic ? 'ملاحظات الفوتر (EN)' : 'Footer Notes (EN)',
    footerNotesAr: isArabic ? 'ملاحظات الفوتر (AR)' : 'Footer Notes (AR)',

    save: isArabic ? 'حفظ' : 'Save',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    saved: isArabic ? 'تم الحفظ بنجاح.' : 'Saved successfully.',
    loadError: isArabic ? 'تعذر الحفظ.' : 'Failed to save.',
    connectionSuccess: isArabic ? 'تم الاتصال بنجاح' : 'Connection successful',
    testSent: isArabic ? 'تم إرسال البريد التجريبي' : 'Test email sent',
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.loadError);

      setSettings(payload.settings);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const saveTemplates = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.loadError);

      setTemplates(payload.templates);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const saveInvoice = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t.loadError);

      setInvoice(payload.settings);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Connection failed');

      setInfo(t.connectionSuccess);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setError(isArabic ? 'أدخل بريد إلكتروني' : 'Enter an email address');
      return;
    }

    setTesting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-test', to: testEmail }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to send test email');

      setInfo(t.testSent);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: t.tabSettings },
    { key: 'templates', label: t.tabTemplates },
    { key: 'invoice', label: t.tabInvoice },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? 'border-b-2 border-[color:var(--noon-teal)] text-[color:var(--noon-teal)]'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* SMTP Settings Tab */}
      {tab === 'settings' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.smtpHost}
                </label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.smtpPort}
                </label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 465 })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.smtpUser}
                </label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.smtpPass}
                </label>
                <input
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.senderEmail}
                </label>
                <input
                  type="email"
                  value={settings.senderEmail}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.senderName}
                </label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.smtpSecure}
                  onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                  className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.smtpSecure}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {testing ? '...' : t.testConnection}
              </button>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={t.testEmailPlaceholder}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={testing}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {testing ? '...' : t.sendTestEmail}
              </button>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-xl bg-[color:var(--noon-teal)] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </section>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={templates.enabled}
                onChange={(e) => setTemplates({ ...templates, enabled: e.target.checked })}
                className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
              />
              {t.globalEnable}
            </label>
            <p className="mt-2 text-xs text-zinc-500">{t.placeholders}</p>
          </div>

          <div className="grid gap-4">
            {EMAIL_TEMPLATE_KEYS.map((key) => {
              const item = templates.templates[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {isArabic ? labels[key].ar : labels[key].en}
                    </span>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={item?.enabled ?? false}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            templates: {
                              ...templates.templates,
                              [key]: { ...item, enabled: e.target.checked },
                            },
                          })
                        }
                        className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                      />
                      {t.eventEnable}
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t.subjectEn}
                      </label>
                      <input
                        type="text"
                        value={item?.subjectEn || ''}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            templates: {
                              ...templates.templates,
                              [key]: { ...item, subjectEn: e.target.value },
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t.subjectAr}
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={item?.subjectAr || ''}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            templates: {
                              ...templates.templates,
                              [key]: { ...item, subjectAr: e.target.value },
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t.bodyEn}
                      </label>
                      <textarea
                        rows={4}
                        value={item?.bodyEn || ''}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            templates: {
                              ...templates.templates,
                              [key]: { ...item, bodyEn: e.target.value },
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {t.bodyAr}
                      </label>
                      <textarea
                        rows={4}
                        dir="rtl"
                        value={item?.bodyAr || ''}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            templates: {
                              ...templates.templates,
                              [key]: { ...item, bodyAr: e.target.value },
                            },
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={saveTemplates}
            disabled={saving}
            className="rounded-xl bg-[color:var(--noon-teal)] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </section>
      )}

      {/* Invoice Designer Tab */}
      {tab === 'invoice' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'معلومات الشركة' : 'Company Information'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyName}
                </label>
                <input
                  type="text"
                  value={invoice.companyName}
                  onChange={(e) => setInvoice({ ...invoice, companyName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyNameAr}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={invoice.companyNameAr}
                  onChange={(e) => setInvoice({ ...invoice, companyNameAr: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyAddress}
                </label>
                <input
                  type="text"
                  value={invoice.companyAddress}
                  onChange={(e) => setInvoice({ ...invoice, companyAddress: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyAddressAr}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={invoice.companyAddressAr}
                  onChange={(e) => setInvoice({ ...invoice, companyAddressAr: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyPhone}
                </label>
                <input
                  type="text"
                  value={invoice.companyPhone}
                  onChange={(e) => setInvoice({ ...invoice, companyPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.companyEmail}
                </label>
                <input
                  type="email"
                  value={invoice.companyEmail}
                  onChange={(e) => setInvoice({ ...invoice, companyEmail: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.taxNumber}
                </label>
                <input
                  type="text"
                  value={invoice.taxNumber}
                  onChange={(e) => setInvoice({ ...invoice, taxNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.logoUrl}
                </label>
                <input
                  type="text"
                  value={invoice.logoUrl}
                  onChange={(e) => setInvoice({ ...invoice, logoUrl: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'الألوان' : 'Colors'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.primaryColor}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={invoice.primaryColor}
                    onChange={(e) => setInvoice({ ...invoice, primaryColor: e.target.value })}
                    className="size-10 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    type="text"
                    value={invoice.primaryColor}
                    onChange={(e) => setInvoice({ ...invoice, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.secondaryColor}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={invoice.secondaryColor}
                    onChange={(e) => setInvoice({ ...invoice, secondaryColor: e.target.value })}
                    className="size-10 cursor-pointer rounded border border-zinc-300"
                  />
                  <input
                    type="text"
                    value={invoice.secondaryColor}
                    onChange={(e) => setInvoice({ ...invoice, secondaryColor: e.target.value })}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'معلومات البنك' : 'Bank Information'}
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.bankName}
                </label>
                <input
                  type="text"
                  value={invoice.bankName}
                  onChange={(e) => setInvoice({ ...invoice, bankName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.bankAccount}
                </label>
                <input
                  type="text"
                  value={invoice.bankAccount}
                  onChange={(e) => setInvoice({ ...invoice, bankAccount: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.bankIban}
                </label>
                <input
                  type="text"
                  value={invoice.bankIban}
                  onChange={(e) => setInvoice({ ...invoice, bankIban: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'ملاحظات الفوتر' : 'Footer Notes'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.footerNotes}
                </label>
                <textarea
                  rows={3}
                  value={invoice.footerNotes}
                  onChange={(e) => setInvoice({ ...invoice, footerNotes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.footerNotesAr}
                </label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={invoice.footerNotesAr}
                  onChange={(e) => setInvoice({ ...invoice, footerNotesAr: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveInvoice}
            disabled={saving}
            className="rounded-xl bg-[color:var(--noon-teal)] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </section>
      )}
    </div>
  );
}
