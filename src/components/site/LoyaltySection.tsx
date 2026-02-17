'use client';

import type { LoyaltyCard } from '@/lib/db/types';

interface LoyaltySectionProps {
  loyalty: LoyaltyCard;
  locale: 'en' | 'ar';
}

export function LoyaltySection({ loyalty, locale }: LoyaltySectionProps) {
  const isArabic = locale === 'ar';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200/40 p-6">
      <h3 className="text-lg font-semibold mb-4">
        {isArabic ? 'بطاقة الولاء' : 'Loyalty Card'}
      </h3>

      <div className="rounded-lg bg-gradient-to-r from-[color:var(--noon-purple-soft)] to-[color:var(--noon-coral-soft)] p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {isArabic ? 'النقاط' : 'Points'}
            </div>
            <div className="text-2xl font-bold text-[color:var(--noon-purple)]">
              {loyalty.points}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {isArabic ? 'الطوابع' : 'Stamps'}
            </div>
            <div className="text-2xl font-bold text-[color:var(--noon-coral)]">
              {loyalty.stamps}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {isArabic
            ? 'كل فصل مكتمل = ختم واحد. احصل على جائزة بعد 10 ختم!'
            : 'Each completed class = 1 stamp. Get a reward after 10 stamps!'
          }
        </div>
      </div>
    </div>
  );
}