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
      className="inline-flex h-11 items-center justify-center rounded-none px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14"
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {nextLocale.toUpperCase()}
    </Link>
  );
}
