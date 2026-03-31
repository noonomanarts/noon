'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { formatDurationClock } from '@/lib/formatDuration';

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
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatSlot(locale: Locale, value: string) {
  return new Date(`2000-01-01T${value}:00+04:00`).toLocaleTimeString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMonth(locale: Locale, value: string) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    month: 'long',
    year: 'numeric',
  });
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PublicEventAvailabilityPicker({
  locale,
  eventType,
  classType,
  selectedDate,
  selectedTime,
  layoutVariant = 'cards',
  onChange,
}: {
  locale: Locale;
  eventType: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
  classType?: 'cooking' | 'arts-crafts';
  selectedDate: string;
  selectedTime: string;
  layoutVariant?: 'cards' | 'tables';
  onChange: (value: { date: string; time: string }) => void;
}) {
  const isArabic = locale === 'ar';
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonthKey, setVisibleMonthKey] = useState<string>('');

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

  const daysByDate = useMemo(() => {
    const map = new Map<string, AvailabilityResponse['days'][number]>();
    availability?.days.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [availability]);

  const availableMonthKeys = useMemo(() => {
    if (!availability) return [];
    return Array.from(new Set(availability.days.map((day) => day.date.slice(0, 7))));
  }, [availability]);

  useEffect(() => {
    if (availableMonthKeys.length === 0) {
      setVisibleMonthKey('');
      return;
    }

    const selectedMonthKey = selectedDate.slice(0, 7);
    setVisibleMonthKey((previous) => {
      if (availableMonthKeys.includes(selectedMonthKey)) {
        return selectedMonthKey;
      }
      if (previous && availableMonthKeys.includes(previous)) {
        return previous;
      }
      return availableMonthKeys[0];
    });
  }, [availableMonthKeys, selectedDate]);

  const monthGrid = useMemo(() => {
    if (!visibleMonthKey) return [];

    const base = new Date(`${visibleMonthKey}-01T00:00:00`);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ dateKey: string; dayNumber: number; availabilityDay?: AvailabilityResponse['days'][number] } | null> = [];

    for (let index = 0; index < startWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDate; day += 1) {
      const dateKey = `${visibleMonthKey}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateKey,
        dayNumber: day,
        availabilityDay: daysByDate.get(dateKey),
      });
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    while (cells.length < totalCells) {
      cells.push(null);
    }

    return cells;
  }, [daysByDate, visibleMonthKey]);

  const durationLabel = useMemo(() => {
    if (!availability) return '';
    return formatDurationClock(availability.durationMinutes);
  }, [availability]);

  const weekDayHeaders = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) =>
      new Date(`2025-01-${String(5 + index).padStart(2, '0')}T00:00:00`).toLocaleDateString(
        locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM',
        { weekday: 'short' }
      )
    );
  }, [locale]);

  const t = {
    title: isArabic ? 'التواريخ والأوقات المتاحة' : 'Available Dates & Times',
    subtitle: isArabic
      ? 'الأسلات المعروضة مباشرة من جدول نون وتُحدَّث حسب الحجوزات والبلوكات.'
      : 'Slots are pulled directly from Noon availability and update around bookings and blocks.',
    duration: isArabic ? 'مدة الحجز' : 'Booking length',
    timezone: isArabic ? 'المنطقة الزمنية' : 'Timezone',
    chooseDay: isArabic ? 'اختاري اليوم' : 'Choose a day',
    chooseTime: isArabic ? 'اختاري الوقت' : 'Choose a time',
    dayColumn: isArabic ? 'التاريخ' : 'Date',
    slotsColumn: isArabic ? 'الأوقات' : 'Slots',
    timeColumn: isArabic ? 'الوقت' : 'Time',
    durationColumn: isArabic ? 'المدة' : 'Duration',
    prev: isArabic ? 'السابق' : 'Prev',
    next: isArabic ? 'التالي' : 'Next',
    today: isArabic ? 'اليوم' : 'Today',
    selectedDate: isArabic ? 'التاريخ المختار' : 'Selected date',
    noTimesForDay: isArabic ? 'لا توجد أوقات متاحة لهذا اليوم.' : 'No available times for this date.',
    loading: isArabic ? 'جاري تحميل التوفر...' : 'Loading availability...',
    empty: isArabic ? 'لا توجد مواعيد متاحة حالياً. جرّبي لاحقاً.' : 'No slots are currently available. Please check back later.',
    retry: isArabic ? 'إعادة المحاولة' : 'Retry',
  };

  if (loading) {
    return (
      <div className="noon-border-strong rounded-3xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
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
      <div className="noon-border-strong rounded-3xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <p className="text-sm text-[color:var(--text-muted)]">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="noon-border-strong rounded-3xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
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

      {layoutVariant === 'tables' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseDay}</p>
            <div className="noon-border-strong overflow-hidden rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const index = availableMonthKeys.indexOf(visibleMonthKey);
                      if (index > 0) {
                        setVisibleMonthKey(availableMonthKeys[index - 1]);
                      }
                    }}
                    disabled={availableMonthKeys.indexOf(visibleMonthKey) <= 0}
                    className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.prev}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const index = availableMonthKeys.indexOf(visibleMonthKey);
                      if (index >= 0 && index < availableMonthKeys.length - 1) {
                        setVisibleMonthKey(availableMonthKeys[index + 1]);
                      }
                    }}
                    disabled={
                      availableMonthKeys.indexOf(visibleMonthKey) < 0 ||
                      availableMonthKeys.indexOf(visibleMonthKey) >= availableMonthKeys.length - 1
                    }
                    className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t.next}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const todayKey = toDateKey(new Date());
                      const todayMonth = todayKey.slice(0, 7);
                      if (availableMonthKeys.includes(todayMonth)) {
                        setVisibleMonthKey(todayMonth);
                      }
                      const day = daysByDate.get(todayKey);
                      if (day) {
                        onChange({ date: day.date, time: day.slots[0]?.time ?? '' });
                      }
                    }}
                    className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
                  >
                    {t.today}
                  </button>
                </div>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {visibleMonthKey ? formatMonth(locale, visibleMonthKey) : '--'}
                </p>
              </div>

              <div className="grid grid-cols-7 border-b border-[color:var(--border)] bg-[color:var(--muted)]/60 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
                {weekDayHeaders.map((dayName, index) => (
                  <div key={`${index}-${dayName}`} className="px-1 py-2">
                    {dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGrid.map((cell, index) => {
                  if (!cell) {
                    return (
                      <div
                        key={`blank-${index}`}
                        className="aspect-square border-b border-r border-[color:var(--border)] bg-[color:var(--muted)]/30"
                      />
                    );
                  }

                  const day = cell.availabilityDay;
                  const isSelected = cell.dateKey === selectedDay.date;
                  const isToday = cell.dateKey === toDateKey(new Date());

                  if (!day) {
                    return (
                      <div
                        key={cell.dateKey}
                        className="aspect-square border-b border-r border-[color:var(--border)] bg-[color:var(--surface)]/70 p-1.5 text-[color:var(--text-subtle)]"
                      >
                        <div className="text-xs font-semibold opacity-60">{cell.dayNumber}</div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => {
                        const hasSelectedTime = day.slots.some((slot) => slot.time === selectedTime);
                        onChange({
                          date: day.date,
                          time: hasSelectedTime ? selectedTime : day.slots[0]?.time ?? '',
                        });
                      }}
                      className={`aspect-square border-b border-r border-[color:var(--border)] p-1.5 text-left transition ${
                        isSelected
                          ? 'bg-[color:var(--primary)]/12'
                          : 'bg-[color:var(--surface)] hover:bg-[color:var(--muted)]/60'
                      }`}
                    >
                      <div className="flex items-start">
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                            isToday
                              ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                              : 'bg-[color:var(--muted)] text-[color:var(--text)]'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseTime}</p>
            <div className="mb-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 py-2 text-sm">
              <span className="font-semibold text-[color:var(--text)]">{t.selectedDate}: </span>
              <span className="text-[color:var(--text-muted)]">{formatDay(locale, selectedDay.date)}</span>
            </div>
            <div className="noon-border-strong overflow-hidden rounded-2xl border-2 border-[color:var(--border)]">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[color:var(--muted)]/70">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[color:var(--text)]">{t.timeColumn}</th>
                    <th className="px-4 py-3 text-left font-semibold text-[color:var(--text)]">{t.durationColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDay.slots.length === 0 ? (
                    <tr className="border-t border-[color:var(--border)]">
                      <td colSpan={2} className="px-4 py-4 text-sm text-[color:var(--text-muted)]">
                        {t.noTimesForDay}
                      </td>
                    </tr>
                  ) : (
                    selectedDay.slots.map((slot) => {
                      const isSelected = selectedDay.date === selectedDate && slot.time === selectedTime;
                      return (
                        <tr
                          key={slot.startDateTime}
                          className={`border-t border-[color:var(--border)] transition ${
                            isSelected
                              ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                              : 'hover:bg-[color:var(--muted)]/60'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onChange({ date: selectedDay.date, time: slot.time })}
                              className="w-full text-left font-semibold"
                            >
                              {formatSlot(locale, slot.time)}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onChange({ date: selectedDay.date, time: slot.time })}
                              className="w-full text-left"
                            >
                              {durationLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
