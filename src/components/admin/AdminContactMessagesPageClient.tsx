'use client';

import { useMemo, useState } from 'react';
import { FiMail, FiMessageSquare, FiPhone, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type ContactMessageItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

function buildMailto(email: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}

export default function AdminContactMessagesPageClient({
  locale,
  messages,
}: {
  locale: Locale;
  messages: ContactMessageItem[];
}) {
  const isArabic = locale === 'ar';
  const [selectedId, setSelectedId] = useState<string>(messages[0]?.id || '');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const t = {
    title: isArabic ? 'رسائل التواصل' : 'Contact Messages',
    empty: isArabic ? 'لا توجد رسائل حتى الآن' : 'No messages yet',
    name: isArabic ? 'الاسم' : 'Name',
    email: isArabic ? 'البريد' : 'Email',
    phone: isArabic ? 'الهاتف' : 'Phone',
    subject: isArabic ? 'الموضوع' : 'Subject',
    message: isArabic ? 'الرسالة' : 'Message',
    date: isArabic ? 'التاريخ' : 'Date',
    details: isArabic ? 'تفاصيل الرسالة' : 'Message Details',
    writeReply: isArabic ? 'اكتب الرد' : 'Write Reply',
    replySubject: isArabic ? 'عنوان الرد' : 'Reply Subject',
    replyBody: isArabic ? 'نص الرد' : 'Reply Body',
    openMailApp: isArabic ? 'فتح برنامج الإيميل للإرسال' : 'Open Email App to Send',
    selectMessage: isArabic ? 'اختر رسالة من القائمة لعرض التفاصيل والرد.' : 'Select a message from the list to view details and compose reply.',
  };

  const resolvedReplySubject =
    replySubject.trim() ||
    (selectedMessage
      ? isArabic
        ? `رد: ${selectedMessage.subject}`
        : `Re: ${selectedMessage.subject}`
      : '');

  const resolvedReplyBody =
    replyBody.trim() ||
    (selectedMessage
      ? isArabic
        ? `مرحباً ${selectedMessage.name},\n\nشكراً لتواصلك معنا بخصوص: ${selectedMessage.subject}.\n\n`
        : `Hello ${selectedMessage.name},\n\nThank you for contacting us regarding: ${selectedMessage.subject}.\n\n`
      : '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-400">
          {t.empty}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.name}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.subject}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.date}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {messages.map((msg) => {
                    const active = msg.id === selectedId;
                    return (
                      <tr
                        key={msg.id}
                        onClick={() => {
                          setSelectedId(msg.id);
                          setReplySubject(isArabic ? `رد: ${msg.subject}` : `Re: ${msg.subject}`);
                          setReplyBody('');
                        }}
                        className={`cursor-pointer transition-colors ${
                          active
                            ? 'bg-[color:var(--noon-teal-soft)]/40'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{msg.name}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{msg.subject}</td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                          {new Date(msg.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Muscat',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800/70 dark:bg-zinc-900">
            {!selectedMessage ? (
              <p className="py-10 text-sm text-zinc-500 dark:text-zinc-400">{t.selectMessage}</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.details}</h2>
                </div>

                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <FiUser className="size-4" />
                    <span className="font-semibold">{selectedMessage.name}</span>
                  </p>
                  <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <FiMail className="size-4" />
                    <span>{selectedMessage.email}</span>
                  </p>
                  <p className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <FiPhone className="size-4" />
                    <span>{selectedMessage.phone || '-'}</span>
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedMessage.subject}</p>
                  <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{selectedMessage.message}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.writeReply}</h3>

                  <label className="block space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.replySubject}</span>
                    <input
                      value={replySubject}
                      onChange={(event) => setReplySubject(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="block space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.replyBody}</span>
                    <textarea
                      rows={7}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <a
                    href={buildMailto(selectedMessage.email, resolvedReplySubject, resolvedReplyBody)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
                  >
                    <FiMessageSquare className="size-4" />
                    {t.openMailApp}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
