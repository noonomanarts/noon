import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

import { otherLocale, type Locale } from "@/lib/locale";
import ThemeToggle from "@/components/site/ThemeToggle";
import { Dropdown } from "@/components/site/Dropdown";

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
      className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
    dashboard: locale === "ar" ? "لوحة التحكم" : "Dashboard",
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
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-lg shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950/90">
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
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            {t.langShort}
          </Link>

          <Link href={`/${locale}/cart`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6l-2-2H1" />
                <path d="M9 22a1 1 0 100-2 1 1 0 000 2zM18 22a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              <span>{t.cart}</span>
            </span>
          </Link>


            <Link href={`/${locale}/login`} className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
              {t.login}
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
