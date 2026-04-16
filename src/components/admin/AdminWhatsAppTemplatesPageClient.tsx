'use client';

import { useMemo, useState } from 'react';
import {
  type WhatsAppTransactionTemplateKey,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/adminSettings';
import type { Locale } from '@/lib/locale';

const TEMPLATE_KEYS: WhatsAppTransactionTemplateKey[] = [
  'login_success',
  'class_booking_paid',
  'class_reminder',
  'class_review_request',
  'class_repeat_available',
  'event_booking_paid',
  'shop_purchase_paid',
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
];

export default function AdminWhatsAppTemplatesPageClient({
  locale,
  initialTemplates,
}: {
  locale: Locale;
  initialTemplates: WhatsAppTransactionTemplatesSettings;
}) {
  const isArabic = locale === 'ar';
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTransactionTemplatesSettings>(initialTemplates);

  const labels = useMemo<Record<WhatsAppTransactionTemplateKey, { en: string; ar: string }>>(
    () => ({
      login_success: { en: 'Login success', ar: 'نجاح تسجيل الدخول' },
      class_booking_paid: { en: 'Class booking paid', ar: 'دفع حجز كلاس' },
      class_reminder: { en: 'Workshop reminder', ar: 'تذكير الورشة' },
      class_review_request: { en: 'Workshop review request', ar: 'طلب تقييم الورشة' },
      class_repeat_available: { en: 'Repeat request available again', ar: 'توفر الورشة المطلوبة مجدداً' },
      event_booking_paid: { en: 'Event booking paid', ar: 'دفع حجز فعالية' },
      shop_purchase_paid: { en: 'Shop purchase paid', ar: 'دفع شراء من المتجر' },
      wallet_topup_paid: { en: 'Wallet top-up paid', ar: 'نجاح شحن المحفظة' },
      wallet_deposit: { en: 'Wallet deposit', ar: 'إيداع محفظة' },
      wallet_points_conversion: { en: 'Points conversion to wallet', ar: 'تحويل النقاط إلى المحفظة' },
      wallet_transfer_sent: { en: 'Transfer sent', ar: 'تحويل صادر' },
      wallet_transfer_received: { en: 'Transfer received', ar: 'تحويل وارد' },
      withdrawal_request_submitted: { en: 'Withdrawal submitted', ar: 'تقديم طلب سحب' },
      withdrawal_request_cancelled: { en: 'Withdrawal cancelled', ar: 'إلغاء طلب السحب' },
      withdrawal_request_approved: { en: 'Withdrawal approved', ar: 'الموافقة على السحب' },
      withdrawal_request_rejected: { en: 'Withdrawal rejected', ar: 'رفض السحب' },
      wallet_admin_credit: { en: 'Admin wallet credit', ar: 'إضافة رصيد بواسطة الإدارة' },
      wallet_admin_deduct: { en: 'Admin wallet deduction', ar: 'خصم رصيد بواسطة الإدارة' },
    }),
    []
  );

  const t = {
    title: isArabic ? 'تمبليتات رسائل واتساب التلقائية' : 'WhatsApp Automatic Message Templates',
    hint: isArabic
      ? 'عدّل نصوص رسائل واتساب التي تُرسل تلقائياً في النظام، بما فيها تذكير الورش وطلبات التقييم. يمكنك لصق الإيموجي مباشرة داخل الرسالة.'
      : 'Edit the WhatsApp messages sent automatically across the system, including workshop reminders and review requests. You can paste emojis directly into the message.',
    globalEnable: isArabic ? 'تفعيل الرسائل التلقائية' : 'Enable automatic messages',
    eventEnable: isArabic ? 'تفعيل هذا الحدث' : 'Enable this event',
    messageEn: isArabic ? 'النص (English)' : 'Message (English)',
    messageAr: isArabic ? 'النص (Arabic)' : 'Message (Arabic)',
    placeholders: isArabic
      ? 'المتغيرات المتاحة: {{name}} {{amount}} {{currency}} {{balance}} {{availableBalance}} {{reference}} {{bookingNumber}} {{orderNumber}} {{classTitle}} {{classDate}} {{classTime}} {{classUrl}}'
      : 'Available placeholders: {{name}} {{amount}} {{currency}} {{balance}} {{availableBalance}} {{reference}} {{bookingNumber}} {{orderNumber}} {{classTitle}} {{classDate}} {{classTime}} {{classUrl}}',
    save: isArabic ? 'حفظ التمبليتات' : 'Save Templates',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    saved: isArabic ? 'تم حفظ التمبليتات بنجاح.' : 'Templates saved successfully.',
    loadError: isArabic ? 'تعذر حفظ التمبليتات.' : 'Failed to save templates.',
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/whatsapp/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        templates?: WhatsAppTransactionTemplatesSettings;
        error?: string;
      };

      if (!response.ok || !payload.templates) {
        throw new Error(payload.error || t.loadError);
      }

      setTemplates(payload.templates);
      setInfo(t.saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.loadError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t.hint}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={templates.enabled}
            onChange={(event) =>
              setTemplates((prev) => ({
                ...prev,
                enabled: event.target.checked,
              }))
            }
            className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
          />
          {t.globalEnable}
        </label>
      </section>

      <div className="grid gap-4">
        {TEMPLATE_KEYS.map((key) => {
          const item = templates.templates[key];
          return (
            <section key={key} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {isArabic ? labels[key].ar : labels[key].en}
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      setTemplates((prev) => ({
                        ...prev,
                        templates: {
                          ...prev.templates,
                          [key]: {
                            ...prev.templates[key],
                            enabled: event.target.checked,
                          },
                        },
                      }))
                    }
                    className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                  />
                  {t.eventEnable}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.messageEn}</span>
                  <textarea
                    rows={5}
                    value={item.en}
                    onChange={(event) =>
                      setTemplates((prev) => ({
                        ...prev,
                        templates: {
                          ...prev.templates,
                          [key]: {
                            ...prev.templates[key],
                            en: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.messageAr}</span>
                  <textarea
                    rows={5}
                    value={item.ar}
                    onChange={(event) =>
                      setTemplates((prev) => ({
                        ...prev,
                        templates: {
                          ...prev.templates,
                          [key]: {
                            ...prev.templates[key],
                            ar: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    dir="rtl"
                  />
                </label>
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.placeholders}</p>
      </section>

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="inline-flex items-center justify-center rounded-xl bg-[color:var(--noon-teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? t.saving : t.save}
      </button>
    </div>
  );
}
