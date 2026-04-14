"use client";

import { useState } from "react";
import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import type { Locale } from "@/lib/locale";

export default function RequestRepeatButton({
  classId,
  locale,
  initialCount,
  initialRequested,
}: {
  classId: string;
  locale: Locale;
  initialCount: number;
  initialRequested: boolean;
}) {
  const isArabic = locale === "ar";
  const [count, setCount] = useState(initialCount);
  const [requested, setRequested] = useState(initialRequested);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    request: isArabic ? "اطلب إعادة الورشة" : "Request to Repeat",
    requested: isArabic ? "تم طلب الإعادة" : "Repeat Requested",
    count: isArabic ? "إجمالي الطلبات" : "Total Requests",
    demand: isArabic ? "الطلب على التكرار" : "Repeat Demand",
    pending: isArabic ? "بانتظار الجدولة" : "Awaiting Scheduling",
    thanks: isArabic ? "تم تسجيل اهتمامك وسيراجع الفريق الطلب." : "Your interest has been recorded for the team.",
    hint:
      isArabic
        ? count > 0
          ? "كل طلب جديد يساعد الفريق على إعادة تقديم هذه الورشة بشكل أسرع."
          : "إذا أحببت هذه الورشة يمكنك التصويت لإعادتها مرة أخرى."
        : count > 0
          ? "Each new request helps the team prioritize bringing this workshop back."
          : "If you want this workshop back, send a repeat request.",
    loginRequired: isArabic ? "سجّل الدخول أولاً لطلب إعادة الورشة." : "Login first to request a repeat.",
  };

  async function onRequestRepeat() {
    if (requested || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/classes/${classId}/repeat-request`, {
        method: "POST",
      });

      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/${locale}/login?next=${next}`;
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        requestsCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || t.loginRequired);
      }

      setRequested(true);
      setCount(typeof payload.requestsCount === "number" ? payload.requestsCount : count + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            {t.demand}
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-black leading-none text-[color:var(--text)] sm:text-3xl">{count}</span>
            <span className="pb-0.5 text-xs font-medium text-[color:var(--text-muted)]">{t.count}</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
            requested
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {requested ? t.requested : t.pending}
        </span>
      </div>

      <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">
        {requested ? t.thanks : t.hint}
      </p>

      <button
        type="button"
        onClick={() => void onRequestRepeat()}
        disabled={requested || submitting}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
          requested
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] disabled:opacity-60"
        }`}
      >
        {requested ? <FiCheckCircle className="size-4" /> : <FiRefreshCw className="size-4" />}
        {requested ? t.requested : t.request}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
