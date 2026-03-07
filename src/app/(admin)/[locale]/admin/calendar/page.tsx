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

type BlockForm = {
  type: 'BLOCKED' | 'CLEANING';
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  blockReason: string;
  internalNotes: string;
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

function createEmptyBlockForm(date: string): BlockForm {
  return {
    type: 'BLOCKED',
    title: 'Studio block',
    startDate: date,
    startTime: '10:00',
    endDate: date,
    endTime: '12:00',
    blockReason: '',
    internalNotes: '',
  };
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creatingBlock, setCreatingBlock] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<BlockForm>(() => createEmptyBlockForm(toDateKey(new Date())));

  useEffect(() => {
    void fetchEvents();
  }, [currentMonth]);

  useEffect(() => {
    setBlockForm((prev) => ({
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
  const totalEvents = events.filter((event) => event.type !== 'CLASS' && event.type !== 'BLOCKED' && event.type !== 'CLEANING').length;
  const totalBlocks = events.filter((event) => event.isBlocked).length;
  const upcoming = events.filter((event) => new Date(event.endDateTime).getTime() >= Date.now()).slice(0, 6);

  const handleCreateBlock = async () => {
    setCreatingBlock(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: blockForm.type,
          title: blockForm.title,
          startDateTime: `${blockForm.startDate}T${blockForm.startTime}:00+04:00`,
          endDateTime: `${blockForm.endDate}T${blockForm.endTime}:00+04:00`,
          blockReason: blockForm.blockReason,
          internalNotes: blockForm.internalNotes,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create block');
      }

      setIsModalOpen(false);
      setBlockForm(createEmptyBlockForm(selectedDate));
      await fetchEvents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create block');
    } finally {
      setCreatingBlock(false);
    }
  };

  const handleDeleteBlock = async (eventId: string) => {
    setDeletingEventId(eventId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/calendar/${eventId}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete block');
      }

      await fetchEvents();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete block');
    } finally {
      setDeletingEventId(null);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--noon-teal)]">Operations Calendar</p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Classes, events, and blocked studio time</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            The same calendar now drives both admin planning and public availability. Classes, private bookings, parties, cleaning windows, and manual blocks all appear here.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setBlockForm(createEmptyBlockForm(selectedDate));
              setIsModalOpen(true);
            }}
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Classes on calendar</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalClasses}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Events on calendar</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalEvents}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Blocks and cleaning windows</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalBlocks}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Prev
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentMonth.toLocaleDateString('en-OM', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Click a day to inspect the detailed agenda.</p>
              </div>
              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.values(EVENT_THEME).map((theme) => (
                <span
                  key={theme.label}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  <span className={`size-2.5 rounded-full ${theme.dot}`} />
                  {theme.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                Loading calendar
              </div>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <div key={dayName} className="px-2 py-3">
                    {dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGrid.map((cell, index) => {
                  if (!cell) {
                    return <div key={`blank-${index}`} className="min-h-[126px] border-b border-r border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/20" />;
                  }

                  const dayEvents = eventsByDate[cell.dateKey] ?? [];
                  const isSelected = selectedDate === cell.dateKey;
                  const isToday = cell.dateKey === toDateKey(new Date());

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDate(cell.dateKey)}
                      className={`min-h-[126px] border-b border-r p-3 text-left align-top transition ${
                        isSelected
                          ? 'bg-[color:var(--noon-teal)]/8 dark:bg-[color:var(--noon-teal)]/10'
                          : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
                      } border-zinc-200 dark:border-zinc-800`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                            isToday
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {dayEvents.length > 0 ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {dayEvents.length}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div key={event.id} className={`rounded-xl px-2 py-1.5 text-[11px] font-medium ${EVENT_THEME[event.type].badge}`}>
                            <p>{new Date(event.startDateTime).toLocaleTimeString('en-OM', { hour: 'numeric', minute: '2-digit' })}</p>
                            <p className="truncate">{event.title}</p>
                          </div>
                        ))}
                        {dayEvents.length > 3 ? (
                          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            +{dayEvents.length - 3} more
                          </p>
                        ) : null}
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
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{formatDateLabel(selectedDate)}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedDayEvents.length > 0
                    ? `${selectedDayEvents.length} scheduled items`
                    : 'No scheduled items on this day yet.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBlockForm(createEmptyBlockForm(selectedDate));
                  setIsModalOpen(true);
                }}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Block this day
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Public visitors will see this day as available unless a class, event, or manual block is added.
                </div>
              ) : (
                selectedDayEvents.map((event) => {
                  const deletable = event.isBlocked && !event.classSession && !event.eventBooking;
                  return (
                    <div key={event.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_THEME[event.type].badge}`}>
                            {EVENT_THEME[event.type].label}
                          </span>
                          <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</h3>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatTimeRange(event.startDateTime, event.endDateTime)}
                          </p>
                        </div>
                        {deletable ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteBlock(event.id)}
                            disabled={deletingEventId === event.id}
                            className="rounded-xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                          >
                            {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : null}
                      </div>

                      {event.blockReason ? (
                        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{event.blockReason}</p>
                      ) : null}

                      {event.classSession?.class ? (
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                          Trainer: {event.classSession.class.trainer?.fullName || 'Unassigned'}
                        </p>
                      ) : null}

                      {event.eventBooking ? (
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                          Booking: {event.eventBooking.bookingNumber} • {event.eventBooking.fullName}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Upcoming timeline</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No upcoming entries in the current month.</p>
              ) : (
                upcoming.map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Add unavailable time</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  This block will immediately affect public availability.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Block type</span>
                <select
                  value={blockForm.type}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, type: event.target.value as 'BLOCKED' | 'CLEANING' }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="BLOCKED">Blocked time</option>
                  <option value="CLEANING">Cleaning window</option>
                </select>
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Title</span>
                <input
                  value={blockForm.title}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Start date</span>
                <input
                  type="date"
                  value={blockForm.startDate}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Start time</span>
                <input
                  type="time"
                  value={blockForm.startTime}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">End date</span>
                <input
                  type="date"
                  value={blockForm.endDate}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">End time</span>
                <input
                  type="time"
                  value={blockForm.endTime}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Reason</span>
                <input
                  value={blockForm.blockReason}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, blockReason: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">Internal notes</span>
                <textarea
                  rows={4}
                  value={blockForm.internalNotes}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateBlock()}
                disabled={creatingBlock}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {creatingBlock ? 'Saving...' : 'Save block'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
