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
    <footer className="noon-surface border-t border-black/5 dark:border-white/10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href={`/${locale}`} className="inline-flex items-center gap-3">
            <Image
              src="/images/logo-noon.png"
              alt="Noon"
              width={44}
              height={44}
            />
            <span className="noon-text text-sm font-semibold">
              Noon
            </span>
          </Link>
          <div className="noon-text-muted text-sm">
            <div className="noon-text font-medium">
              {t.location}
            </div>
            <div>Muscat, Oman</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="noon-text text-sm font-semibold">
            {t.quickLinks}
          </div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/${locale}/faqs`}
                className="noon-text-muted hover:text-[var(--text)] transition"
              >
                {t.faq}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/terms`}
                className="noon-text-muted hover:text-[var(--text)] transition"
              >
                {t.terms}
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="noon-text text-sm font-semibold">
            {t.contact}
          </div>
          <div className="noon-text-muted text-sm">
            <div>
              Phone: <a className="underline" href="tel:+96898199508">+968 98199508</a>
            </div>
            <div>Email: <a className="underline" href="mailto:info@noonoman.com">info@noonoman.com</a></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="noon-text text-sm font-semibold">
            {t.follow}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="#"
              className="noon-card noon-text-muted rounded-full border px-4 py-2 transition hover:bg-[var(--muted)]"
            >
              Instagram
            </a>
            <a
              href="#"
              className="noon-card noon-text-muted rounded-full border px-4 py-2 transition hover:bg-[var(--muted)]"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 py-6 text-center text-xs noon-text-subtle dark:border-white/10">
        {t.copyright}
      </div>
    </footer>
  );
}
