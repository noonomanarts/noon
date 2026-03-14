'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/locale';

type CartSummaryResponse = {
  summary?: {
    totalQuantity?: number;
  };
};

export default function CartLinkWithCount({
  locale,
  label,
  initialCount = 0,
  className,
}: {
  locale: Locale;
  label: string;
  initialCount?: number;
  className?: string;
}) {
  const [count, setCount] = useState(initialCount);

  const loadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as CartSummaryResponse;
      setCount(Number(payload?.summary?.totalQuantity ?? 0));
    } catch {
      // Ignore transient client fetch errors for badge rendering
    }
  }, []);

  useEffect(() => {
    const onCartChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ delta?: number; count?: number }>;
      const nextCount = customEvent.detail?.count;
      const delta = customEvent.detail?.delta;

      if (typeof nextCount === 'number' && Number.isFinite(nextCount)) {
        setCount(Math.max(0, Math.trunc(nextCount)));
      } else if (typeof delta === 'number' && Number.isFinite(delta)) {
        setCount((previous) => Math.max(0, previous + Math.trunc(delta)));
      }

      void loadCount();
    };

    window.addEventListener('cart:changed', onCartChanged);
    window.addEventListener('focus', onCartChanged);

    return () => {
      window.removeEventListener('cart:changed', onCartChanged);
      window.removeEventListener('focus', onCartChanged);
    };
  }, [loadCount]);

  return (
    <Link
      href={`/${locale}/cart`}
      className={
        className ??
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-none px-3 text-base font-extrabold text-white/95 transition hover:bg-white/14"
      }
    >
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6h15l-1.5 9h-12z" />
            <path d="M6 6l-2-2H1" />
            <path d="M9 22a1 1 0 100-2 1 1 0 000 2zM18 22a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
          {count > 0 && (
            <span className="absolute -right-2 -top-2 inline-flex min-w-4 items-center justify-center rounded-none bg-[color:var(--primary)] px-1 text-[10px] font-semibold text-[color:var(--primary-foreground)]">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        <span>{label}</span>
      </span>
    </Link>
  );
}
