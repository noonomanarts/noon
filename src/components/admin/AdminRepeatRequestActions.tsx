'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMail, FiMessageSquare, FiSend } from 'react-icons/fi';

import AdminRenewClassButton from '@/components/admin/AdminRenewClassButton';

type Props = {
  classId: string;
  locale: 'en' | 'ar';
  classTitle: string;
  pendingCount: number;
  requestersCount: number;
};

export default function AdminRepeatRequestActions({
  classId,
  locale,
  classTitle,
  pendingCount,
  requestersCount,
}: Props) {
  const router = useRouter();
  const isArabic = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmailChannel, setSendEmailChannel] = useState(true);
  const [sendWhatsAppChannel, setSendWhatsAppChannel] = useState(true);
  const [subjectEn, setSubjectEn] = useState(`${classTitle} update from Noon`);
  const [subjectAr, setSubjectAr] = useState(`تحديث بخصوص ${classTitle}`);
  const [messageEn, setMessageEn] = useState(
    `We received your repeat request for ${classTitle}. We are reviewing demand and will update you as soon as a new schedule is confirmed.`
  );
  const [messageAr, setMessageAr] = useState(
    `استلمنا طلبك لإعادة ورشة ${classTitle}. نحن نراجع مستوى الطلب وسنقوم بتحديثك فور تأكيد موعد جديد.`
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    messageRequesters: isArabic ? 'إرسال رسالة للمهتمين' : 'Message Requesters',
    renewClass: isArabic ? 'رينيـو الصف' : 'Renew Class',
    modalTitle: isArabic ? 'إرسال تحديث لطلبة إعادة الورشة' : 'Send Repeat Request Update',
    pendingCount: isArabic ? 'الطلبات المعلقة' : 'Pending Requests',
    requesters: isArabic ? 'عدد المستلمين' : 'Recipients',
    subjectEn: isArabic ? 'عنوان البريد بالإنجليزية' : 'Email Subject in English',
    subjectAr: isArabic ? 'عنوان البريد بالعربية' : 'Email Subject in Arabic',
    messageEn: isArabic ? 'نص الرسالة بالإنجليزية' : 'Message in English',
    messageAr: isArabic ? 'نص الرسالة بالعربية' : 'Message in Arabic',
    emailChannel: isArabic ? 'إرسال عبر البريد' : 'Send by Email',
    whatsappChannel: isArabic ? 'إرسال عبر واتس‌اپ' : 'Send by WhatsApp',
    close: isArabic ? 'إغلاق' : 'Close',
    send: isArabic ? 'إرسال الآن' : 'Send Now',
    sending: isArabic ? 'جاري الإرسال...' : 'Sending...',
    success: isArabic ? 'تم إرسال التحديث بنجاح.' : 'Update sent successfully.',
    validation: isArabic ? 'اختر قناة واحدة على الأقل.' : 'Select at least one channel.',
  };

  async function sendUpdate() {
    if (sending) return;
    if (!sendEmailChannel && !sendWhatsAppChannel) {
      setError(t.validation);
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/repeat-request-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectEn,
          subjectAr,
          messageEn,
          messageAr,
          sendEmailChannel,
          sendWhatsAppChannel,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        emailedCount?: number;
        whatsappCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send update.');
      }

      setSuccess(
        isArabic
          ? `تم إرسال ${payload.emailedCount ?? 0} بريد و ${payload.whatsappCount ?? 0} رسالة واتس‌اپ.`
          : `Sent ${payload.emailedCount ?? 0} emails and ${payload.whatsappCount ?? 0} WhatsApp messages.`
      );
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send update.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 xl:w-[12.5rem] xl:flex-col xl:items-stretch">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <FiMessageSquare className="size-4" />
          {t.messageRequesters}
        </button>
        <AdminRenewClassButton
          classId={classId}
          locale={locale}
          label={t.renewClass}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.modalTitle}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{classTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {t.close}
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.pendingCount}</p>
                  <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{pendingCount}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.requesters}</p>
                  <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{requestersCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                  <input type="checkbox" checked={sendEmailChannel} onChange={(e) => setSendEmailChannel(e.target.checked)} />
                  <FiMail className="size-4" />
                  {t.emailChannel}
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                  <input type="checkbox" checked={sendWhatsAppChannel} onChange={(e) => setSendWhatsAppChannel(e.target.checked)} />
                  <FiMessageSquare className="size-4" />
                  {t.whatsappChannel}
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{t.subjectEn}</span>
                  <input value={subjectEn} onChange={(e) => setSubjectEn(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
                </label>
                <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{t.subjectAr}</span>
                  <input value={subjectAr} onChange={(e) => setSubjectAr(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" dir="rtl" />
                </label>
                <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{t.messageEn}</span>
                  <textarea value={messageEn} onChange={(e) => setMessageEn(e.target.value)} rows={6} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
                </label>
                <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">{t.messageAr}</span>
                  <textarea value={messageAr} onChange={(e) => setMessageAr(e.target.value)} rows={6} dir="rtl" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
                </label>
              </div>

              {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.close}
              </button>
              <button
                type="button"
                onClick={() => void sendUpdate()}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <FiSend className="size-4" />
                {sending ? t.sending : t.send}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}