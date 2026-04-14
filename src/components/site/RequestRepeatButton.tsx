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
    countLabel: isArabic ? "عدد طلبات الإعادة السابقة" : "Previous repeat requests",
    countUnit: isArabic ? "طلب إعادة" : "repeat requests",
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
    <div>
      <button
        type="button"
        onClick={() => void onRequestRepeat()}
        disabled={requested || submitting}
        className={`inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition ${
          requested
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] disabled:opacity-60"
        }`}
      >
        {requested ? <FiCheckCircle className="size-4" /> : <FiRefreshCw className="size-4" />}
        {requested ? t.requested : t.request}
      </button>
      <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">
        {t.countLabel}: {count} {t.countUnit}
      </p>
      {error ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
