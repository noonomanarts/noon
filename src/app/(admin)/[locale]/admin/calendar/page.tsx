'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type CalendarEvent = {
  id: string;
  type: 'CLASS' | 'PRIVATE_SESSION' | 'COMPETITION' | 'BIRTHDAY_PARTY' | 'BLOCKED' | 'CLEANING';
  startDateTime: string;
  endDateTime: string;
  title: string;
  description?: string;
  isBlocked: boolean;
  blockReason?: string;
  classSession?: {
    class: {
      id: string;
      title: string;
      category: string;
      trainer: {
        fullName: string;
      } | null;
    } | null;
  } | null;
  eventBooking?: {
    id: string;
    bookingNumber: string;
    eventType: string;
    fullName: string;
    status: string;
  } | null;
};

type CreatableCalendarType = 'BLOCKED' | 'CLEANING' | 'PRIVATE_SESSION' | 'COMPETITION' | 'BIRTHDAY_PARTY';

type CalendarItemForm = {
  type: CreatableCalendarType;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  blockReason: string;
  internalNotes: string;
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CREATABLE_TYPE_LABEL: Record<CreatableCalendarType, string> = {
  BLOCKED: 'Blocked time',
  CLEANING: 'Cleaning window',
  PRIVATE_SESSION: 'Private session',
  COMPETITION: 'Competition',
  BIRTHDAY_PARTY: 'Birthday party',
};

const EVENT_THEME: Record<CalendarEvent['type'], { badge: string; dot: string; label: string }> = {
  CLASS: {
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    dot: 'bg-sky-500',
    label: 'Class',
  },
  PRIVATE_SESSION: {
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200',
    dot: 'bg-teal-500',
    label: 'Private',
  },
  COMPETITION: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200',
    dot: 'bg-orange-500',
    label: 'Competition',
  },
  BIRTHDAY_PARTY: {
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-200',
    dot: 'bg-pink-500',
    label: 'Birthday',
  },
  BLOCKED: {
    badge: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    dot: 'bg-zinc-500',
    label: 'Blocked',
  },
  CLEANING: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    dot: 'bg-amber-500',
    label: 'Cleaning',
  },
};

const TIME_PRESETS = [
  { label: '09:00 - 11:00', start: '09:00', end: '11:00' },
  { label: '12:00 - 14:00', start: '12:00', end: '14:00' },
  { label: '15:00 - 17:00', start: '15:00', end: '17:00' },
  { label: '18:00 - 20:00', start: '18:00', end: '20:00' },
];

function toDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-OM', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(start: string, end: string): string {
  return `${new Date(start).toLocaleTimeString('en-OM', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${new Date(end).toLocaleTimeString('en-OM', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function defaultTitleForType(type: CreatableCalendarType): string {
  if (type === 'BLOCKED') return 'Studio block';
  if (type === 'CLEANING') return 'Cleaning window';
  if (type === 'PRIVATE_SESSION') return 'Private session';
  if (type === 'COMPETITION') return 'Competition slot';
  return 'Birthday party';
}

function createEmptyItemForm(date: string, type: CreatableCalendarType = 'BLOCKED'): CalendarItemForm {
  return {
    type,
    title: defaultTitleForType(type),
    description: '',
    startDate: date,
    startTime: '10:00',
    endDate: date,
    endTime: '12:00',
    blockReason: '',
    internalNotes: '',
  };
}

function toMuscatDateTime(date: string, time: string): string {
  return `${date}T${time}:00+04:00`;
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(true);
  const [creatingItem, setCreatingItem] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<CalendarItemForm>(() => createEmptyItemForm(toDateKey(new Date())));

  useEffect(() => {
    void fetchEvents();
  }, [currentMonth]);

  useEffect(() => {
    setItemForm((prev) => ({
      ...prev,
      startDate: selectedDate,
      endDate: selectedDate,
    }));
  }, [selectedDate]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
      const endDate = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
      const response = await fetch(
        `/api/admin/calendar?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`,
        { cache: 'no-store' }
      );
      const payload = (await response.json().catch(() => [])) as CalendarEvent[] | { error?: string };

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(!Array.isArray(payload) && typeof payload.error === 'string' ? payload.error : 'Failed to load calendar');
      }

      setEvents(payload);
    } catch (requestError) {
      setEvents([]);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const monthGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateKey: string; dayNumber: number } | null> = [];

    for (let index = 0; index < startWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDate; day += 1) {
      const cellDate = new Date(year, month, day);
      cells.push({
        dateKey: toDateKey(cellDate),
        dayNumber: day,
      });
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    while (cells.length < totalCells) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((accumulator, event) => {
      const dateKey = toDateKey(event.startDateTime);
      accumulator[dateKey] = accumulator[dateKey] ? [...accumulator[dateKey], event] : [event];
      accumulator[dateKey].sort(
        (left, right) => new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime()
      );
      return accumulator;
    }, {});
  }, [events]);

  const selectedDayEvents = eventsByDate[selectedDate] ?? [];

  const totalClasses = events.filter((event) => event.type === 'CLASS').length;
  const totalEvents = events.filter(
    (event) => event.type !== 'CLASS' && event.type !== 'BLOCKED' && event.type !== 'CLEANING'
  ).length;
  const totalBlocks = events.filter((event) => event.isBlocked).length;

  const upcoming = useMemo(() => {
    return [...events]
      .filter((event) => new Date(event.endDateTime).getTime() >= Date.now())
      .sort((left, right) => new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime())
      .slice(0, 8);
  }, [events]);

  const openDayPlanner = (dateKey: string, presetType?: CreatableCalendarType) => {
    setSelectedDate(dateKey);
    setItemForm(createEmptyItemForm(dateKey, presetType ?? 'BLOCKED'));
    setIsComposerOpen(true);
    setIsDayModalOpen(true);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  const handleCreateItem = async () => {
    const startDateTime = toMuscatDateTime(itemForm.startDate, itemForm.startTime);
    const endDateTime = toMuscatDateTime(itemForm.endDate, itemForm.endTime);

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError('Please choose a valid start/end time.');
      return;
    }

    setCreatingItem(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: itemForm.type,
          title: itemForm.title,
          description: itemForm.description,
          startDateTime,
          endDateTime,
          blockReason: itemForm.blockReason,
          internalNotes: itemForm.internalNotes,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create calendar item');
      }

      setItemForm(createEmptyItemForm(selectedDate, itemForm.type));
      await fetchEvents();
      setIsComposerOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create calendar item');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteItem = async (eventId: string) => {
    setDeletingEventId(eventId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/calendar/${eventId}`, {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete item');
      }

      await fetchEvents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete item');
    } finally {
      setDeletingEventId(null);
    }
  };

  const showBlockFields = itemForm.type === 'BLOCKED' || itemForm.type === 'CLEANING';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--noon-teal)]">Operations Calendar</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Classes, events, and blocked studio time
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Mobile-friendly calendar for daily planning. Tap any day to open the planner modal, pick time, and add blocks,
            cleaning windows, or manual event items.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => openDayPlanner(selectedDate, 'BLOCKED')}
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Add block
          </button>
          <Link
            href="./classes"
            className="inline-flex items-center rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Manage classes
          </Link>
          <Link
            href="./events"
            className="inline-flex items-center rounded-xl bg-[color:var(--noon-coral)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Manage event requests
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Classes on calendar</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalClasses}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Events on calendar</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalEvents}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Blocks and cleaning windows</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalBlocks}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.65fr)]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Next
              </button>
              <div className="sm:ms-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                  {currentMonth.toLocaleDateString('en-OM', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">Tap any day to open planner modal.</p>
              </div>
            </div>

            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
              {Object.values(EVENT_THEME).map((theme) => (
                <span
                  key={theme.label}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  <span className={`size-2.5 rounded-full ${theme.dot}`} />
                  {theme.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center sm:min-h-[420px]">
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                Loading calendar
              </div>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 sm:text-xs">
                {WEEK_DAYS.map((dayName) => (
                  <div key={dayName} className="px-1 py-2 sm:px-2 sm:py-3">
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
                        className="min-h-[74px] border-b border-r border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/20 sm:min-h-[120px]"
                      />
                    );
                  }

                  const dayEvents = eventsByDate[cell.dateKey] ?? [];
                  const isSelected = selectedDate === cell.dateKey;
                  const isToday = cell.dateKey === toDateKey(new Date());

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => openDayPlanner(cell.dateKey)}
                      className={`relative min-h-[74px] border-b border-r p-1 text-left align-top transition sm:min-h-[120px] sm:p-2.5 ${
                        isSelected
                          ? 'bg-[color:var(--noon-teal)]/8 dark:bg-[color:var(--noon-teal)]/10'
                          : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
                      } border-zinc-200 dark:border-zinc-800`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm ${
                            isToday
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {dayEvents.length > 0 ? (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:px-2 sm:py-1 sm:text-[11px]">
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex flex-wrap gap-1 sm:hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span key={`${event.id}-dot`} className={`size-1.5 rounded-full ${EVENT_THEME[event.type].dot}`} />
                          ))}
                        </div>

                        <div className="hidden space-y-1.5 sm:block">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div key={event.id} className={`rounded-xl px-2 py-1 text-[11px] font-medium ${EVENT_THEME[event.type].badge}`}>
                              <p>{new Date(event.startDateTime).toLocaleTimeString('en-OM', { hour: 'numeric', minute: '2-digit' })}</p>
                              <p className="truncate">{event.title}</p>
                            </div>
                          ))}
                          {dayEvents.length > 2 ? (
                            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">+{dayEvents.length - 2} more</p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">{formatDateLabel(selectedDate)}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedDayEvents.length > 0 ? `${selectedDayEvents.length} scheduled items` : 'No scheduled items yet.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openDayPlanner(selectedDate, 'BLOCKED')}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Plan day
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  This day is currently free.
                </div>
              ) : (
                selectedDayEvents.slice(0, 4).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_THEME[event.type].badge}`}>
                        {EVENT_THEME[event.type].label}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(event.startDateTime).toLocaleTimeString('en-OM', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">Upcoming timeline</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No upcoming entries in the current month.</p>
              ) : (
                upcoming.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:p-4">
                    <div className={`mt-1 size-3 rounded-full ${EVENT_THEME[event.type].dot}`} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(event.startDateTime).toLocaleString('en-OM', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {isDayModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => setIsDayModalOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-full overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 md:max-w-5xl md:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--noon-teal)]">Day planner</p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{formatDateLabel(selectedDate)}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{selectedDayEvents.length} scheduled items</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDayModalOpen(false)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>

            <div className="grid max-h-[calc(92dvh-96px)] gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(330px,0.95fr)]">
              <div className="border-b border-zinc-200 p-4 dark:border-zinc-800 md:border-b-0 md:border-r md:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Agenda</h3>
                <div className="mt-3 space-y-3">
                  {selectedDayEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No items for this day yet. Use the composer to add one.
                    </div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const deletable = !event.classSession && !event.eventBooking;
                      return (
                        <div key={event.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_THEME[event.type].badge}`}>
                                {EVENT_THEME[event.type].label}
                              </span>
                              <h4 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {formatTimeRange(event.startDateTime, event.endDateTime)}
                              </p>
                            </div>
                            {deletable ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteItem(event.id)}
                                disabled={deletingEventId === event.id}
                                className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                              >
                                {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                              </button>
                            ) : null}
                          </div>

                          {event.description ? (
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{event.description}</p>
                          ) : null}

                          {event.blockReason ? (
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Reason: {event.blockReason}</p>
                          ) : null}

                          {event.classSession?.class ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              Trainer: {event.classSession.class.trainer?.fullName || 'Unassigned'}
                            </p>
                          ) : null}

                          {event.eventBooking ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              Booking: {event.eventBooking.bookingNumber} • {event.eventBooking.fullName}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Add calendar item</h3>
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen((prev) => !prev)}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {isComposerOpen ? 'Hide' : 'Show'}
                  </button>
                </div>

                {isComposerOpen ? (
                  <div className="space-y-4">
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Type</span>
                      <select
                        value={itemForm.type}
                        onChange={(event) => {
                          const nextType = event.target.value as CreatableCalendarType;
                          setItemForm((prev) => ({
                            ...prev,
                            type: nextType,
                            title: prev.title.trim() ? prev.title : defaultTitleForType(nextType),
                          }));
                        }}
                        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        {(Object.keys(CREATABLE_TYPE_LABEL) as CreatableCalendarType[]).map((type) => (
                          <option key={type} value={type}>
                            {CREATABLE_TYPE_LABEL[type]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Quick time</span>
                      <div className="flex flex-wrap gap-2">
                        {TIME_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setItemForm((prev) => ({
                                ...prev,
                                startTime: preset.start,
                                endTime: preset.end,
                              }))
                            }
                            className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Start date</span>
                        <input
                          type="date"
                          value={itemForm.startDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, startDate: event.target.value }))}
                          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Start time</span>
                        <input
                          type="time"
                          value={itemForm.startTime}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, startTime: event.target.value }))}
                          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">End date</span>
                        <input
                          type="date"
                          value={itemForm.endDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, endDate: event.target.value }))}
                          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">End time</span>
                        <input
                          type="time"
                          value={itemForm.endTime}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, endTime: event.target.value }))}
                          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>

                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Title</span>
                      <input
                        value={itemForm.title}
                        onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Description (optional)</span>
                      <textarea
                        rows={3}
                        value={itemForm.description}
                        onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
                        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    {showBlockFields ? (
                      <>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">Reason</span>
                          <input
                            value={itemForm.blockReason}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, blockReason: event.target.value }))}
                            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">Internal notes</span>
                          <textarea
                            rows={3}
                            value={itemForm.internalNotes}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      </>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setItemForm(createEmptyItemForm(selectedDate, itemForm.type))}
                        className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateItem()}
                        disabled={creatingItem}
                        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        {creatingItem ? 'Saving...' : 'Save item'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    Composer hidden. Click <span className="font-semibold">Show</span> to add a new item for this day.
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick links</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="./classes"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Manage classes
                    </Link>
                    <Link
                      href="./events/new"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      New event request
                    </Link>
                    <Link
                      href="./events"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Event requests
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
