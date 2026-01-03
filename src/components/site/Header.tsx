import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { otherLocale, type Locale } from "@/lib/locale";

function Icon({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <span
      className="inline-flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-zinc-900/30 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900/30"
      aria-hidden="true"
      title={title}
    >
      {children}
    </span>
  );
}

function Dropdown({
  label,
  children,
  align = "start",
}: {
  label: string;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const alignClass = align === "end" ? "end-0" : "start-0";

  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none select-none rounded-full px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/40 dark:text-zinc-50 dark:hover:bg-zinc-900/30">
        <span className="inline-flex items-center gap-2">
          {label}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4 transition group-open:rotate-180"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </summary>
      <div
        className={`absolute ${alignClass} top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/15 dark:bg-zinc-950`}
      >
        <div className="max-h-[70vh] overflow-auto">
        {children}
        </div>
      </div>
    </details>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900/30"
    >
      {children}
    </Link>
  );
}

export default async function Header({ locale }: { locale: Locale }) {
  const h = await headers();
  const pathname = h.get("x-noon-pathname") ?? `/${locale}`;
  const nextLocale = otherLocale(locale);
  const switchedPath = pathname.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${nextLocale}`)
    : `/${nextLocale}`;

  const t = {
    classes: locale === "ar" ? "الدورات" : "Classes",
    cooking: locale === "ar" ? "دورات الطبخ" : "Cooking classes",
    arts: locale === "ar" ? "الفنون والأشغال" : "Arts & crafts classes",
    group: locale === "ar" ? "حجوزات المجموعات والفعاليات" : "Group Booking & Events",
    competition: locale === "ar" ? "مسابقة الطبخ" : "Cooking competition",
    privateClasses: locale === "ar" ? "دروس خاصة" : "Private classes",
    birthday: locale === "ar" ? "حفلات أعياد الميلاد" : "Birthday parties",
    recommends: locale === "ar" ? "نون يوصي" : "Noon Recommends",
    contact: locale === "ar" ? "تواصل معنا" : "Contact Us",
    account: locale === "ar" ? "حسابي" : "My Account",
    login: locale === "ar" ? "تسجيل الدخول" : "Login",
    cart: locale === "ar" ? "السلة" : "Cart",
    langShort: nextLocale.toUpperCase(),
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/40"
          aria-label="Noon"
        >
          <Image
            src="/images/logo-noon.png"
            alt="Noon"
            width={44}
            height={44}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Dropdown label={t.classes}>
            <NavLink href={`/${locale}/classes/cooking`}>{t.cooking}</NavLink>
            <NavLink href={`/${locale}/classes/arts-crafts`}>{t.arts}</NavLink>
          </Dropdown>

          <Dropdown label={t.group}>
            <NavLink href={`/${locale}/group-booking-events/cooking-competition`}>
              {t.competition}
            </NavLink>
            <NavLink href={`/${locale}/group-booking-events/private-classes`}>
              {t.privateClasses}
            </NavLink>
            <NavLink href={`/${locale}/group-booking-events/birthday-parties`}>
              {t.birthday}
            </NavLink>
          </Dropdown>

          <NavLink href={`/${locale}/noon-recommends`}>{t.recommends}</NavLink>
          <NavLink href={`/${locale}/contact`}>{t.contact}</NavLink>
          <NavLink href={`/${locale}/account`}>{t.account}</NavLink>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <Link
            href={switchedPath}
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/40 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900/30"
            aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            {t.langShort}
          </Link>

          <Link href={`/${locale}/cart`} aria-label={t.cart}>
            <Icon title={t.cart}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6l-2-2H1" />
                <path d="M9 22a1 1 0 100-2 1 1 0 000 2zM18 22a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </Icon>
          </Link>

          <Link href={`/${locale}/login`} aria-label={t.login}>
            <Icon title={t.login}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h8" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H9" />
              </svg>
            </Icon>
          </Link>

          <div className="md:hidden">
            <Dropdown label={locale === "ar" ? "القائمة" : "Menu"} align="end">
              <NavLink href={`/${locale}/classes/cooking`}>{t.cooking}</NavLink>
              <NavLink href={`/${locale}/classes/arts-crafts`}>{t.arts}</NavLink>
              <NavLink href={`/${locale}/group-booking-events/cooking-competition`}>
                {t.competition}
              </NavLink>
              <NavLink href={`/${locale}/group-booking-events/private-classes`}>
                {t.privateClasses}
              </NavLink>
              <NavLink href={`/${locale}/group-booking-events/birthday-parties`}>
                {t.birthday}
              </NavLink>
              <NavLink href={`/${locale}/noon-recommends`}>{t.recommends}</NavLink>
              <NavLink href={`/${locale}/contact`}>{t.contact}</NavLink>
              <NavLink href={`/${locale}/account`}>{t.account}</NavLink>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
