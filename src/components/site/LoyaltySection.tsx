'use client';

import type { LoyaltyCard } from '@/lib/db/types';

interface LoyaltySectionProps {
  loyalty: LoyaltyCard;
  locale: 'en' | 'ar';
}

export function LoyaltySection({ loyalty, locale }: LoyaltySectionProps) {
  const isArabic = locale === 'ar';

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {isArabic ? 'بطاقة الولاء' : 'Loyalty Card'}
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isArabic
            ? 'تتبع نقاطك وطوابعك واكسب مكافآتك بسهولة.'
            : 'Track your points and stamps and unlock rewards easily.'}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200/70 bg-gradient-to-r from-[color:var(--noon-purple-soft)]/60 to-[color:var(--noon-coral-soft)]/60 p-5 dark:border-zinc-700/70">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/50 bg-white/70 p-4 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/40">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {isArabic ? 'النقاط' : 'Points'}
            </p>
            <p className="mt-1 text-3xl font-bold text-[color:var(--noon-purple)]">{loyalty.points}</p>
          </div>

          <div className="rounded-lg border border-white/50 bg-white/70 p-4 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-900/40">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {isArabic ? 'الطوابع' : 'Stamps'}
            </p>
            <p className="mt-1 text-3xl font-bold text-[color:var(--noon-coral)]">{loyalty.stamps}</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/50 dark:text-zinc-200">
          {isArabic
            ? 'كل فصل مكتمل = ختم واحد. احصل على جائزة بعد 10 أختام.'
            : 'Each completed class = 1 stamp. Get a reward after 10 stamps.'}
        </div>
      </div>
    </div>
  );
}