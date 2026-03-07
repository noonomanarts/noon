'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';

type AvailabilityResponse = {
  days: Array<{
    date: string;
    slots: Array<{
      startDateTime: string;
      endDateTime: string;
      time: string;
    }>;
  }>;
  durationMinutes: number;
  timezone: string;
};

function formatDay(locale: Locale, value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatSlot(locale: Locale, value: string) {
  return new Date(`2000-01-01T${value}:00+04:00`).toLocaleTimeString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PublicEventAvailabilityPicker({
  locale,
  eventType,
  classType,
  selectedDate,
  selectedTime,
  onChange,
}: {
  locale: Locale;
  eventType: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
  classType?: 'cooking' | 'arts-crafts';
  selectedDate: string;
  selectedTime: string;
  onChange: (value: { date: string; time: string }) => void;
}) {
  const isArabic = locale === 'ar';
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadAvailability = async () => {
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          eventType,
          days: '45',
        });

        if (classType) {
          searchParams.set('classType', classType);
        }

        const response = await fetch(`/api/public/calendar?${searchParams.toString()}`, {
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => ({}))) as AvailabilityResponse & {
          error?: string;
        };

        if (!response.ok || !Array.isArray(payload.days)) {
          throw new Error(payload.error || 'Failed to load availability');
        }

        if (ignore) return;
        setAvailability(payload);

        const firstDay = payload.days[0];
        const hasSelectedSlot = payload.days.some((day) =>
          day.date === selectedDate && day.slots.some((slot) => slot.time === selectedTime)
        );

        if (!hasSelectedSlot && firstDay?.slots[0]) {
          onChange({ date: firstDay.date, time: firstDay.slots[0].time });
        }
      } catch (requestError) {
        if (ignore) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load availability');
        setAvailability(null);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadAvailability();

    return () => {
      ignore = true;
    };
    // Selection changes should not re-fetch the availability grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classType, eventType]);

  const selectedDay =
    availability?.days.find((day) => day.date === selectedDate) ??
    availability?.days[0] ??
    null;

  const durationLabel = useMemo(() => {
    if (!availability) return '';
    const hours = availability.durationMinutes / 60;
    return isArabic ? `${hours} ساعات` : `${hours} hours`;
  }, [availability, isArabic]);

  const t = {
    title: isArabic ? 'التواريخ والأوقات المتاحة' : 'Available Dates & Times',
    subtitle: isArabic
      ? 'الأسلات المعروضة مباشرة من جدول نون وتُحدَّث حسب الحجوزات والبلوكات.'
      : 'Slots are pulled directly from Noon availability and update around bookings and blocks.',
    duration: isArabic ? 'مدة الحجز' : 'Booking length',
    timezone: isArabic ? 'المنطقة الزمنية' : 'Timezone',
    chooseDay: isArabic ? 'اختاري اليوم' : 'Choose a day',
    chooseTime: isArabic ? 'اختاري الوقت' : 'Choose a time',
    loading: isArabic ? 'جاري تحميل التوفر...' : 'Loading availability...',
    empty: isArabic ? 'لا توجد مواعيد متاحة حالياً. جرّبي لاحقاً.' : 'No slots are currently available. Please check back later.',
    retry: isArabic ? 'إعادة المحاولة' : 'Retry',
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <p className="text-sm text-[color:var(--text-muted)]">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded-xl border border-rose-300 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/30"
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (!availability || availability.days.length === 0 || !selectedDay) {
    return (
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <p className="text-sm text-[color:var(--text-muted)]">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-5">
        <div>
          <h3 className="text-xl font-semibold text-[color:var(--text)]">{t.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-[color:var(--text-subtle)]">
          <span className="rounded-full bg-[color:var(--muted)] px-3 py-1.5">
            {t.duration}: {durationLabel}
          </span>
          <span className="rounded-full bg-[color:var(--muted)] px-3 py-1.5">
            {t.timezone}: {availability.timezone}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseDay}</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {availability.days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => onChange({ date: day.date, time: day.slots[0]?.time ?? '' })}
              className={`min-w-[110px] rounded-2xl border px-4 py-3 text-start transition ${
                day.date === selectedDay.date
                  ? 'border-[color:var(--primary)] bg-[color:var(--muted)] shadow-sm'
                  : 'border-[color:var(--border)] hover:border-[color:var(--primary)]/40'
              }`}
            >
              <p className="text-sm font-semibold text-[color:var(--text)]">{formatDay(locale, day.date)}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {isArabic ? `${day.slots.length} أوقات` : `${day.slots.length} slots`}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseTime}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedDay.slots.map((slot) => (
            <button
              key={slot.startDateTime}
              type="button"
              onClick={() => onChange({ date: selectedDay.date, time: slot.time })}
              className={`rounded-2xl border px-4 py-4 text-start transition ${
                selectedDay.date === selectedDate && slot.time === selectedTime
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-lg'
                  : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--muted)]'
              }`}
            >
              <p className="text-base font-semibold">{formatSlot(locale, slot.time)}</p>
              <p className="mt-1 text-xs opacity-80">{durationLabel}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
