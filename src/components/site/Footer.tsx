import Image from "next/image";
import Link from "next/link";
import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { IoLogoFacebook, IoLogoInstagram } from "react-icons/io5";

import type { Locale } from "@/lib/locale";

export default function Footer({ locale }: { locale: Locale }) {
  const currentYear = new Date().getFullYear();

  const t = {
    tagline:
      locale === "ar"
        ? "تجارب طبخ وفنون مصممة لتكون بسيطة، ممتعة، وملهمة."
        : "Cooking and art experiences designed to be simple, inspiring, and memorable.",
    navigate: locale === "ar" ? "تصفح" : "Navigate",
    legal: locale === "ar" ? "روابط قانونية" : "Legal",
    home: locale === "ar" ? "الرئيسية" : "Home",
    about: locale === "ar" ? "من نحن" : "About Us",
    classes: locale === "ar" ? "الدورات" : "Classes",
    events: locale === "ar" ? "فعاليات المجموعات" : "Group Events",
    recommends: locale === "ar" ? "توصيات نون" : "Noon Recommends",
    contact: locale === "ar" ? "تواصل معنا" : "Contact Us",
    faq: locale === "ar" ? "الأسئلة الشائعة" : "FAQs",
    terms: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions",
    follow: locale === "ar" ? "تابعنا" : "Follow us",
    location: locale === "ar" ? "الموقع" : "Location",
    phone: locale === "ar" ? "الهاتف" : "Phone",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    rights: locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved.",
    copyright: locale === "ar" ? `© ${currentYear} نون.` : `© ${currentYear} Noon.`,
  };

  const navLinks = [
    { href: `/${locale}`, label: t.home },
    { href: `/${locale}/about`, label: t.about },
    { href: `/${locale}/classes`, label: t.classes },
    { href: `/${locale}/group-booking-events`, label: t.events },
    { href: `/${locale}/noon-recommends`, label: t.recommends },
    { href: `/${locale}/contact`, label: t.contact },
  ];

  const legalLinks = [
    { href: `/${locale}/faqs`, label: t.faq },
    { href: `/${locale}/terms`, label: t.terms },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-teal/12 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-coral/12 blur-3xl dark:bg-coral/10" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-5">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3">
              <Image src="/images/logo-noon.png" alt="Noon" width={46} height={46} />
              <div>
                <p className="text-base font-bold text-[color:var(--text)]">Noon</p>
                <p className="text-xs text-[color:var(--text-muted)]">{t.tagline}</p>
              </div>
            </Link>

            <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm text-[color:var(--text-muted)]">
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--text-subtle)]">
                  <FiMapPin className="size-4 text-coral" />
                  {t.location}:
                </p>
                <p className="text-end font-medium text-[color:var(--text)]">Muscat, Oman</p>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--text-subtle)]">
                  <FiPhone className="size-4 text-teal" />
                  {t.phone}:
                </p>
                <a className="text-end font-medium text-[color:var(--text)] hover:text-[color:var(--primary)]" href="tel:+96898199508">
                  +968 98199508
                </a>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-[color:var(--text-subtle)]">
                  <FiMail className="size-4 text-teal" />
                  {t.email}:
                </p>
                <a className="text-end font-medium text-[color:var(--text)] hover:text-[color:var(--primary)]" href="mailto:info@noonomanarts.com">
                  info@noonomanarts.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[color:var(--text)]">{t.navigate}</h3>
            <ul className="space-y-2.5 text-sm text-[color:var(--text-muted)]">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-[color:var(--text)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-7">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[color:var(--text)]">{t.legal}</h3>
              <ul className="space-y-2.5 text-sm text-[color:var(--text-muted)]">
                {legalLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="transition hover:text-[color:var(--text)]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--text)]">{t.follow}</h3>
              <div className="flex gap-2">
                <a
                  href="https://instagram.com/noonomanarts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text-muted)] transition hover:border-[color:var(--primary)]/40 hover:text-[color:var(--text)]"
                >
                  <IoLogoInstagram className="size-4" />
                  Instagram
                </a>
                <a
                  href="https://facebook.com/noonomanarts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text-muted)] transition hover:border-[color:var(--primary)]/40 hover:text-[color:var(--text)]"
                >
                  <IoLogoFacebook className="size-4" />
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[color:var(--border)] pt-5 text-xs text-[color:var(--text-subtle)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t.copyright} {t.rights}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/${locale}/faqs`} className="transition hover:text-[color:var(--text)]">
                {t.faq}
              </Link>
              <Link href={`/${locale}/terms`} className="transition hover:text-[color:var(--text)]">
                {t.terms}
              </Link>
              <Link href={`/${locale}/contact`} className="transition hover:text-[color:var(--text)]">
                {t.contact}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
