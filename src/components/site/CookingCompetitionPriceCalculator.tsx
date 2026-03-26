'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers } from 'react-icons/fi';
import { MdCalculate } from 'react-icons/md';

import type { Locale } from '@/lib/locale';
import {
  STANDARD_COMPETITION_PRICE_TIERS,
  getStandardCompetitionTier,
  getStandardCompetitionTotal,
} from '@/lib/competitionPricing';

type PackageType = 'STANDARD' | 'PREMIUM';

export default function CookingCompetitionPriceCalculator({
  locale,
}: {
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [packageType, setPackageType] = useState<PackageType>('STANDARD');
  const [participantsInput, setParticipantsInput] = useState('8');

  const participants = Number.parseInt(participantsInput, 10);
  const isParticipantsValid = Number.isInteger(participants) && participants >= 8 && participants <= 40;

  const pricing = useMemo(() => {
    if (!isParticipantsValid) {
      return {
        tier: null,
        subtotal: null,
      };
    }

    return {
      tier: getStandardCompetitionTier(participants),
      subtotal: getStandardCompetitionTotal(participants),
    };
  }, [isParticipantsValid, participants]);

  const t = {
    title: isArabic ? 'حاسبة السعر' : 'Price Calculator',
    subtitle: isArabic
      ? 'أدخلي عدد المشاركين لاختيار السعر تلقائياً حسب الشرائح، ثم تابعي للحجز.'
      : 'Enter participants to auto-calculate the tier price, then continue to booking.',
    choosePackage: isArabic ? 'اختيار الباقة' : 'Choose package',
    standard: isArabic ? 'قياسية' : 'Standard',
    premium: isArabic ? 'مميزة' : 'Premium',
    participants: isArabic ? 'عدد المشاركين' : 'Participants',
    participantsHint: isArabic ? 'من 8 إلى 40 مشارك' : 'From 8 to 40 participants',
    perPerson: isArabic ? 'سعر الفرد' : 'Per person',
    subtotal: isArabic ? 'الإجمالي التقديري' : 'Estimated total',
    premiumNote: isArabic ? 'سعر الباقة المميزة حسب الطلب' : 'Premium package is priced on request',
    continueBooking: isArabic ? 'متابعة الحجز' : 'Continue to Booking',
    pricingFormula: isArabic ? 'شرائح التسعير (قياسية)' : 'Standard Pricing Formula',
    range: isArabic ? 'العدد' : 'Range',
    price: isArabic ? 'السعر / فرد' : 'Price / person',
    invalidParticipants: isArabic ? 'يرجى إدخال عدد صحيح بين 8 و40.' : 'Please enter a valid number between 8 and 40.',
  };

  const handleContinue = () => {
    if (!isParticipantsValid) return;
    const packageQuery = packageType.toLowerCase();
    router.push(
      `/${locale}/group-booking-events/cooking-competition/book?package=${packageQuery}&participants=${participants}`
    );
  };

  return (
    <section className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <MdCalculate className="h-5 w-5 text-coral" />
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{t.title}</h3>
      </div>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
              {t.choosePackage}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPackageType('STANDARD')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  packageType === 'STANDARD'
                    ? 'border-teal bg-teal text-white'
                    : 'border-[color:var(--border)] text-[color:var(--text)] hover:border-teal/40'
                }`}
              >
                {t.standard}
              </button>
              <button
                type="button"
                onClick={() => setPackageType('PREMIUM')}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  packageType === 'PREMIUM'
                    ? 'border-coral bg-coral text-white'
                    : 'border-[color:var(--border)] text-[color:var(--text)] hover:border-coral/40'
                }`}
              >
                {t.premium}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
              <FiUsers className="h-4 w-4 text-teal" />
              {t.participants}
            </label>
            <input
              type="number"
              min="8"
              max="40"
              value={participantsInput}
              onChange={(event) => setParticipantsInput(event.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none transition focus:border-coral"
            />
            <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{t.participantsHint}</p>
            {!isParticipantsValid ? (
              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{t.invalidParticipants}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!isParticipantsValid}
            className="w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.continueBooking}
          </button>
        </div>

        <div className="space-y-4 rounded-xl border border-[color:var(--border)] p-4">
          <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">{t.perPerson}</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
              {packageType === 'STANDARD'
                ? pricing.tier
                  ? `${pricing.tier.pricePerPerson} OMR`
                  : '--'
                : t.premiumNote}
            </p>
          </div>

          <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">{t.subtotal}</p>
            <p className="mt-1 text-lg font-semibold text-[color:var(--text)]">
              {packageType === 'STANDARD' ? (pricing.subtotal !== null ? `${pricing.subtotal} OMR` : '--') : t.premiumNote}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-[color:var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--muted)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[color:var(--text)]">{t.range}</th>
                  <th className="px-3 py-2 text-left font-semibold text-[color:var(--text)]">{t.price}</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_COMPETITION_PRICE_TIERS.map((tier) => (
                  <tr
                    key={`${tier.minParticipants}-${tier.maxParticipants}`}
                    className={
                      pricing.tier?.minParticipants === tier.minParticipants
                        ? 'bg-teal/10'
                        : 'border-t border-[color:var(--border)]'
                    }
                  >
                    <td className="px-3 py-2 text-[color:var(--text-muted)]">
                      {tier.minParticipants}-{tier.maxParticipants}
                    </td>
                    <td className="px-3 py-2 font-semibold text-[color:var(--text)]">{tier.pricePerPerson} OMR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-[color:var(--text-subtle)]">{t.pricingFormula}</p>
    </section>
  );
}
