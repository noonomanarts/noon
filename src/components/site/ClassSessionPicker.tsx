'use client';

import type { Locale } from '@/lib/locale';

const DISPLAY_TIMEZONE = 'Asia/Muscat';

type SessionItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  seatsTotal: number | null;
  seatsBooked: number;
  seatsAvailable: number;
};

function toDateKey(rawDate: string) {
  const date = new Date(rawDate);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  const day = parts.find((part) => part.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function formatDay(locale: Locale, rawDate: string) {
  return new Date(rawDate).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: DISPLAY_TIMEZONE,
  });
}

function formatTime(locale: Locale, rawDate: string) {
  return new Date(rawDate).toLocaleTimeString(locale === 'ar' ? 'ar-OM' : 'en-OM', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  });
}

export default function ClassSessionPicker({
  locale,
  sessions,
  selectedSessionId,
  onSelect,
}: {
  locale: Locale;
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelect: (sessionId: string) => void;
}) {
  const isArabic = locale === 'ar';
  const grouped = sessions.reduce<Record<string, SessionItem[]>>((accumulator, session) => {
    const dateKey = toDateKey(session.startTime);
    accumulator[dateKey] = accumulator[dateKey] ? [...accumulator[dateKey], session] : [session];
    return accumulator;
  }, {});

  const days = Object.entries(grouped)
    .map(([date, daySessions]) => ({
      date,
      sessions: daySessions.sort((left, right) => left.startTime.localeCompare(right.startTime)),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const selectedDay =
    days.find((day) => day.sessions.some((session) => session.id === selectedSessionId)) ?? days[0] ?? null;

  const t = {
    title: isArabic ? 'التقويم والجلسات المتاحة' : 'Calendar & Available Sessions',
    subtitle: isArabic
      ? 'اختَر اليوم ثم الموعد المناسب، وسترى المقاعد المتبقية لكل جلسة.'
      : 'Pick a day first, then choose the session that still has seats available.',
    chooseDay: isArabic ? 'اختَر اليوم' : 'Choose a day',
    chooseSession: isArabic ? 'اختَر الجلسة' : 'Choose a session',
    soldOut: isArabic ? 'مكتملة' : 'Sold out',
    seats: isArabic ? 'مقاعد متاحة' : 'seats left',
  };

  if (!selectedDay) return null;

  return (
    <div className="noon-border-strong rounded-2xl border-2 border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.title}</h2>
      <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseDay}</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {days.map((day) => {
            const availableCount = day.sessions.filter((session) => session.seatsAvailable > 0).length;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelect(day.sessions.find((session) => session.seatsAvailable > 0)?.id ?? day.sessions[0].id)}
                className={`min-w-[118px] rounded-2xl border px-4 py-3 text-start transition ${
                  day.date === selectedDay.date
                    ? 'border-[color:var(--primary)] bg-[color:var(--muted)]'
                    : 'border-[color:var(--border)] hover:border-[color:var(--primary)]/40'
                }`}
              >
                <p className="text-sm font-semibold text-[color:var(--text)]">{formatDay(locale, `${day.date}T00:00:00`)}</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {isArabic ? `${availableCount} متاحة` : `${availableCount} open`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-[color:var(--text)]">{t.chooseSession}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {selectedDay.sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect(session.id)}
              disabled={session.seatsAvailable <= 0}
              className={`rounded-2xl border px-4 py-4 text-start transition ${
                selectedSessionId === session.id
                  ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-lg'
                  : session.seatsAvailable <= 0
                    ? 'cursor-not-allowed border-[color:var(--border)] opacity-55'
                    : 'border-[color:var(--border)] hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--muted)]'
              }`}
            >
              <p className="text-base font-semibold">{formatTime(locale, session.startTime)}</p>
              <p className="mt-1 text-xs opacity-80">
                {session.seatsAvailable > 0
                  ? `${session.seatsAvailable} ${t.seats}`
                  : t.soldOut}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
