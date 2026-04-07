"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const isArabic = locale === "ar";

  useEffect(() => {
    console.error("Site error:", error);
  }, [error]);

  const t = {
    title: isArabic ? "حدث خطأ غير متوقع" : "Something went wrong",
    message: isArabic
      ? "نعتذر، حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية."
      : "We're sorry, an error occurred while loading the page. Please try again or return to the home page.",
    tryAgain: isArabic ? "حاول مجدداً" : "Try Again",
    goHome: isArabic ? "الصفحة الرئيسية" : "Go Home",
    errorCode: isArabic ? "رمز الخطأ" : "Error code",
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-red-50">
          <svg className="size-10 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-zinc-900">{t.title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-zinc-600">{t.message}</p>

        {error.digest && (
          <p className="mb-6 text-xs text-zinc-400">
            {t.errorCode}: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-500">{error.digest}</code>
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center rounded-xl bg-[color:var(--noon-teal)] px-6 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
          >
            {t.tryAgain}
          </button>
          <Link
            href={`/${locale}`}
            className="inline-flex h-11 items-center rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            {t.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
