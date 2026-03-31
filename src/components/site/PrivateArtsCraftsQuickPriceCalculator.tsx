'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiAlertCircle, FiUsers } from 'react-icons/fi';

import type { Locale } from '@/lib/locale';
import {
  getPrivateArtsCraftsClassPricePerPerson,
  getPrivateArtsCraftsClassTotal,
} from '@/lib/competitionPricing';

export default function PrivateArtsCraftsQuickPriceCalculator({
  locale,
}: {
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [participantsInput, setParticipantsInput] = useState('6');

  const participants = Number.parseInt(participantsInput, 10);
  const isParticipantsValid = Number.isInteger(participants) && participants >= 6 && participants <= 200;

  const pricing = useMemo(() => {
    if (!isParticipantsValid) return { perPerson: null, total: null };
    return {
      perPerson: getPrivateArtsCraftsClassPricePerPerson(participants),
      total: getPrivateArtsCraftsClassTotal(participants),
    };
  }, [isParticipantsValid, participants]);

  const requiresExternalVenue = isParticipantsValid && participants > 12;

  const t = {
    title: isArabic ? 'احسب السعر مباشرة' : 'Quick Price Calculator',
    participants: isArabic ? 'عدد المشاركين' : 'Participants',
    participantsHint: isArabic ? 'من 6 مشاركين وأكثر' : 'From 6 participants and above',
    invalidParticipants: isArabic ? 'يرجى إدخال عدد صحيح من 6 إلى 200.' : 'Please enter a valid number between 6 and 200.',
    perPerson: isArabic ? 'سعر الفرد' : 'Per person',
    total: isArabic ? 'الإجمالي التقديري' : 'Estimated total',
    continueBooking: isArabic ? 'متابعة الحجز' : 'Continue to Booking',
    venueNote: isArabic
      ? 'للمجموعات الأكبر من 12 مشاركا قد يلزم موقع خارجي مناسب، وتضاف تكلفة الإيجار على السعر النهائي.'
      : 'For groups above 12, a suitable external venue may be required and rental cost is added to the final workshop price.',
  };

  return (
    <div className="mt-5 rounded-xl border border-coral/25 bg-[color:var(--surface)]/90 p-4">
      <h4 className="text-sm font-semibold text-[color:var(--text)]">{t.title}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
            <FiUsers className="h-3.5 w-3.5 text-coral" />
            {t.participants}
          </label>
          <input
            type="number"
            min="6"
            max="200"
            value={participantsInput}
            onChange={(event) => setParticipantsInput(event.target.value)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)] outline-none transition focus:border-coral"
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

          {requiresExternalVenue ? (
            <p className="inline-flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.venueNote}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!isParticipantsValid) return;
              router.push(`/${locale}/group-booking-events/private-classes/book?type=arts-crafts&participants=${participants}`);
            }}
            disabled={!isParticipantsValid}
            className="w-full rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.continueBooking}
          </button>
        </div>
      </div>
    </div>
  );
}
