"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotFound() {
  const params = useParams();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const isArabic = locale === "ar";

  const t = {
    title: isArabic ? "الصفحة غير موجودة" : "Page Not Found",
    message: isArabic
      ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
      : "Sorry, the page you're looking for doesn't exist or has been moved.",
    goHome: isArabic ? "الصفحة الرئيسية" : "Go Home",
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-amber-50">
          <span className="text-4xl font-bold text-amber-500">404</span>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-zinc-900">{t.title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-zinc-600">{t.message}</p>

        <Link
          href={`/${locale}`}
          className="inline-flex h-11 items-center rounded-xl bg-[color:var(--noon-teal)] px-6 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
        >
          {t.goHome}
        </Link>
      </div>
    </div>
  );
}
