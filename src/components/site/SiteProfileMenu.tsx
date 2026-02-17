'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiSettings, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import LogoutButton from '@/components/site/LogoutButton';

interface SiteProfileMenuProps {
  locale: Locale;
  fullName: string;
  role: 'ADMIN' | 'TRAINER' | 'CUSTOMER';
  profileImage?: string | null;
}

export default function SiteProfileMenu({ locale, fullName, role, profileImage }: SiteProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isArabic = locale === 'ar';

  const dashboardHref = role === 'ADMIN' ? `/${locale}/admin` : `/${locale}/account`;

  const t = {
    account: isArabic ? 'حسابي' : 'My Account',
    settings: isArabic ? 'الإعدادات' : 'Settings',
    dashboard: role === 'ADMIN' ? (isArabic ? 'لوحة التحكم' : 'Dashboard') : (isArabic ? 'الحساب' : 'Account'),
    logout: isArabic ? 'تسجيل الخروج' : 'Logout',
  };

  const initial = fullName.trim().charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !container.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="relative h-7 w-7 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          {profileImage ? (
            <Image src={profileImage} alt={fullName} fill sizes="28px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {initial}
            </span>
          )}
        </span>
        <span className="hidden max-w-[110px] truncate sm:inline">{fullName}</span>
        <FiChevronDown className="size-4 text-zinc-500" />
      </button>

      <div
        className={`absolute end-0 top-full z-50 w-56 pt-2 transition-opacity duration-150 ${
          isOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
      >
        <div className="rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 border-b border-zinc-200 px-2 pb-2 dark:border-zinc-700">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fullName}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
          </div>

          <Link
            href={dashboardHref}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiUser className="size-4" />
            {t.dashboard}
          </Link>

          <Link
            href={`/${locale}/account/settings`}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiSettings className="size-4" />
            {t.settings}
          </Link>

          <LogoutButton
            locale={locale}
            label={t.logout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
          />
        </div>
      </div>
    </div>
  );
}
