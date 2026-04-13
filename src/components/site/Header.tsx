import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";

import { type Locale } from "@/lib/locale";
import { getUserById } from "@/lib/db/users";
import { resolveHeaderBranding } from "@/lib/headerBranding";
import { Dropdown } from "@/components/site/Dropdown";
import SiteProfileMenu from "@/components/site/SiteProfileMenu";
import CartLinkWithCount from '@/components/site/CartLinkWithCount';
import { CART_COOKIE_NAME, parseCartCookie } from '@/lib/cart';
import HeaderLocaleLink from "@/components/site/HeaderLocaleLink";

function NavLink({
  href,
  children,
  variant = "panel",
  tone = "dark",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "top" | "panel";
  tone?: "dark" | "light";
}) {
  const topClasses = tone === "light"
    ? "inline-flex h-11 items-center px-3 text-base font-extrabold text-black transition hover:bg-black/10 hover:text-black"
    : "inline-flex h-11 items-center px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14 hover:text-white";
  const panelClasses = tone === "light"
    ? "flex h-10 items-center px-3 text-sm font-bold text-black transition hover:bg-black/10 hover:text-black"
    : "flex h-10 items-center px-3 text-sm font-bold text-white/95 transition hover:bg-white/14 hover:text-white";

  return (
    <Link
      href={href}
      className={variant === "top" ? topClasses : panelClasses}
    >
      {children}
    </Link>
  );
}

