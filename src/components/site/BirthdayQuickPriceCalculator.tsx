'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers } from 'react-icons/fi';

import type { Locale } from '@/lib/locale';
import {
  BIRTHDAY_PARTY_PRICE_TIERS,
  getBirthdayPartyTierById,
} from '@/lib/competitionPricing';

export default function BirthdayQuickPriceCalculator({
  locale,
}: {
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [selectedTierId, setSelectedTierId] = useState(BIRTHDAY_PARTY_PRICE_TIERS[0]?.id ?? '6_9');

  const selectedTier = getBirthdayPartyTierById(selectedTierId) ?? BIRTHDAY_PARTY_PRICE_TIERS[0];

  const t = {
    title: isArabic ? 'اختاري الباقة المناسبة' : 'Choose Your Package',
    participants: isArabic ? 'المشاركون' : 'Participants',
    workStyle: isArabic ? 'طريقة العمل' : 'Work style',
    total: isArabic ? 'السعر الثابت' : 'Fixed price',
    continueBooking: isArabic ? 'متابعة الحجز' : 'Continue to Booking',
    individual: isArabic ? 'كل مشاركة تعمل بشكل فردي' : 'Each person works individually',
    pairs: isArabic ? 'كل شخصين يعملان معاً' : 'Every 2 people work together',
  };

  return (
    <section className="mx-auto mt-6 w-full max-w-6xl px-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{t.title}</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {BIRTHDAY_PARTY_PRICE_TIERS.map((tier) => {
            const isSelected = tier.id === selectedTierId;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? 'border-coral bg-coral/5 shadow-sm'
                    : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-coral/40'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
                  <FiUsers className="h-3.5 w-3.5 text-coral" />
                  {t.participants}
                </div>
                <p className="mt-3 text-lg font-semibold text-[color:var(--text)]">
                  {tier.minParticipants}-{tier.maxParticipants}
                </p>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                  {t.workStyle}: {tier.workMode === 'INDIVIDUAL' ? t.individual : t.pairs}
                </p>
                <p className="mt-4 text-xl font-bold text-coral">{tier.totalPrice} OMR</p>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!selectedTier) return;
            router.push(`/${locale}/group-booking-events/birthday-parties/book?birthdayPackage=${selectedTier.id}`);
          }}
          disabled={!selectedTier}
          className="mt-4 w-full rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.continueBooking}
        </button>
      </div>
    </section>
  );
}
