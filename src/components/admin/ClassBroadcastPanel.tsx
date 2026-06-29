'use client';

import { useState } from 'react';
import { FiSend } from 'react-icons/fi';

type Props = {
  classId: string;
  locale: string;
};

export default function ClassBroadcastPanel({ classId, locale }: Props) {
  const isArabic = locale === 'ar';
  const [messageEn, setMessageEn] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!messageEn.trim() && !messageAr.trim()) {
      setError(isArabic ? 'الرسالة لا يمكن أن تكون فارغة.' : 'Message cannot be empty.');
      return;
    }
    setSending(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/classes/${classId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageEn, messageAr }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isArabic ? 'فشل الإرسال.' : 'Failed to send.'));
        return;
      }
      setFeedback(
        isArabic
          ? `تم الإرسال إلى ${data.sentCount} من ${data.recipientsCount} مشارك.`
          : `Sent to ${data.sentCount} of ${data.recipientsCount} participants.`
      );
      setMessageEn('');
      setMessageAr('');
    } catch {
      setError(isArabic ? 'فشل الإرسال.' : 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-teal-500/10 p-2 dark:bg-teal-500/20">
          <FiSend className="size-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isArabic ? 'إرسال رسالة لجميع المشاركين' : 'Send Message to All Participants'}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isArabic
              ? 'تُرسل عبر واتساب لكل مشارك مسجل بلغته المفضلة.'
              : 'Sent via WhatsApp to every registered participant in their preferred language.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isArabic ? 'الرسالة (إنجليزي)' : 'Message (English)'}
          </label>
          <textarea
            value={messageEn}
            onChange={(e) => setMessageEn(e.target.value)}
            rows={3}
            dir="ltr"
            className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {isArabic ? 'الرسالة (عربي)' : 'Message (Arabic)'}
          </label>
          <textarea
            value={messageAr}
            onChange={(e) => setMessageAr(e.target.value)}
            rows={3}
            dir="rtl"
            className="mt-1 w-full rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {feedback && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p>}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiSend className="size-4" />
          {sending ? (isArabic ? 'جارٍ الإرسال...' : 'Sending...') : isArabic ? 'إرسال' : 'Send'}
        </button>
      </div>
    </div>
  );
}
