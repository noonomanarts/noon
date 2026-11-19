'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ComponentType } from 'react';
import { FiBarChart2, FiBell, FiBookOpen, FiCreditCard, FiSettings, FiShoppingBag, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type { UserRole } from '@/lib/db/types';
import LogoutButton from '@/components/site/LogoutButton';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

interface AccountSidebarProps {
  locale: Locale;
  role: UserRole;
}

export function AccountSidebar({ locale, role }: AccountSidebarProps) {
  const pathname = usePathname();
  const isArabic = locale === 'ar';

  const items: NavItem[] = [
    { key: 'profile', label: isArabic ? 'الملف الشخصي' : 'Profile Info', href: `/${locale}/account/profile`, icon: FiUser },
    ...(role === 'TRAINER'
      ? [
          {
            key: 'trainer-dashboard',
            label: isArabic ? 'لوحة المدرب' : 'Trainer Dashboard',
            href: `/${locale}/account/trainer`,
            icon: FiBarChart2,
          },
        ]
      : []),
    ...(role === 'SOCIAL_MEDIA_ADMIN' || role === 'PHOTOGRAPHER'
      ? [
          {
            key: 'photographer-dashboard',
            label: isArabic ? 'لوحة المصور' : 'Photographer Dashboard',
            href: `/${locale}/photographer`,
            icon: FiBarChart2,
          },
        ]
      : []),
    { key: 'orders', label: isArabic ? 'طلباتي' : 'Orders', href: `/${locale}/account/orders`, icon: FiShoppingBag },
    { key: 'recipes', label: isArabic ? 'وصفاتي' : 'Recipes', href: `/${locale}/account/recipes`, icon: FiBookOpen },
    { key: 'wallet', label: isArabic ? 'المحفظة' : 'Wallet', href: `/${locale}/account/wallet`, icon: FiCreditCard },
    { key: 'notifications', label: isArabic ? 'الإشعارات' : 'Notifications', href: `/${locale}/account/notifications`, icon: FiBell },
    { key: 'settings', label: isArabic ? 'الإعدادات' : 'Settings', href: `/${locale}/account/settings`, icon: FiSettings },
  ];

  // On phones the menu is a scrollable row: bring the current section into view.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const navRect = nav.getBoundingClientRect();
    const itemRect = current.getBoundingClientRect();
    nav.scrollLeft += itemRect.left + itemRect.width / 2 - (navRect.left + navRect.width / 2);
  }, [pathname]);

  return (
    <aside className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-sm lg:p-3">
      {/* Phones: one scrollable row, so the page content is not pushed below a
          seven-item list. Desktop: the usual vertical menu. */}
      <nav
        ref={navRef}
        aria-label={isArabic ? 'قائمة الحساب' : 'Account menu'}
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:block lg:space-y-1 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none px-3 py-2.5 text-sm font-medium transition-colors lg:gap-3 ${
                active
                  ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-sm'
                  : 'text-[color:var(--text-muted)] hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <LogoutButton
          locale={locale}
          label={isArabic ? 'تسجيل الخروج' : 'Logout'}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none px-3 py-2.5 lg:w-full lg:gap-3 text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
        />
      </nav>
    </aside>
  );
}
