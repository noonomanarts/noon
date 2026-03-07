'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiLogOut, FiX } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

export default function LogoutButton({
  locale,
  className,
  label,
  confirmMessage,
}: {
  locale: Locale;
  className?: string;
  label?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isArabic = locale === 'ar';
  const text = {
    title: isArabic ? 'تأكيد تسجيل الخروج' : 'Confirm Logout',
    description:
      confirmMessage ??
      (isArabic
        ? 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك الآن؟'
        : 'Are you sure you want to log out of your account now?'),
    cancel: isArabic ? 'إلغاء' : 'Cancel',
    confirm: isArabic ? 'تسجيل الخروج' : 'Log out',
    processing: isArabic ? 'جارٍ الخروج...' : 'Logging out...',
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setShowConfirm(false);
      router.push(`/${locale}/login?logout=success`);
      router.refresh();
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showConfirm) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowConfirm(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showConfirm]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={className}
      >
        {loading ? text.processing : label ?? text.confirm}
      </button>

      {mounted && showConfirm
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setShowConfirm(false);
                }
              }}
            >
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4 dark:border-zinc-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <FiAlertTriangle className="size-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-[color:var(--text)] dark:text-zinc-100">{text.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded-lg p-1.5 text-[color:var(--text-subtle)] transition hover:bg-[color:var(--muted)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label={isArabic ? 'إغلاق' : 'Close'}
                  >
                    <FiX className="size-4" />
                  </button>
                </div>

                <div className="px-5 py-4">
                  <p className="text-sm leading-6 text-[color:var(--text-muted)] dark:text-zinc-300">{text.description}</p>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] px-5 py-4 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-[color:var(--muted)] dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {text.cancel}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiLogOut className="size-4" />
                    {loading ? text.processing : text.confirm}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
