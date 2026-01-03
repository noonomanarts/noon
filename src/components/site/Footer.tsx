import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/locale";

export default function Footer({ locale }: { locale: Locale }) {
  const t = {
    quickLinks: locale === "ar" ? "روابط سريعة" : "Quick links",
    faq: locale === "ar" ? "الأسئلة الشائعة" : "FAQs",
    terms: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions",
    contact: locale === "ar" ? "تواصل معنا" : "Contact Us",
    follow: locale === "ar" ? "تابعنا" : "Follow us",
    location: locale === "ar" ? "الموقع" : "Location",
    copyright:
      locale === "ar"
        ? "© 2025 نون. جميع الحقوق محفوظة"
        : "© 2025 Noon. All rights reserved",
  };

  return (
    <footer className="border-t border-black/5 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href={`/${locale}`} className="inline-flex items-center gap-3">
            <Image
              src="/images/logo-noon.png"
              alt="Noon"
              width={44}
              height={44}
            />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Noon
            </span>
          </Link>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <div className="font-medium text-zinc-900 dark:text-zinc-50">
              {t.location}
            </div>
            <div>Muscat, Oman</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t.quickLinks}
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/${locale}/faqs`}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {t.faq}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/terms`}
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {t.terms}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t.contact}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              Phone: <a className="underline" href="tel:+96898199508">+968 98199508</a>
            </div>
            <div>Email: <a className="underline" href="mailto:info@noonoman.com">info@noonoman.com</a></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t.follow}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="#"
              className="rounded-full border border-black/10 px-4 py-2 text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-900/30"
            >
              Instagram
            </a>
            <a
              href="#"
              className="rounded-full border border-black/10 px-4 py-2 text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-900/30"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 py-6 text-center text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        {t.copyright}
      </div>
    </footer>
  );
}
