'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FiMessageSquare, FiSend } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'TRAINER' | 'CUSTOMER' | 'EMPLOYEE' | 'SOCIAL_MEDIA_ADMIN';
};

type SendResult = {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
};

export default function AdminWhatsAppPageClient({
  locale,
  users,
}: {
  locale: Locale;
  users: AdminUser[];
}) {
  const isArabic = locale === 'ar';
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'TRAINER' | 'ADMIN' | 'EMPLOYEE' | 'SOCIAL_MEDIA_ADMIN'>('CUSTOMER');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[]>([]);

  const t = {
    title: isArabic ? 'إرسال رسائل واتساب' : 'WhatsApp Broadcast',
    manageSessions: isArabic ? 'إدارة السشنات' : 'Manage Sessions',
    recipients: isArabic ? 'المستلمون' : 'Recipients',
    roleFilter: isArabic ? 'تصفية حسب الدور' : 'Role Filter',
    all: isArabic ? 'الكل' : 'All',
    customers: isArabic ? 'العملاء' : 'Customers',
    trainers: isArabic ? 'المدربون' : 'Trainers',
    admins: isArabic ? 'الإداريون' : 'Admins',
    employees: isArabic ? 'الموظفون' : 'Employees',
    socialMediaAdmins: isArabic ? 'مدراء السوشيال ميديا' : 'Social Media Admins',
    selectAll: isArabic ? 'تحديد الكل' : 'Select All',
    clearAll: isArabic ? 'إلغاء الكل' : 'Clear',
    textLabel: isArabic ? 'نص الرسالة' : 'Message Text',
    send: isArabic ? 'إرسال عبر واتساب' : 'Send via WhatsApp',
    sending: isArabic ? 'جارٍ الإرسال...' : 'Sending...',
    sentSummary: isArabic ? 'ملخص الإرسال' : 'Sending Summary',
    noUsers: isArabic ? 'لا يوجد مستخدمون مطابقون.' : 'No matching users found.',
    selectAtLeastOne: isArabic ? 'اختر مستلماً واحداً على الأقل.' : 'Select at least one recipient.',
  };

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((user) => user.role === roleFilter);
  }, [roleFilter, users]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map((user) => user.id));
  };

  const sendMessage = async () => {
    setError(null);
    setInfo(null);
    setResults([]);

    if (selectedUserIds.length === 0) {
      setError(t.selectAtLeastOne);
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          text,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: { total: number; sent: number; failed: number };
        results?: SendResult[];
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send WhatsApp message');
      }

      setInfo(
        `${t.sentSummary}: ${payload.summary?.sent ?? 0}/${payload.summary?.total ?? selectedUserIds.length}`
      );
      setResults(Array.isArray(payload.results) ? payload.results : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
      </div>

      <div>
        <Link
          href={`/${locale}/admin/whatsapp/sessions`}
          className="inline-flex items-center rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.manageSessions}
        </Link>
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.recipients}</h2>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="ALL">{t.all}</option>
                <option value="CUSTOMER">{t.customers}</option>
                <option value="TRAINER">{t.trainers}</option>
                <option value="EMPLOYEE">{t.employees}</option>
                <option value="SOCIAL_MEDIA_ADMIN">{t.socialMediaAdmins}</option>
                <option value="ADMIN">{t.admins}</option>
              </select>

              <button
                type="button"
                onClick={selectAllFiltered}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.selectAll}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.clearAll}
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noUsers}</p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {filteredUsers.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      checked
                        ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]/35'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(user.id)}
                      className="mt-1 size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.phoneNumber || '-'} • {user.email}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{user.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.textLabel}</span>
              <textarea
                rows={9}
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiMessageSquare className="size-4" />
              {sending ? t.sending : t.send}
              <FiSend className="size-4" />
            </button>
          </div>
        </section>
      </div>

      {results.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.sentSummary}</h3>
          <div className="space-y-1.5">
            {results.map((item) => (
              <p
                key={`${item.userId}-${item.name}`}
                className={`text-sm ${item.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}
              >
                {item.name}: {item.success ? 'OK' : item.error || 'Failed'}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
