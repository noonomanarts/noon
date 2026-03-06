import Image from "next/image";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiBookOpen,
  FiCalendar,
  FiFileText,
  FiHelpCircle,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import { IoLogoFacebook, IoLogoInstagram } from "react-icons/io5";

import type { Locale } from "@/lib/locale";

export default function Footer({ locale }: { locale: Locale }) {
  const currentYear = new Date().getFullYear();

  const t = {
    tagline:
      locale === "ar"
        ? "حيث يتحول الطبخ والفن إلى تجربة لا تُنسى."
        : "Where cooking and art become unforgettable experiences.",
    ctaTitle: locale === "ar" ? "جاهز لتجربة نون؟" : "Ready for the Noon Experience?",
    ctaText:
      locale === "ar"
        ? "ابدأ رحلتك معنا عبر الدورات أو الفعاليات الجماعية."
        : "Start your journey with classes or group events.",
    ctaClasses: locale === "ar" ? "استكشف الدورات" : "Explore Classes",
    ctaEvents: locale === "ar" ? "فعاليات المجموعات" : "Group Events",
    quickLinks: locale === "ar" ? "روابط سريعة" : "Quick links",
    explore: locale === "ar" ? "اكتشف أكثر" : "Explore More",
    legal: locale === "ar" ? "روابط قانونية" : "Legal",
    home: locale === "ar" ? "الرئيسية" : "Home",
    about: locale === "ar" ? "من نحن" : "About Us",
    faq: locale === "ar" ? "الأسئلة الشائعة" : "FAQs",
    terms: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions",
    contact: locale === "ar" ? "تواصل معنا" : "Contact Us",
    classes: locale === "ar" ? "دورات الطبخ" : "Cooking Classes",
    arts: locale === "ar" ? "دورات الفنون والأشغال" : "Arts & Crafts Classes",
    events: locale === "ar" ? "حجوزات وفعاليات المجموعات" : "Group Booking & Events",
    recommends: locale === "ar" ? "توصيات نون" : "Noon Recommends",
    follow: locale === "ar" ? "تابعنا" : "Follow us",
    location: locale === "ar" ? "الموقع" : "Location",
    phone: locale === "ar" ? "الهاتف" : "Phone",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    rights:
      locale === "ar"
        ? "جميع الحقوق محفوظة."
        : "All rights reserved.",
    copyright:
      locale === "ar" ? `© ${currentYear} نون.` : `© ${currentYear} Noon.`,
  };

  const quickLinks = [
    { href: `/${locale}`, label: t.home, Icon: FiArrowUpRight },
    { href: `/${locale}/about`, label: t.about, Icon: FiArrowUpRight },
    { href: `/${locale}/contact`, label: t.contact, Icon: FiArrowUpRight },
  ];

  const exploreLinks = [
    { href: `/${locale}/classes/cooking`, label: t.classes, Icon: FiBookOpen },
    { href: `/${locale}/classes/arts-crafts`, label: t.arts, Icon: FiBookOpen },
    { href: `/${locale}/group-booking-events`, label: t.events, Icon: FiCalendar },
    { href: `/${locale}/noon-recommends`, label: t.recommends, Icon: FiArrowUpRight },
  ];

  const legalLinks = [
    { href: `/${locale}/faqs`, label: t.faq, Icon: FiHelpCircle },
    { href: `/${locale}/terms`, label: t.terms, Icon: FiFileText },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-zinc-800/70 bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -start-20 top-0 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />
        <div className="absolute end-0 top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-10 overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800/80 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Noon</p>
              <h2 className="text-xl font-bold text-zinc-100">{t.ctaTitle}</h2>
              <p className="text-sm text-zinc-400">{t.ctaText}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/classes`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
              >
                {t.ctaClasses}
                <FiArrowUpRight className="size-4" />
              </Link>
              <Link
                href={`/${locale}/group-booking-events`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                {t.ctaEvents}
                <FiArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-4">
            <Link href={`/${locale}`} className="inline-flex items-center gap-3">
              <Image src="/images/logo-noon.png" alt="Noon" width={48} height={48} />
              <div>
                <p className="text-base font-bold text-zinc-100">Noon</p>
                <p className="text-xs text-zinc-400">{t.tagline}</p>
              </div>
            </Link>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <FiMapPin className="size-4 text-coral" />
                {t.location}
              </div>
              <p className="text-sm text-zinc-400">Muscat, Oman</p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.quickLinks}</h3>
            <ul className="space-y-2.5 text-sm">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex items-center gap-2 text-zinc-400 transition hover:text-zinc-100">
                    <item.Icon className="size-3.5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.explore}</h3>
            <ul className="space-y-2.5 text-sm">
              {exploreLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex items-center gap-2 text-zinc-400 transition hover:text-zinc-100">
                    <item.Icon className="size-3.5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.legal}</h3>
            <ul className="space-y-2.5 text-sm">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex items-center gap-2 text-zinc-400 transition hover:text-zinc-100">
                    <item.Icon className="size-3.5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.contact}</h3>
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
              <p className="inline-flex items-center gap-2">
                <FiPhone className="size-4 text-teal" />
                {t.phone}:{" "}
                <a className="font-medium text-zinc-200 hover:text-white" href="tel:+96898199508">
                  +968 98199508
                </a>
              </p>
              <p className="inline-flex items-center gap-2">
                <FiMail className="size-4 text-teal" />
                {t.email}:{" "}
                <a className="font-medium text-zinc-200 hover:text-white" href="mailto:info@noonoman.com">
                  info@noonoman.com
                </a>
              </p>
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-200">{t.follow}</h3>
            <div className="flex gap-2">
              <a
                href="https://instagram.com/noon"
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

      <div className="relative border-t border-zinc-800/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
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
    </footer>
  );
}
