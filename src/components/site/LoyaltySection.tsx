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

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {isArabic ? 'النقاط' : 'Points'}
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {loyalty.points}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {isArabic ? 'الطوابع' : 'Stamps'}
            </div>
            <div className="text-2xl font-bold text-pink-600">
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