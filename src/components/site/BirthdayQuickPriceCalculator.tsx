'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers } from 'react-icons/fi';

import type { Locale } from '@/lib/locale';
import {
  BIRTHDAY_PARTY_ADDITIONAL_PERSON_AMOUNT,
  BIRTHDAY_PARTY_BASE_AMOUNT,
  BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS,
  getBirthdayPartyTotal,
} from '@/lib/competitionPricing';

export default function BirthdayQuickPriceCalculator({
  locale,
}: {
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [participantsInput, setParticipantsInput] = useState('16');

  const participants = Number.parseInt(participantsInput, 10);
  const isParticipantsValid = Number.isInteger(participants) && participants >= 1 && participants <= 40;
  const safeParticipants = Number.isInteger(participants) ? participants : 0;
  const additionalCount = Math.max(0, safeParticipants - BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS);

  const total = useMemo(() => {
    if (!isParticipantsValid) return null;
    return getBirthdayPartyTotal(participants);
  }, [isParticipantsValid, participants]);

  const t = {
    title: isArabic ? 'احسب السعر مباشرة' : 'Quick Price Calculator',
    participants: isArabic ? 'عدد المشاركين' : 'Participants',
    participantsHint: isArabic ? 'من 1 إلى 40 مشارك' : 'From 1 to 40 participants',
    invalidParticipants: isArabic ? 'يرجى إدخال عدد صحيح بين 1 و40.' : 'Please enter a valid number between 1 and 40.',
    basePackage: isArabic ? 'الباقة الأساسية' : 'Base package',
    additional: isArabic ? 'إضافي لكل مشارك' : 'Additional per person',
    additionalCount: isArabic ? 'عدد المشاركين الإضافيين' : 'Additional participants count',
    total: isArabic ? 'الإجمالي التقديري' : 'Estimated total',
    continueBooking: isArabic ? 'متابعة الحجز' : 'Continue to Booking',
  };

  return (
    <section className="mx-auto mt-6 w-full max-w-6xl px-4">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{t.title}</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
              <FiUsers className="h-3.5 w-3.5 text-coral" />
              {t.participants}
            </label>
            <input
              type="number"
              min="1"
              max="40"
              value={participantsInput}
              onChange={(event) => setParticipantsInput(event.target.value)}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none transition focus:border-coral"
            />
            <p className="mt-2 text-xs text-[color:var(--text-subtle)]">{t.participantsHint}</p>
            {!isParticipantsValid ? (
              <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{t.invalidParticipants}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4">
            <p className="text-sm text-[color:var(--text-muted)]">
              {t.basePackage}: <span className="font-semibold text-[color:var(--text)]">{BIRTHDAY_PARTY_BASE_AMOUNT} OMR ({BIRTHDAY_PARTY_BASE_INCLUDED_PARTICIPANTS})</span>
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              {t.additional}: <span className="font-semibold text-[color:var(--text)]">{BIRTHDAY_PARTY_ADDITIONAL_PERSON_AMOUNT} OMR</span>
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              {t.additionalCount}: <span className="font-semibold text-[color:var(--text)]">{additionalCount}</span>
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              {t.total}: <span className="font-semibold text-[color:var(--text)]">{total !== null ? `${total} OMR` : '--'}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isParticipantsValid) return;
            router.push(`/${locale}/group-booking-events/birthday-parties/book?participants=${participants}`);
          }}
          disabled={!isParticipantsValid}
          className="mt-4 w-full rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.continueBooking}
        </button>
      </div>
    </section>
  );
}
