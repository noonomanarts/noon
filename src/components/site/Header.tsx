import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { type Locale } from "@/lib/locale";
import { getUserById } from "@/lib/db/users";
import ThemeToggle from "@/components/site/ThemeToggle";
import { Dropdown } from "@/components/site/Dropdown";
import SiteProfileMenu from "@/components/site/SiteProfileMenu";
import CartLinkWithCount from '@/components/site/CartLinkWithCount';
import { CART_COOKIE_NAME, parseCartCookie } from '@/lib/cart';
import HeaderLocaleLink from "@/components/site/HeaderLocaleLink";

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
      className="block rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
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
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/88 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]/50"
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

          <NavLink href={`/${locale}/shop`}>{t.shop}</NavLink>

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
          <NavLink href={`/${locale}/about`}>{t.about}</NavLink>
          <NavLink href={`/${locale}/contact`}>{t.contact}</NavLink>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle
            label={t.theme}
            lightLabel={t.themeLight}
            darkLabel={t.themeDark}
            systemLabel={t.themeSystem}
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
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-3 py-1.5 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
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
