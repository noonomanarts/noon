"use client";

import { useState } from "react";
import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import type { Locale } from "@/lib/locale";

export default function RequestRepeatButton({
  classId,
  locale,
  initialCount,
  initialRequested,
  compact = false,
}: {
  classId: string;
  locale: Locale;
  initialCount: number;
  initialRequested: boolean;
  compact?: boolean;
}) {
  const isArabic = locale === "ar";
  const [count, setCount] = useState(initialCount);
  const [requested, setRequested] = useState(initialRequested);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    request: isArabic ? "إعادة" : "Repeat",
    requested: isArabic ? "تم" : "Sent",
    countLabel: isArabic ? "الطلبات" : "Repeats",
    countUnit: isArabic ? "" : "",
    loginRequired: isArabic ? "سجّل الدخول أولاً." : "Login first.",
    requestFailed: isArabic ? "فشل إرسال الطلب." : "Failed to submit repeat request.",
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
        throw new Error(payload.error || t.requestFailed);
      }

      setRequested(true);
      setCount(typeof payload.requestsCount === "number" ? payload.requestsCount : count + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.requestFailed);
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
        className={`inline-flex w-full items-center justify-center gap-1 rounded-lg font-semibold leading-tight transition sm:gap-2 ${compact ? "px-2.5 py-1.5 text-[10px] sm:px-3 sm:py-2 sm:text-xs" : "px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm"} ${
          requested
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] disabled:opacity-60"
        }`}
      >
        {requested ? <FiCheckCircle className="size-3.5 sm:size-4" /> : <FiRefreshCw className="size-3.5 sm:size-4" />}
        {requested ? t.requested : t.request}
      </button>
      <p className="mt-1.5 text-center text-[9px] leading-3.5 text-[color:var(--text-muted)] sm:mt-2 sm:text-xs" aria-live="polite">
        {t.countLabel}: {count}{t.countUnit ? ` ${t.countUnit}` : ""}
      </p>
      {error ? (
        <p className="mt-1.5 text-[9px] text-rose-600 dark:text-rose-400 sm:mt-2 sm:text-xs">{error}</p>
      ) : null}
    </div>
  );
}
