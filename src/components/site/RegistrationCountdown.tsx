'use client';

import { useEffect, useMemo, useState } from 'react';
import { HiClock } from 'react-icons/hi2';
import type { Locale } from '@/lib/locale';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type Props = {
  locale: Locale;
  closesAt: string; // ISO date string
  /** Only render once we're within this many ms of close. Default: 24h. */
  visibleWithinMs?: number;
};

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatRemaining(remainingMs: number, locale: Locale): string {
  if (remainingMs <= 0) return '';
  const hours = Math.floor(remainingMs / MS_PER_HOUR);
  const minutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((remainingMs % MS_PER_MINUTE) / MS_PER_SECOND);

  const hh = pad2(hours);
  const mm = pad2(minutes);
  const ss = pad2(seconds);
  return locale === 'ar'
    ? `${hh} : ${mm} : ${ss}`
    : `${hh} : ${mm} : ${ss}`;
}

export default function RegistrationCountdown({
  locale,
  closesAt,
  visibleWithinMs = MS_PER_DAY,
}: Props) {
  const targetMs = useMemo(() => new Date(closesAt).getTime(), [closesAt]);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  if (Number.isNaN(targetMs)) return null;

  const remaining = targetMs - now;
  const isArabic = locale === 'ar';

  if (remaining > visibleWithinMs) return null;

  if (remaining <= 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        <HiClock className="h-4 w-4" />
        {isArabic ? 'تم إغلاق التسجيل' : 'Registration closed'}
      </div>
    );
  }

  const label = isArabic ? 'ينتهي التسجيل خلال' : 'Registration closes in';

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
      <HiClock className="h-4 w-4" />
      <span>{label}</span>
      <span className="font-mono tabular-nums" dir="ltr" aria-live="polite">
        {formatRemaining(remaining, locale)}
      </span>
    </div>
  );
}
