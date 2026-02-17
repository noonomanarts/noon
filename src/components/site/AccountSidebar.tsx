'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { FiAward, FiBell, FiCreditCard, FiSettings, FiShoppingBag, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

interface AccountSidebarProps {
  locale: Locale;
}

export function AccountSidebar({ locale }: AccountSidebarProps) {
  const pathname = usePathname();
  const isArabic = locale === 'ar';

  const items: NavItem[] = [
    { key: 'profile', label: isArabic ? 'الملف الشخصي' : 'Profile Info', href: `/${locale}/account/profile`, icon: FiUser },
    { key: 'orders', label: isArabic ? 'طلباتي' : 'Orders', href: `/${locale}/account/orders`, icon: FiShoppingBag },
    { key: 'wallet', label: isArabic ? 'المحفظة' : 'Wallet', href: `/${locale}/account/wallet`, icon: FiCreditCard },
    { key: 'loyalty', label: isArabic ? 'الولاء' : 'Loyalty', href: `/${locale}/account/loyalty`, icon: FiAward },
    { key: 'notifications', label: isArabic ? 'الإشعارات' : 'Notifications', href: `/${locale}/account/notifications`, icon: FiBell },
    { key: 'settings', label: isArabic ? 'الإعدادات' : 'Settings', href: `/${locale}/account/settings`, icon: FiSettings },
  ];

  return (
    <aside className="rounded-2xl border border-zinc-200/70 bg-white p-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
