import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { otherLocale, type Locale } from "@/lib/locale";
import ThemeToggle from "@/components/site/ThemeToggle";
import { Dropdown } from "@/components/site/Dropdown";

function Icon({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <span
      className="noon-card noon-text inline-flex size-10 items-center justify-center rounded-full border shadow-sm transition hover:bg-[var(--muted)] focus-within:ring-2 focus-within:ring-[var(--focus)]"
      aria-hidden="true"
      title={title}
    >
      {children}
    </span>
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
      className="noon-text block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[var(--muted)]"
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
    classes: locale === "ar" ? "دورات" : "Classes",
    cooking: locale === "ar" ? "دورات الطبخ" : "Cooking classes",
    arts: locale === "ar" ? "الفنون والأشغال" : "Arts & crafts classes",
    group: locale === "ar" ? "فعاليات" : "Events",
    competition: locale === "ar" ? "مسابقة الطبخ" : "Cooking competition",
    privateClasses: locale === "ar" ? "دروس خاصة" : "Private classes",
    birthday: locale === "ar" ? "حفلات أعياد الميلاد" : "Birthday parties",
    recommends: locale === "ar" ? "توصيات" : "Recommends",
    contact: locale === "ar" ? "تواصل" : "Contact",
    account: locale === "ar" ? "حساب" : "Account",
    login: locale === "ar" ? "تسجيل الدخول" : "Login",
    cart: locale === "ar" ? "السلة" : "Cart",
    langShort: nextLocale.toUpperCase(),
    theme: locale === "ar" ? "المظهر" : "Theme",
    themeLight: locale === "ar" ? "فاتح" : "Light",
    themeDark: locale === "ar" ? "داكن" : "Dark",
    themeSystem: locale === "ar" ? "حسب النظام" : "System",
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/40"
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
          <ThemeToggle
            label={t.theme}
            lightLabel={t.themeLight}
            darkLabel={t.themeDark}
            systemLabel={t.themeSystem}
          />

          <Link
            href={switchedPath}
            className="noon-card noon-text inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
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
