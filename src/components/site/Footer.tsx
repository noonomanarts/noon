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
    <footer className="border-t border-zinc-800/70 bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-5">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3">
              <Image src="/images/logo-noon.png" alt="Noon" width={46} height={46} />
              <div>
                <p className="text-base font-bold text-zinc-100">Noon</p>
                <p className="text-xs text-zinc-400">{t.tagline}</p>
              </div>
            </Link>

            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-zinc-500">
                  <FiMapPin className="size-4 text-coral" />
                  {t.location}:
                </p>
                <p className="text-end font-medium text-zinc-100">Muscat, Oman</p>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-zinc-500">
                  <FiPhone className="size-4 text-teal" />
                  {t.phone}:
                </p>
                <a className="text-end font-medium text-zinc-100 hover:text-white" href="tel:+96898199508">
                  +968 98199508
                </a>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-zinc-500">
                  <FiMail className="size-4 text-teal" />
                  {t.email}:
                </p>
                <a className="text-end font-medium text-zinc-100 hover:text-white" href="mailto:info@noonomanarts.com">
                  info@noonomanarts.com
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.navigate}</h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-zinc-100">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-7">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.legal}</h3>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                {legalLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="transition hover:text-zinc-100">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.follow}</h3>
              <div className="flex gap-2">
                <a
                  href="https://instagram.com/noonomanarts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <IoLogoInstagram className="size-4" />
                  Instagram
                </a>
                <a
                  href="https://facebook.com/noonomanarts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <IoLogoFacebook className="size-4" />
                  Facebook
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-800/70 pt-5 text-xs text-zinc-500">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {t.copyright} {t.rights}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/${locale}/faqs`} className="transition hover:text-zinc-300">
                {t.faq}
              </Link>
              <Link href={`/${locale}/terms`} className="transition hover:text-zinc-300">
                {t.terms}
              </Link>
              <Link href={`/${locale}/contact`} className="transition hover:text-zinc-300">
                {t.contact}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
