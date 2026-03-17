'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { FiAward, FiBarChart2, FiBell, FiCreditCard, FiSettings, FiShoppingBag, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import LogoutButton from '@/components/site/LogoutButton';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

interface AccountSidebarProps {
  locale: Locale;
  role: 'ADMIN' | 'TRAINER' | 'CUSTOMER' | 'EMPLOYEE' | 'SOCIAL_MEDIA_ADMIN';
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
    { key: 'orders', label: isArabic ? 'طلباتي' : 'Orders', href: `/${locale}/account/orders`, icon: FiShoppingBag },
    { key: 'wallet', label: isArabic ? 'المحفظة' : 'Wallet', href: `/${locale}/account/wallet`, icon: FiCreditCard },
    { key: 'loyalty', label: isArabic ? 'الولاء' : 'Loyalty', href: `/${locale}/account/loyalty`, icon: FiAward },
    { key: 'notifications', label: isArabic ? 'الإشعارات' : 'Notifications', href: `/${locale}/account/notifications`, icon: FiBell },
    { key: 'settings', label: isArabic ? 'الإعدادات' : 'Settings', href: `/${locale}/account/settings`, icon: FiSettings },
  ];

  return (
    <aside className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-sm">
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium transition-colors ${
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
          className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
        />
      </nav>
    </aside>
  );
}
