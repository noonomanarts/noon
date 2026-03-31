"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const LOCALE_STORAGE_KEY = "noon-preferred-locale";

export default function LocaleSync() {
  const pathname = usePathname();

  useEffect(() => {
    const isArabic = pathname.startsWith("/ar");
    const html = document.documentElement;
    const currentLocale = isArabic ? "ar-u-nu-latn" : "en";

    // Update HTML attributes
    if (isArabic) {
      html.setAttribute("lang", "ar");
      html.setAttribute("dir", "rtl");
    } else {
      html.setAttribute("lang", "en");
      html.setAttribute("dir", "ltr");
    }

    // Save the current locale to localStorage
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, currentLocale);
    } catch {
      // Ignore localStorage errors
    }
  }, [pathname]);

  return null;
}
