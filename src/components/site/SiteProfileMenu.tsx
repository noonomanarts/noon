'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiGrid, FiSettings, FiUser } from 'react-icons/fi';
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

  const accountHref = `/${locale}/account/profile`;
  const dashboardHref = `/${locale}/admin`;

  const t = {
    account: isArabic ? 'ملفي الشخصي' : 'My Account',
    settings: isArabic ? 'الإعدادات' : 'Settings',
    dashboard: isArabic ? 'لوحة التحكم' : 'Dashboard',
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
        className="inline-flex h-11 items-center gap-2 rounded-none px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14"
      >
        <span className="relative h-7 w-7 overflow-hidden rounded-full bg-[color:var(--muted)]">
          {profileImage ? (
            <Image src={profileImage} alt={fullName} fill sizes="28px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[color:var(--text-muted)]">
              {initial}
            </span>
          )}
        </span>
        <span className="hidden max-w-[110px] truncate sm:inline">{fullName}</span>
        <FiChevronDown className="size-4 text-white/80" />
      </button>

      <div
        className={`absolute end-0 top-full z-50 w-56 pt-2 transition-opacity duration-150 ${
          isOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
      >
        <div className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-2 shadow-xl">
          <div className="mb-2 border-b border-[color:var(--border)] px-2 pb-2">
            <p className="truncate text-sm font-semibold text-[color:var(--text)]">{fullName}</p>
            <p className="text-xs text-[color:var(--text-subtle)]">{role}</p>
          </div>

          <Link
            href={accountHref}
            className="flex items-center gap-2 rounded-none px-2 py-2 text-sm text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
          >
            <FiUser className="size-4" />
            {t.account}
          </Link>

          {role === 'ADMIN' ? (
            <Link
              href={dashboardHref}
              className="flex items-center gap-2 rounded-none px-2 py-2 text-sm text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
            >
              <FiGrid className="size-4" />
              {t.dashboard}
            </Link>
          ) : null}

          <Link
            href={`/${locale}/account/settings`}
            className="flex items-center gap-2 rounded-none px-2 py-2 text-sm text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
          >
            <FiSettings className="size-4" />
            {t.settings}
          </Link>

          <LogoutButton
            locale={locale}
            label={t.logout}
            className="mt-1 flex w-full items-center gap-2 rounded-none px-2 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
          />
        </div>
      </div>
    </div>
  );
}
