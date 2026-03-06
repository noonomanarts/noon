"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { otherLocale, type Locale } from "@/lib/locale";

function buildSwitchedPath(pathname: string, currentLocale: Locale): string {
  const nextLocale = otherLocale(currentLocale);
  const normalizedPath = pathname || `/${currentLocale}`;

  if (/^\/(en|ar)(?=\/|$)/.test(normalizedPath)) {
    return normalizedPath.replace(/^\/(en|ar)(?=\/|$)/, `/${nextLocale}`);
  }

  if (normalizedPath.startsWith("/")) {
    return `/${nextLocale}${normalizedPath}`;
  }

  return `/${nextLocale}/${normalizedPath}`;
}

export default function HeaderLocaleLink({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextLocale = otherLocale(locale);

  const switchedPath = buildSwitchedPath(pathname, locale);
  const search = searchParams.toString();
  const href = search ? `${switchedPath}?${search}` : switchedPath;

  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {nextLocale.toUpperCase()}
    </Link>
  );
}
