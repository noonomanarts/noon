'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiLoader, FiPlus, FiRefreshCw, FiShield, FiSmartphone } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type SessionStatus =
  | 'not_initialized'
  | 'initializing'
  | 'qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'auth_failure'
  | 'error';

type SessionItem = {
  sessionId: string;
  isPrimary: boolean;
  status: SessionStatus;
  qrCodeDataUrl: string | null;
  lastError: string | null;
  updatedAt: string;
};

type SessionsResponse = {
  success?: boolean;
  error?: string;
  sessions?: SessionItem[];
  primarySessionId?: string;
};

function getStatusBadge(status: SessionStatus, isArabic: boolean) {
  switch (status) {
    case 'ready':
      return {
        label: isArabic ? 'جاهز للإرسال' : 'Ready to Send',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
      };
    case 'qr':
      return {
        label: isArabic ? 'بانتظار مسح QR' : 'Waiting for QR Scan',
        className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
      };
    case 'authenticated':
      return {
        label: isArabic ? 'تم التوثيق' : 'Authenticated',
        className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300',
      };
    case 'initializing':
      return {
        label: isArabic ? 'جارٍ التهيئة' : 'Initializing',
        className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300',
      };
    case 'disconnected':
      return {
        label: isArabic ? 'منقطع' : 'Disconnected',
        className: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200',
      };
    case 'auth_failure':
      return {
        label: isArabic ? 'فشل التوثيق' : 'Auth Failure',
        className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300',
      };
    case 'error':
      return {
        label: isArabic ? 'خطأ' : 'Error',
        className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300',
      };
    default:
      return {
        label: isArabic ? 'غير مهيأ' : 'Not Initialized',
        className: 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200',
      };
  }
}

export default function AdminWhatsAppSessionsPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSessionId, setNewSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = useMemo(
    () => ({
      title: isArabic ? 'إدارة سشنات واتساب' : 'WhatsApp Session Manager',
      backToBroadcast: isArabic ? 'العودة لصفحة الإرسال' : 'Back to Broadcast',
      addSessionTitle: isArabic ? 'إضافة سشن جديد' : 'Add New Session',
      addSessionHint: isArabic
        ? 'مثال: marketing-team أو default. بعد الإضافة سيظهر QR للمسح.'
        : 'Example: marketing-team or default. A QR code will appear after adding.',
      sessionIdLabel: isArabic ? 'معرّف السشن' : 'Session ID',
      addSession: isArabic ? 'إضافة سشن' : 'Add Session',
      refreshing: isArabic ? 'تحديث...' : 'Refreshing...',
      refresh: isArabic ? 'تحديث الحالة' : 'Refresh Status',
      makePrimary: isArabic ? 'تعيين كمرسل رئيسي' : 'Set as Primary Sender',
      primary: isArabic ? 'المرسل الرئيسي' : 'Primary Sender',
      restart: isArabic ? 'إعادة تشغيل' : 'Restart',
      noSessions: isArabic ? 'لا توجد سشنات بعد.' : 'No sessions yet.',
      updatedAt: isArabic ? 'آخر تحديث' : 'Updated',
      qrHint: isArabic
        ? 'افتح WhatsApp على الجهاز > Linked Devices > Link a device ثم امسح هذا الرمز.'
        : 'Open WhatsApp on your phone > Linked Devices > Link a device, then scan this QR.',
      noQr: isArabic ? 'لا يوجد QR حالياً.' : 'No QR available right now.',
    }),
    [isArabic]
  );

  const loadSessions = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/admin/whatsapp/sessions', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => ({}))) as SessionsResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load sessions');
      }

      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      if (!silent) {
        setError(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadSessions(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadSessions]);

  const handleAddSession = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/whatsapp/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: newSessionId }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionsResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to add session');
      }

      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      setNewSessionId('');
      setInfo(isArabic ? 'سشن با موفقیت اضافه شد.' : 'Session added successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to add session');
    } finally {
      setSubmitting(false);
    }
  };

  const setPrimarySession = async (sessionId: string) => {
    setError(null);
    setInfo(null);

    try {
      const response = await fetch('/api/admin/whatsapp/sessions/primary', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const payload = (await response.json().catch(() => ({}))) as SessionsResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to set primary session');
      }

      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      setInfo(isArabic ? 'سشن اصلی با موفقیت تنظیم شد.' : 'Primary sender session updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to set primary session');
    }
  };

  const restartSession = async (sessionId: string) => {
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/whatsapp/sessions/${encodeURIComponent(sessionId)}/restart`, {
        method: 'POST',
      });

      const payload = (await response.json().catch(() => ({}))) as SessionsResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to restart session');
      }

      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
      setInfo(isArabic ? 'سشن با موفقیت ری‌استارت شد.' : 'Session restarted successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to restart session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSessions(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiRefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? t.refreshing : t.refresh}
          </button>

          <Link
            href={`/${locale}/admin/whatsapp`}
            className="inline-flex items-center rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.backToBroadcast}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <FiPlus className="size-4 text-[color:var(--noon-teal)]" />
          <span>{t.addSessionTitle}</span>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t.addSessionHint}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.sessionIdLabel}</span>
            <input
              value={newSessionId}
              onChange={(event) => setNewSessionId(event.target.value)}
              placeholder="default"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleAddSession()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <FiLoader className="size-4 animate-spin" /> : <FiPlus className="size-4" />}
            {t.addSession}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {isArabic ? 'در حال بارگذاری سشن‌ها...' : 'Loading sessions...'}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {t.noSessions}
          </div>
        ) : (
          sessions.map((session) => {
            const badge = getStatusBadge(session.status, isArabic);
            const updatedAt = new Date(session.updatedAt);

            return (
              <article
                key={session.sessionId}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                        <FiSmartphone className="size-4" />
                        <span>{session.sessionId}</span>
                      </div>

                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>

                      {session.isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                          <FiShield className="size-3.5" />
                          {t.primary}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t.updatedAt}: {updatedAt.toLocaleString(locale === 'ar' ? 'ar-OM' : 'en-GB')}
                    </p>

                    {session.lastError ? (
                      <p className="text-sm text-rose-700 dark:text-rose-300">{session.lastError}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void restartSession(session.sessionId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <FiRefreshCw className="size-3.5" />
                      {t.restart}
                    </button>

                    {session.isPrimary ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <FiCheckCircle className="size-3.5" />
                        {t.primary}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setPrimarySession(session.sessionId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--noon-teal)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--noon-teal-strong)]"
                      >
                        <FiShield className="size-3.5" />
                        {t.makePrimary}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    {session.qrCodeDataUrl ? (
                      <Image
                        src={session.qrCodeDataUrl}
                        alt={session.sessionId}
                        width={190}
                        height={190}
                        unoptimized
                        className="mx-auto size-[190px] rounded-lg bg-white p-2"
                      />
                    ) : (
                      <div className="flex size-[190px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                        {t.noQr}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                    <p>{t.qrHint}</p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
