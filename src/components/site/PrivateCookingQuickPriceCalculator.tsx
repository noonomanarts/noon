'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers } from 'react-icons/fi';

import type { Locale } from '@/lib/locale';
import {
  getPrivateCookingClassPricePerPerson,
  getPrivateCookingClassTotal,
} from '@/lib/competitionPricing';

export default function PrivateCookingQuickPriceCalculator({
  locale,
}: {
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [participantsInput, setParticipantsInput] = useState('6');

  const participants = Number.parseInt(participantsInput, 10);
  const isParticipantsValid = Number.isInteger(participants) && participants >= 6 && participants <= 32;

  const pricing = useMemo(() => {
    if (!isParticipantsValid) return { perPerson: null, total: null };
    return {
      perPerson: getPrivateCookingClassPricePerPerson(participants),
      total: getPrivateCookingClassTotal(participants),
    };
  }, [isParticipantsValid, participants]);

  const t = {
    title: isArabic ? 'احسب السعر مباشرة' : 'Quick Price Calculator',
    participants: isArabic ? 'عدد المشاركين' : 'Participants',
    participantsHint: isArabic ? 'من 6 إلى 32 مشارك' : 'From 6 to 32 participants',
    invalidParticipants: isArabic ? 'يرجى إدخال عدد صحيح بين 6 و32.' : 'Please enter a valid number between 6 and 32.',
    perPerson: isArabic ? 'سعر الفرد' : 'Per person',
    total: isArabic ? 'الإجمالي التقديري' : 'Estimated total',
    continueBooking: isArabic ? 'متابعة الحجز' : 'Continue to Booking',
  };

  return (
    <div className="mt-5 rounded-xl border border-teal/25 bg-[color:var(--surface)]/90 p-4">
      <h4 className="text-sm font-semibold text-[color:var(--text)]">{t.title}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
            <FiUsers className="h-3.5 w-3.5 text-teal" />
            {t.participants}
          </label>
          <input
            type="number"
            min="6"
            max="32"
            value={participantsInput}
            onChange={(event) => setParticipantsInput(event.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none transition focus:border-teal"
          />
          <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{t.participantsHint}</p>
          {!isParticipantsValid ? (
            <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{t.invalidParticipants}</p>
          ) : null}
        </div>

        <div className="space-y-3 sm:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">{t.perPerson}</p>
              <p className="mt-1 text-base font-semibold text-[color:var(--text)]">
                {pricing.perPerson !== null ? `${pricing.perPerson} OMR` : '--'}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--muted)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">{t.total}</p>
              <p className="mt-1 text-base font-semibold text-[color:var(--text)]">
                {pricing.total !== null ? `${pricing.total} OMR` : '--'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!isParticipantsValid) return;
              router.push(`/${locale}/group-booking-events/private-classes/book?type=cooking&participants=${participants}`);
            }}
            disabled={!isParticipantsValid}
            className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.continueBooking}
          </button>
        </div>
      </div>
    </div>
  );
}
