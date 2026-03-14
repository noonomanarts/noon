import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { type Locale } from "@/lib/locale";
import { getUserById } from "@/lib/db/users";
import {
  defaultGeneralAdminSettings,
  getAdminSettingsByKey,
  type GeneralAdminSettings,
} from "@/lib/db/adminSettings";
import ThemeToggle from "@/components/site/ThemeToggle";
import { Dropdown } from "@/components/site/Dropdown";
import SiteProfileMenu from "@/components/site/SiteProfileMenu";
import CartLinkWithCount from '@/components/site/CartLinkWithCount';
import { CART_COOKIE_NAME, parseCartCookie } from '@/lib/cart';
import HeaderLocaleLink from "@/components/site/HeaderLocaleLink";

function NavLink({
  href,
  children,
  variant = "panel",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "top" | "panel";
}) {
  const topClasses =
    "inline-flex h-11 items-center px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14 hover:text-white";
  const panelClasses =
    "flex h-10 items-center px-3 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)]";

  return (
    <Link
      href={href}
      className={variant === "top" ? topClasses : panelClasses}
    >
      {children}
    </Link>
  );
}

async function resolveHeaderColor(): Promise<string> {
  try {
    const savedGeneral = await getAdminSettingsByKey<Partial<GeneralAdminSettings>>("general");
    const raw = (savedGeneral?.headerColor ?? defaultGeneralAdminSettings.headerColor).trim().toLowerCase();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(raw)) {
      if (raw.length === 4) {
        const [r, g, b] = raw.slice(1).split("");
        return `#${r}${r}${g}${g}${b}${b}`;
      }
      return raw;
    }
    return defaultGeneralAdminSettings.headerColor;
  } catch {
    return defaultGeneralAdminSettings.headerColor;
  }
}

export default async function Header({ locale }: { locale: Locale }) {
  // Check if user is logged in
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  const user = sessionId ? await getUserById(sessionId) : null;
  const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
  const initialCart = parseCartCookie(cartCookie);
  const initialCartCount = initialCart.items.reduce((sum, item) => sum + item.quantity, 0);
  const headerColor = await resolveHeaderColor();

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
    recommends: locale === "ar" ? "توصيات" : "Recommends",
    contact: locale === "ar" ? "تواصل" : "Contact",
    login: locale === "ar" ? "تسجيل الدخول" : "Login",
    cart: locale === "ar" ? "السلة" : "Cart",
    theme: locale === "ar" ? "المظهر" : "Theme",
    themeLight: locale === "ar" ? "فاتح" : "Light",
    themeDark: locale === "ar" ? "داكن" : "Dark",
    themeSystem: locale === "ar" ? "حسب النظام" : "System",
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-black/25 shadow-[0_10px_28px_-18px_rgba(0,0,0,0.85)]"
      style={{ backgroundColor: headerColor }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="inline-flex h-11 items-center gap-3 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          aria-label="Noon"
        >
          <Image
            src="/images/logo-noon.png"
            alt="Noon"
            width={56}
            height={56}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Dropdown label={t.classes}>
            <NavLink href={`/${locale}/classes/cooking`}>{t.cooking}</NavLink>
            <NavLink href={`/${locale}/classes/arts-crafts`}>{t.arts}</NavLink>
          </Dropdown>

          <NavLink href={`/${locale}/shop`} variant="top">{t.shop}</NavLink>

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

          <NavLink href={`/${locale}/noon-recommends`} variant="top">{t.recommends}</NavLink>
          <NavLink href={`/${locale}/about`} variant="top">{t.about}</NavLink>
          <NavLink href={`/${locale}/contact`} variant="top">{t.contact}</NavLink>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle
            label={t.theme}
            lightLabel={t.themeLight}
            darkLabel={t.themeDark}
            systemLabel={t.themeSystem}
            buttonClassName="inline-flex h-11 items-center justify-center rounded-none px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14"
          />

          <HeaderLocaleLink locale={locale} />

          <CartLinkWithCount locale={locale} label={t.cart} initialCount={initialCartCount} />

          {user ? (
            <SiteProfileMenu
              locale={locale}
              fullName={user.fullName}
              role={user.role}
              profileImage={user.profileImage}
            />
          ) : (
            <Link
              href={`/${locale}/login`} 
              className="inline-flex h-11 items-center justify-center px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14"
            >
              {t.login}
            </Link>
          )}

          <div className="md:hidden">
            <Dropdown label={locale === "ar" ? "القائمة" : "Menu"} align="end">
              <NavLink href={`/${locale}/classes/cooking`}>{t.cooking}</NavLink>
              <NavLink href={`/${locale}/classes/arts-crafts`}>{t.arts}</NavLink>
              <NavLink href={`/${locale}/shop`}>{t.shop}</NavLink>
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
              <NavLink href={`/${locale}/about`}>{t.about}</NavLink>
              <NavLink href={`/${locale}/contact`}>{t.contact}</NavLink>
            </Dropdown>
          </div>
        </div>
      </div>
    </header>
  );
}
