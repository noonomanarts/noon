'use client';

import { useEffect, useMemo, useState } from 'react';

type CalendarEvent = {
  id: string;
  type: 'CLASS' | 'PRIVATE_SESSION' | 'COMPETITION' | 'BIRTHDAY_PARTY' | 'BLOCKED' | 'CLEANING' | 'APPOINTMENT' | 'SCHEDULER';
  startDateTime: string;
  endDateTime: string;
  title: string;
  description?: string;
  isBlocked: boolean;
  blockReason?: string;
  internalNotes?: string;
  visibleToTrainers?: boolean;
  visibleTrainerIds?: string[];
  appointmentContactName?: string;
  appointmentContactPhone?: string;
  notificationsEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  notifyAtStart?: boolean;
  color?: string;
  classSession?: {
    class: {
      id: string;
      title: string;
      category: string;
      trainer: {
        id: string;
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

type CreatableCalendarType =
  | 'BLOCKED'
  | 'CLEANING'
  | 'PRIVATE_SESSION'
  | 'COMPETITION'
  | 'BIRTHDAY_PARTY'
  | 'APPOINTMENT'
  | 'SCHEDULER';

type TrainerOption = {
  id: string;
  fullName: string;
};

type CalendarItemForm = {
  type: CreatableCalendarType;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isFullDay: boolean;
  blockReason: string;
  internalNotes: string;
  visibleToTrainers: boolean;
  visibleToAllTrainers: boolean;
  visibleTrainerIds: string[];
  autoCreateCleaningBlock: boolean;
  appointmentContactName: string;
  appointmentContactPhone: string;
  notificationsEnabled: boolean;
  reminderMinutesBefore: string;
  notifyAtStart: boolean;
};

type CalendarViewMode = 'month' | 'week' | 'day';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CREATABLE_TYPE_LABEL: Record<CreatableCalendarType, string> = {
  BLOCKED: 'Blocked time',
  CLEANING: 'Cleaning window',
  PRIVATE_SESSION: 'Private session',
  COMPETITION: 'Competition',
  BIRTHDAY_PARTY: 'Birthday party',
  APPOINTMENT: 'Appointment',
  SCHEDULER: 'Scheduler item',
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
  APPOINTMENT: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Appointment',
  },
  SCHEDULER: {
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200',
    dot: 'bg-cyan-500',
    label: 'Scheduler',
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
  if (type === 'APPOINTMENT') return 'Appointment';
  if (type === 'SCHEDULER') return 'Scheduler item';
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
    isFullDay: false,
    blockReason: '',
    internalNotes: '',
    visibleToTrainers: false,
    visibleToAllTrainers: false,
    visibleTrainerIds: [],
    autoCreateCleaningBlock: type === 'PRIVATE_SESSION',
    appointmentContactName: '',
    appointmentContactPhone: '',
    notificationsEnabled: type === 'APPOINTMENT' || type === 'SCHEDULER',
    reminderMinutesBefore: '30',
    notifyAtStart: true,
  };
}

function toMuscatDateTime(date: string, time: string): string {
  return `${date}T${time}:00+04:00`;
}

function getDateKeysCoveredByEvent(startDateTime: string, endDateTime: string): string[] {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const inclusiveEnd = new Date(Math.max(end.getTime() - 1, start.getTime()));
  inclusiveEnd.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  while (cursor.getTime() <= inclusiveEnd.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function startOfWeek(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const shift = value.getDay();
  value.setDate(value.getDate() - shift);
  return value;
}

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [canManage, setCanManage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(true);
  const [creatingItem, setCreatingItem] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<CalendarItemForm>(() => createEmptyItemForm(toDateKey(new Date())));

  useEffect(() => {
    void fetchEvents();
  }, [currentMonth, selectedDate, viewMode]);

  useEffect(() => {
    void fetchTrainers();
  }, [canManage]);

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
      const selected = new Date(`${selectedDate}T00:00:00`);
      let startDate = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
      let endDate = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

      if (viewMode === 'week') {
        const weekStart = startOfWeek(selected);
        startDate = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
        const weekEnd = addDays(weekStart, 7);
        endDate = new Date(Date.UTC(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()));
      } else if (viewMode === 'day') {
        startDate = new Date(Date.UTC(selected.getFullYear(), selected.getMonth(), selected.getDate()));
        const nextDay = addDays(selected, 1);
        endDate = new Date(Date.UTC(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()));
      }
      const response = await fetch(
        `/api/admin/calendar?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`,
        { cache: 'no-store' }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        events?: CalendarEvent[];
        permissions?: { canManage?: boolean };
        error?: string;
      };

      if (!response.ok || !Array.isArray(payload.events)) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to load calendar');
      }

      setEvents(payload.events);
      setCanManage(payload.permissions?.canManage !== false);
    } catch (requestError) {
      setEvents([]);
      setCanManage(false);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    if (!canManage) {
      setTrainers([]);
      return;
    }

    try {
      const response = await fetch('/api/admin/trainers?activeOnly=true', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as {
        trainers?: Array<{ id?: string; fullName?: string }>;
      };

      if (!response.ok || !Array.isArray(payload.trainers)) {
        return;
      }

      setTrainers(
        payload.trainers
          .map((trainer) => ({
            id: String(trainer.id || ''),
            fullName: String(trainer.fullName || '').trim(),
          }))
          .filter((trainer) => trainer.id && trainer.fullName)
      );
    } catch {
      setTrainers([]);
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

  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDate}T00:00:00`);
    const weekStart = startOfWeek(base);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      return {
        dateKey: toDateKey(date),
        dayNumber: date.getDate(),
        dayLabel: WEEK_DAYS[date.getDay()],
      };
    });
  }, [selectedDate]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((accumulator, event) => {
      const coveredDates = getDateKeysCoveredByEvent(event.startDateTime, event.endDateTime);
      coveredDates.forEach((dateKey) => {
        accumulator[dateKey] = accumulator[dateKey] ? [...accumulator[dateKey], event] : [event];
        accumulator[dateKey].sort(
          (left, right) => new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime()
        );
      });
      return accumulator;
    }, {});
  }, [events]);

  const selectedDayEvents = eventsByDate[selectedDate] ?? [];
  const selectedDayDate = useMemo(() => new Date(`${selectedDate}T00:00:00`), [selectedDate]);

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

  const currentViewLabel = useMemo(() => {
    if (viewMode === 'month') {
      return currentMonth.toLocaleDateString('en-OM', {
        month: 'long',
        year: 'numeric',
      });
    }

    if (viewMode === 'week') {
      const start = weekDays[0]?.dateKey;
      const end = weekDays[6]?.dateKey;
      if (start && end) {
        const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString('en-OM', {
          day: 'numeric',
          month: 'short',
        });
        const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString('en-OM', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return `${startLabel} - ${endLabel}`;
      }
    }

    return selectedDayDate.toLocaleDateString('en-OM', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [viewMode, currentMonth, weekDays, selectedDayDate]);

  const openDayPlanner = (dateKey: string, presetType?: CreatableCalendarType, options?: { fullDay?: boolean }) => {
    if (!canManage) {
      setSelectedDate(dateKey);
      setIsComposerOpen(false);
      setIsDayModalOpen(true);
      return;
    }

    setSelectedDate(dateKey);
    const nextType = presetType ?? 'BLOCKED';
    const nextForm = createEmptyItemForm(dateKey, nextType);
    if (options?.fullDay) {
      nextForm.isFullDay = true;
      nextForm.startTime = '00:00';
      nextForm.endTime = '23:59';
    }
    setItemForm(nextForm);
    setIsComposerOpen(true);
    setIsDayModalOpen(true);
  };

  const goToPreviousMonth = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
      return;
    }

    const prevDate = addDays(selectedDayDate, viewMode === 'week' ? -7 : -1);
    setSelectedDate(toDateKey(prevDate));
    setCurrentMonth(new Date(prevDate.getFullYear(), prevDate.getMonth(), 1));
  };

  const goToNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
      return;
    }

    const nextDate = addDays(selectedDayDate, viewMode === 'week' ? 7 : 1);
    setSelectedDate(toDateKey(nextDate));
    setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(toDateKey(today));
  };

  const handleCreateItem = async () => {
    const isBlockType = itemForm.type === 'BLOCKED' || itemForm.type === 'CLEANING';
    const isAppointmentType = itemForm.type === 'APPOINTMENT';
    const isSchedulerType = itemForm.type === 'SCHEDULER';
    const isPlannerType = isAppointmentType || isSchedulerType;
    const allowTrainerVisibility = isBlockType || isPlannerType;
    const startDateTime = toMuscatDateTime(itemForm.startDate, itemForm.isFullDay ? '00:00' : itemForm.startTime);
    const endDateTime = toMuscatDateTime(itemForm.endDate, itemForm.isFullDay ? '23:59' : itemForm.endTime);

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError('Please choose a valid start/end time.');
      return;
    }

    if (allowTrainerVisibility && itemForm.visibleToTrainers && !itemForm.visibleToAllTrainers && itemForm.visibleTrainerIds.length === 0) {
      setError('Choose at least one trainer or enable "All trainers".');
      return;
    }

    if (isPlannerType && itemForm.notificationsEnabled && !itemForm.notifyAtStart && itemForm.reminderMinutesBefore === 'NONE') {
      setError('Enable at least one reminder (before start or at start).');
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
          visibleToTrainers: allowTrainerVisibility ? itemForm.visibleToTrainers : false,
          visibleToAllTrainers: allowTrainerVisibility ? itemForm.visibleToAllTrainers : false,
          visibleTrainerIds: allowTrainerVisibility && !itemForm.visibleToAllTrainers ? itemForm.visibleTrainerIds : [],
          autoCreateCleaningBlock: itemForm.type === 'PRIVATE_SESSION' ? itemForm.autoCreateCleaningBlock : false,
          appointmentContactName: isAppointmentType ? itemForm.appointmentContactName : '',
          appointmentContactPhone: isAppointmentType ? itemForm.appointmentContactPhone : '',
          notificationsEnabled: isPlannerType ? itemForm.notificationsEnabled : false,
          reminderMinutesBefore:
            isPlannerType && itemForm.notificationsEnabled && itemForm.reminderMinutesBefore !== 'NONE'
              ? Number(itemForm.reminderMinutesBefore)
              : null,
          notifyAtStart: isPlannerType ? itemForm.notifyAtStart : false,
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
  const showVisibilityFields = showBlockFields || itemForm.type === 'APPOINTMENT' || itemForm.type === 'SCHEDULER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">Calendar</h1>
        </div>

        {canManage ? (
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => openDayPlanner(selectedDate, 'BLOCKED')}
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Add block
          </button>
          <button
            type="button"
            onClick={() => openDayPlanner(selectedDate, 'BLOCKED', { fullDay: true })}
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Block full day
          </button>
          <button
            type="button"
            onClick={() => openDayPlanner(selectedDate, 'SCHEDULER')}
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Add scheduler
          </button>
          <button
            type="button"
            onClick={() => openDayPlanner(selectedDate, 'APPOINTMENT')}
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Add appointment
          </button>
        </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Read-only timetable access
          </div>
        )}
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

      <div className={`grid gap-6 ${viewMode === 'month' ? 'xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.65fr)]' : ''}`}>
        <section className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              </div>

              <div className="inline-flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
                {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                      viewMode === mode
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{currentViewLabel}</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center sm:min-h-[420px]">
              <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                Loading calendar
              </div>
            </div>
          ) : viewMode === 'month' ? (
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
          ) : viewMode === 'week' ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Weekly planner</p>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => openDayPlanner(selectedDate)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Open selected day
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {weekDays.map((day) => {
                  const dayEvents = eventsByDate[day.dateKey] ?? [];
                  const isToday = day.dateKey === toDateKey(new Date());
                  const isSelected = day.dateKey === selectedDate;
                  return (
                    <div
                      key={`mobile-${day.dateKey}`}
                      className={`rounded-2xl border p-4 ${
                        isSelected
                          ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/5 dark:bg-[color:var(--noon-teal)]/10'
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setSelectedDate(day.dateKey)} className="flex items-center gap-2 text-left">
                          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{day.dayLabel}</span>
                          <span
                            className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {day.dayNumber}
                          </span>
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => openDayPlanner(day.dateKey)}
                            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Plan
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {dayEvents.length === 0 ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">No items</p>
                        ) : (
                          dayEvents.slice(0, 3).map((event) => (
                            <div key={`mobile-${event.id}`} className={`rounded-lg px-2.5 py-2 text-xs font-medium ${EVENT_THEME[event.type].badge}`}>
                              <p>{new Date(event.startDateTime).toLocaleTimeString('en-OM', { hour: 'numeric', minute: '2-digit' })}</p>
                              <p className="truncate">{event.title}</p>
                            </div>
                          ))
                        )}
                        {dayEvents.length > 3 ? <p className="text-xs text-zinc-500 dark:text-zinc-400">+{dayEvents.length - 3} more</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto pb-2">
                  <div className="grid min-w-[980px] grid-cols-7 gap-3">
                    {weekDays.map((day) => {
                      const dayEvents = eventsByDate[day.dateKey] ?? [];
                      const isToday = day.dateKey === toDateKey(new Date());
                      const isSelected = day.dateKey === selectedDate;
                      return (
                        <div
                          key={day.dateKey}
                          className={`min-h-[280px] rounded-2xl border p-3 transition ${
                            isSelected
                              ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/5 dark:bg-[color:var(--noon-teal)]/10'
                              : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                          }`}
                        >
                          <button type="button" onClick={() => setSelectedDate(day.dateKey)} className="w-full text-left">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{day.dayLabel}</span>
                              <span
                                className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                                  isToday
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                                }`}
                              >
                                {day.dayNumber}
                              </span>
                            </div>
                          </button>

                          <div className="mt-3 space-y-2">
                            {dayEvents.length === 0 ? (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">No items</p>
                            ) : (
                              dayEvents.slice(0, 4).map((event) => (
                                <div key={event.id} className={`rounded-lg px-2.5 py-2 text-xs font-medium ${EVENT_THEME[event.type].badge}`}>
                                  <p>{new Date(event.startDateTime).toLocaleTimeString('en-OM', { hour: 'numeric', minute: '2-digit' })}</p>
                                  <p className="truncate">{event.title}</p>
                                </div>
                              ))
                            )}
                            {dayEvents.length > 4 ? <p className="text-xs text-zinc-500 dark:text-zinc-400">+{dayEvents.length - 4} more</p> : null}
                          </div>

                          {canManage ? (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => openDayPlanner(day.dateKey)}
                                className="w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                Plan day
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Day view</p>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatDateLabel(selectedDate)}</h3>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => openDayPlanner(selectedDate)}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Open planner
                  </button>
                ) : null}
              </div>
              <div className="space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No items scheduled for this day.
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_THEME[event.type].badge}`}>
                          {EVENT_THEME[event.type].label}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatTimeRange(event.startDateTime, event.endDateTime)}</span>
                      </div>
                      <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</p>
                      {event.description ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{event.description}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
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
        </section>

        {viewMode === 'month' ? (
        <aside className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">{formatDateLabel(selectedDate)}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedDayEvents.length > 0 ? `${selectedDayEvents.length} scheduled items` : 'No scheduled items yet.'}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => openDayPlanner(selectedDate, 'BLOCKED')}
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Plan day
                </button>
              ) : null}
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
        ) : null}
      </div>

      {isDayModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => setIsDayModalOpen(false)}
        >
          <div
            className="flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 md:h-[88dvh] md:max-w-5xl md:rounded-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">{formatDateLabel(selectedDate)}</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{selectedDayEvents.length} scheduled items</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(330px,0.95fr)]">
              <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 md:border-b-0 md:border-r md:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Agenda</h3>
                <div className="mt-4 space-y-4">
                  {selectedDayEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No items for this day yet. Use the composer to add one.
                    </div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const deletable = !event.classSession && !event.eventBooking;
                      return (
                        <div key={event.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
                            {canManage && deletable ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteItem(event.id)}
                                disabled={deletingEventId === event.id}
                                className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                              >
                                {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                              </button>
                            ) : null}
                          </div>

                          {event.description ? (
                            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{event.description}</p>
                          ) : null}

                          {event.internalNotes ? (
                            <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                              Internal note: {event.internalNotes}
                            </p>
                          ) : null}

                          {event.blockReason ? (
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Reason: {event.blockReason}</p>
                          ) : null}

                          {event.type === 'APPOINTMENT' && (event.appointmentContactName || event.appointmentContactPhone) ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              Contact: {event.appointmentContactName || '—'}
                              {event.appointmentContactPhone ? ` • ${event.appointmentContactPhone}` : ''}
                            </p>
                          ) : null}

                          {event.isBlocked || event.type === 'APPOINTMENT' || event.type === 'SCHEDULER' ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              Visibility:{' '}
                              {event.visibleToTrainers
                                ? event.visibleTrainerIds && event.visibleTrainerIds.length > 0
                                  ? `Admins + ${event.visibleTrainerIds.length} trainer(s)`
                                  : 'Admins + all trainers'
                                : 'Admins only'}
                            </p>
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

              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {canManage ? 'Add calendar item' : 'Read-only access'}
                  </h3>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setIsComposerOpen((prev) => !prev)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {isComposerOpen ? 'Hide' : 'Show'}
                    </button>
                  ) : null}
                </div>

                {canManage && isComposerOpen ? (
                  <div className="space-y-5">
                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Type</span>
                      <select
                        value={itemForm.type}
                        onChange={(event) => {
                          const nextType = event.target.value as CreatableCalendarType;
                          setItemForm((prev) => ({
                            ...prev,
                            ...createEmptyItemForm(prev.startDate, nextType),
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            title: prev.title.trim() ? prev.title : defaultTitleForType(nextType),
                          }));
                        }}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        {(Object.keys(CREATABLE_TYPE_LABEL) as CreatableCalendarType[]).map((type) => (
                          <option key={type} value={type}>
                            {CREATABLE_TYPE_LABEL[type]}
                          </option>
                        ))}
                      </select>
                    </label>

                    {showBlockFields ? (
                      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={itemForm.isFullDay}
                          onChange={(event) =>
                            setItemForm((prev) => ({
                              ...prev,
                              isFullDay: event.target.checked,
                              startTime: event.target.checked ? '00:00' : prev.startTime,
                              endTime: event.target.checked ? '23:59' : prev.endTime,
                            }))
                          }
                        />
                        Block full day
                      </label>
                    ) : null}

                    {!itemForm.isFullDay ? (
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
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Start date</span>
                        <input
                          type="date"
                          value={itemForm.startDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, startDate: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Start time</span>
                        <input
                          type="time"
                          value={itemForm.startTime}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, startTime: event.target.value }))}
                          disabled={itemForm.isFullDay}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">End date</span>
                        <input
                          type="date"
                          value={itemForm.endDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, endDate: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">End time</span>
                        <input
                          type="time"
                          value={itemForm.endTime}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, endTime: event.target.value }))}
                          disabled={itemForm.isFullDay}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>

                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Title</span>
                      <input
                        value={itemForm.title}
                        onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    <label className="space-y-1.5 text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Description (optional)</span>
                      <textarea
                        rows={3}
                        value={itemForm.description}
                        onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    {itemForm.type === 'PRIVATE_SESSION' ? (
                      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={itemForm.autoCreateCleaningBlock}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, autoCreateCleaningBlock: event.target.checked }))}
                        />
                        Auto add 3-hour cleaning block after this private session
                      </label>
                    ) : null}

                    {itemForm.type === 'APPOINTMENT' || itemForm.type === 'SCHEDULER' ? (
                      <>
                        {itemForm.type === 'APPOINTMENT' ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5 text-sm">
                              <span className="font-medium text-zinc-700 dark:text-zinc-200">Contact name</span>
                              <input
                                value={itemForm.appointmentContactName}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, appointmentContactName: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </label>
                            <label className="space-y-1.5 text-sm">
                              <span className="font-medium text-zinc-700 dark:text-zinc-200">Contact phone</span>
                              <input
                                value={itemForm.appointmentContactPhone}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, appointmentContactPhone: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </label>
                          </div>
                        ) : null}

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                          Scheduler and appointment entries are non-blocking and do not lock booking slots.
                        </div>

                        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                          <input
                            type="checkbox"
                            checked={itemForm.notificationsEnabled}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, notificationsEnabled: event.target.checked }))}
                          />
                          Enable notifications
                        </label>

                        {itemForm.notificationsEnabled ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5 text-sm">
                              <span className="font-medium text-zinc-700 dark:text-zinc-200">Reminder before start</span>
                              <select
                                value={itemForm.reminderMinutesBefore}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, reminderMinutesBefore: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              >
                                <option value="NONE">No early reminder</option>
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">60 minutes</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                              <input
                                type="checkbox"
                                checked={itemForm.notifyAtStart}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, notifyAtStart: event.target.checked }))}
                              />
                              Notify at start time
                            </label>
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    {showBlockFields ? (
                      <label className="space-y-1.5 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">Reason</span>
                        <input
                          value={itemForm.blockReason}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, blockReason: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    ) : null}

                    {showVisibilityFields ? (
                      <>
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">Internal notes</span>
                          <textarea
                            rows={3}
                            value={itemForm.internalNotes}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-zinc-700 dark:text-zinc-200">Visibility</span>
                          <select
                            value={itemForm.visibleToTrainers ? 'ADMINS_AND_TRAINERS' : 'ADMINS'}
                            onChange={(event) =>
                              setItemForm((prev) => ({
                                ...prev,
                                visibleToTrainers: event.target.value === 'ADMINS_AND_TRAINERS',
                                visibleToAllTrainers:
                                  event.target.value === 'ADMINS_AND_TRAINERS' ? prev.visibleToAllTrainers : false,
                                visibleTrainerIds: event.target.value === 'ADMINS_AND_TRAINERS' ? prev.visibleTrainerIds : [],
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          >
                            <option value="ADMINS">Admins only</option>
                            <option value="ADMINS_AND_TRAINERS">Admins + Trainers</option>
                          </select>
                        </label>

                        {itemForm.visibleToTrainers ? (
                          <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                              <input
                                type="checkbox"
                                checked={itemForm.visibleToAllTrainers}
                                onChange={(event) =>
                                  setItemForm((prev) => ({
                                    ...prev,
                                    visibleToAllTrainers: event.target.checked,
                                    visibleTrainerIds: event.target.checked ? [] : prev.visibleTrainerIds,
                                  }))
                                }
                              />
                              All trainers
                            </label>

                            {!itemForm.visibleToAllTrainers ? (
                              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                                {trainers.length === 0 ? (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No trainer list available.</p>
                                ) : (
                                  trainers.map((trainer) => {
                                    const checked = itemForm.visibleTrainerIds.includes(trainer.id);
                                    return (
                                      <label key={trainer.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) =>
                                            setItemForm((prev) => ({
                                              ...prev,
                                              visibleTrainerIds: event.target.checked
                                                ? [...new Set([...prev.visibleTrainerIds, trainer.id])]
                                                : prev.visibleTrainerIds.filter((id) => id !== trainer.id),
                                            }))
                                          }
                                        />
                                        {trainer.fullName}
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {canManage ? (
                      <>Composer hidden. Click <span className="font-semibold">Show</span> to add a new item for this day.</>
                    ) : (
                      'This role can only view the timetable and existing items.'
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
                {canManage && isComposerOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setItemForm(createEmptyItemForm(selectedDate, itemForm.type))}
                      className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreateItem()}
                      disabled={creatingItem}
                      className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {creatingItem ? 'Saving...' : 'Save item'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