export default async function Header({ locale }: { locale: Locale }) {
  // Check if user is logged in
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  const user = sessionId ? await getUserById(sessionId) : null;
  const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
  const initialCart = parseCartCookie(cartCookie);
  const initialCartCount = initialCart.items.reduce((sum, item) => sum + item.quantity, 0);
  const { headerColor, headerLogoUrl } = await resolveHeaderBranding();
  const navTone: "dark" | "light" = "light";
  const dropdownButtonClass = "text-black hover:bg-black/10 hover:text-black focus-visible:outline-black/60";
  const dropdownPanelClass = "mt-0 border-0 shadow-none";
  const headerMenuStyle = {
    backgroundColor: headerColor,
  } as CSSProperties;
  const t = {
    about: locale === "ar" ? "من نحن" : "About",
    classes: locale === "ar" ? "دورات" : "Classes",
    cooking: locale === "ar" ? "دورات الطبخ" : "Cooking classes",
    arts: locale === "ar" ? "الفنون والأشغال" : "Arts & crafts classes",
    shop: locale === "ar" ? "المتجر" : "Shop",
    group: locale === "ar" ? "فعاليات" : "Events",
    competition: locale === "ar" ? "مسابقة الطبخ" : "Cooking competition",
    privateClasses: locale === "ar" ? "دروس خاصة" : "Private classes",
    birthday: locale === "ar" ? "حفلات أعياد الميلاد" : "Birthday parties",
    contact: locale === "ar" ? "تواصل" : "Contact",
    joinUs: locale === "ar" ? "انضم إلينا" : "Join Us",
    login: locale === "ar" ? "تسجيل الدخول" : "Login",
    cart: locale === "ar" ? "السلة" : "Cart",
  };

  return (
    <header
      className="sticky top-0 z-40 shadow-none"
      style={{ backgroundColor: headerColor }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="inline-flex h-11 items-center gap-3 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          aria-label="Noon"
        >
          <Image
            src={headerLogoUrl}
            alt="Noon"
            width={56}
            height={56}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Dropdown
            label={t.classes}
            buttonClassName={dropdownButtonClass}
            panelClassName={dropdownPanelClass}
            panelStyle={headerMenuStyle}
          >
            <NavLink href={`/${locale}/classes/cooking`} tone={navTone}>{t.cooking}</NavLink>
            <NavLink href={`/${locale}/classes/arts-crafts`} tone={navTone}>{t.arts}</NavLink>
          </Dropdown>

          <NavLink href={`/${locale}/shop`} variant="top" tone={navTone}>{t.shop}</NavLink>

          <Dropdown
            label={t.group}
            buttonClassName={dropdownButtonClass}
            panelClassName={dropdownPanelClass}
            panelStyle={headerMenuStyle}
          >
            <NavLink href={`/${locale}/group-booking-events/cooking-competition`} tone={navTone}>
              {t.competition}
            </NavLink>
            <NavLink href={`/${locale}/group-booking-events/private-classes`} tone={navTone}>
              {t.privateClasses}
            </NavLink>
            <NavLink href={`/${locale}/group-booking-events/birthday-parties`} tone={navTone}>
              {t.birthday}
            </NavLink>
          </Dropdown>

          <NavLink href={`/${locale}/about`} variant="top" tone={navTone}>{t.about}</NavLink>
          <NavLink href={`/${locale}/contact`} variant="top" tone={navTone}>{t.contact}</NavLink>
          <NavLink href={`/${locale}/join-us`} variant="top" tone={navTone}>{t.joinUs}</NavLink>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <HeaderLocaleLink
            locale={locale}
            className="inline-flex h-11 items-center justify-center rounded-none px-3 text-base font-extrabold text-black transition hover:bg-black/10 hover:text-black"
          />

          <CartLinkWithCount
            locale={locale}
            label={t.cart}
            initialCount={initialCartCount}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-none px-3 text-base font-extrabold text-black transition hover:bg-black/10 hover:text-black"
          />

          {user ? (
            <SiteProfileMenu
              locale={locale}
              fullName={user.fullName}
              role={user.role}
              profileImage={user.profileImage}
              tone={navTone}
              menuClassName="border-0 bg-transparent shadow-none"
              menuStyle={{
                backgroundColor: headerColor,
                "--text": "#000000",
                "--text-muted": "rgba(0,0,0,0.86)",
                "--text-subtle": "rgba(0,0,0,0.72)",
                "--muted": "rgba(0,0,0,0.10)",
                "--border": "transparent",
              } as CSSProperties}
            />
          ) : (
            <Link
              href={`/${locale}/login`} 
              className="hidden h-11 items-center justify-center px-3 text-base font-extrabold text-black transition hover:bg-black/10 hover:text-black md:inline-flex"
            >
              {t.login}
            </Link>
          )}

          <div className="md:hidden">
            <Dropdown
              label={locale === "ar" ? "القائمة" : "Menu"}
              align="end"
              buttonClassName={dropdownButtonClass}
              panelClassName={dropdownPanelClass}
              panelStyle={headerMenuStyle}
            >
              <NavLink href={`/${locale}/classes/cooking`} tone={navTone}>{t.cooking}</NavLink>
              <NavLink href={`/${locale}/classes/arts-crafts`} tone={navTone}>{t.arts}</NavLink>
              <NavLink href={`/${locale}/shop`} tone={navTone}>{t.shop}</NavLink>
              <NavLink href={`/${locale}/group-booking-events/cooking-competition`} tone={navTone}>
                {t.competition}
              </NavLink>
              <NavLink href={`/${locale}/group-booking-events/private-classes`} tone={navTone}>
                {t.privateClasses}
              </NavLink>
              <NavLink href={`/${locale}/group-booking-events/birthday-parties`} tone={navTone}>
                {t.birthday}
              </NavLink>
              <NavLink href={`/${locale}/about`} tone={navTone}>{t.about}</NavLink>
              <NavLink href={`/${locale}/contact`} tone={navTone}>{t.contact}</NavLink>
              <NavLink href={`/${locale}/join-us`} tone={navTone}>{t.joinUs}</NavLink>
              {!user && (
                <div className="mt-2 border-t border-black/10 pt-2">
                  <Link
                    href={`/${locale}/login`}
                    className="flex h-11 items-center justify-center rounded-lg bg-[#6d2e46] px-4 text-sm font-extrabold text-white transition hover:brightness-110"
                  >
                    {t.login}
                  </Link>
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
