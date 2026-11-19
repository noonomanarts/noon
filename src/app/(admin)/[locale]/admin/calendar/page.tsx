'use client';

import { AnimatedTabs } from '@/components/ui/AnimatedTabs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import { FiChevronLeft, FiChevronRight, FiClock, FiPlus, FiSlash, FiUserCheck } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import QuarterHourTimeSelect from '@/components/admin/QuarterHourTimeSelect';
import MarkdownEditor, { markdownToHtml } from '@/components/admin/MarkdownEditor';

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

function defaultTitleForType(type: CreatableCalendarType, arabic = false): string {
  if (arabic) return EVENT_LABEL_AR[type];
  if (type === 'BLOCKED') return 'Studio block';
  if (type === 'CLEANING') return 'Cleaning window';
  if (type === 'PRIVATE_SESSION') return 'Private session';
  if (type === 'COMPETITION') return 'Competition slot';
  if (type === 'APPOINTMENT') return 'Appointment';
  if (type === 'SCHEDULER') return 'Scheduler item';
  return 'Birthday party';
}

function createEmptyItemForm(date: string, type: CreatableCalendarType = 'BLOCKED', arabic = false): CalendarItemForm {
  return {
    type,
    title: defaultTitleForType(type, arabic),
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

const EVENT_LABEL_AR: Record<CalendarEvent['type'], string> = {
  CLASS: 'ورشة',
  PRIVATE_SESSION: 'جلسة خاصة',
  COMPETITION: 'مسابقة',
  BIRTHDAY_PARTY: 'عيد ميلاد',
  BLOCKED: 'محجوب',
  CLEANING: 'تنظيف',
  APPOINTMENT: 'موعد',
  SCHEDULER: 'مهمة',
};

// Time grid (week and day views): 06:00 to midnight.
const GRID_START_MIN = 6 * 60;
const GRID_END_MIN = 24 * 60;
const HOUR_HEIGHT = 52;

const MUSCAT_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Muscat',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const MUSCAT_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Muscat',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function muscatMinutes(value: string | Date): number {
  const [hours, minutes] = MUSCAT_TIME.format(typeof value === 'string' ? new Date(value) : value)
    .split(':')
    .map(Number);
  return (hours % 24) * 60 + minutes;
}

function muscatDateKey(value: string | Date): string {
  return MUSCAT_DATE.format(typeof value === 'string' ? new Date(value) : value);
}

type PositionedEvent = {
  event: CalendarEvent;
  start: number;
  end: number;
  column: number;
  columns: number;
};

/**
 * Places a day's events on the time grid. Events that overlap in time share
 * the column width side by side instead of covering each other.
 */
function layoutDayEvents(dayEvents: CalendarEvent[], dateKey: string): PositionedEvent[] {
  const items: PositionedEvent[] = dayEvents
    .map((event) => {
      // Multi-day items are clipped to the part that falls on this day.
      const start = muscatDateKey(event.startDateTime) === dateKey ? muscatMinutes(event.startDateTime) : 0;
      let end = muscatDateKey(event.endDateTime) === dateKey ? muscatMinutes(event.endDateTime) : 24 * 60;
      if (end <= start) end = Math.min(24 * 60, start + 30);
      return { event, start, end, column: 0, columns: 1 };
    })
    .sort((left, right) => left.start - right.start || right.end - left.end);

  let cluster: PositionedEvent[] = [];
  let clusterEnd = -1;
  const closeCluster = () => {
    const columns = cluster.reduce((max, item) => Math.max(max, item.column + 1), 1);
    cluster.forEach((item) => {
      item.columns = columns;
    });
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      closeCluster();
      clusterEnd = -1;
    }
    const taken = new Set(cluster.filter((other) => other.end > item.start).map((other) => other.column));
    let column = 0;
    while (taken.has(column)) column += 1;
    item.column = column;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) closeCluster();

  return items;
}

export default function AdminCalendarPage() {
  const params = useParams<{ locale?: string }>();
  const isArabic = params?.locale === 'ar';
  const dateLocale = isArabic ? 'ar-OM-u-nu-latn' : 'en-GB';
  const { confirm } = useAppFeedback();
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
  const [itemForm, setItemForm] = useState<CalendarItemForm>(() => createEmptyItemForm(toDateKey(new Date()), 'BLOCKED', isArabic));

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

  useEffect(() => {
    if (!isDayModalOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDayModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDayModalOpen]);

  // Current time (Muscat) for the "now" line; refreshed every minute.
  const [nowMinutes, setNowMinutes] = useState(() => muscatMinutes(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setNowMinutes(muscatMinutes(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Open the time grid at the start of the working day instead of 06:00.
  const timeGridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewMode === 'month' || !timeGridRef.current) return;
    timeGridRef.current.scrollTop = ((8 * 60 - GRID_START_MIN) / 60) * HOUR_HEIGHT;
  }, [viewMode]);
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
      return currentMonth.toLocaleDateString(dateLocale, {
        month: 'long',
        year: 'numeric',
      });
    }

    if (viewMode === 'week') {
      const start = weekDays[0]?.dateKey;
      const end = weekDays[6]?.dateKey;
      if (start && end) {
        const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString(dateLocale, {
          day: 'numeric',
          month: 'short',
        });
        const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString(dateLocale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return `${startLabel} - ${endLabel}`;
      }
    }

    return selectedDayDate.toLocaleDateString(dateLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [viewMode, currentMonth, weekDays, selectedDayDate, dateLocale]);

  const openDayPlanner = (dateKey: string, presetType?: CreatableCalendarType, options?: { fullDay?: boolean }) => {
    if (!canManage) {
      setSelectedDate(dateKey);
      setIsComposerOpen(false);
      setIsDayModalOpen(true);
      return;
    }

    setSelectedDate(dateKey);
    const nextType = presetType ?? 'BLOCKED';
    const nextForm = createEmptyItemForm(dateKey, nextType, isArabic);
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
      setError(isArabic ? 'يرجى اختيار وقت بداية ونهاية صحيح.' : 'Please choose a valid start/end time.');
      return;
    }

    if (allowTrainerVisibility && itemForm.visibleToTrainers && !itemForm.visibleToAllTrainers && itemForm.visibleTrainerIds.length === 0) {
      setError(isArabic ? 'اختر مدرباً واحداً على الأقل أو فعّل «جميع المدربين».' : 'Choose at least one trainer or enable "All trainers".');
      return;
    }

    if (isPlannerType && itemForm.notificationsEnabled && !itemForm.notifyAtStart && itemForm.reminderMinutesBefore === 'NONE') {
      setError(isArabic ? 'فعّل تذكيراً واحداً على الأقل (قبل البداية أو عند البداية).' : 'Enable at least one reminder (before start or at start).');
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
          isFullDay: itemForm.isFullDay,
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

      setItemForm(createEmptyItemForm(selectedDate, itemForm.type, isArabic));
      await fetchEvents();
      setIsComposerOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create calendar item');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleDeleteItem = async (eventId: string) => {
    const confirmed = await confirm({
      title: isArabic ? 'حذف هذا العنصر؟' : 'Delete this item?',
      message: isArabic
        ? 'سيُحذف العنصر من التقويم ولا يمكن التراجع.'
        : 'The item will be removed from the calendar. This cannot be undone.',
      confirmLabel: isArabic ? 'حذف' : 'Delete',
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;

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

  /* ── Presentation helpers ── */
  const t = {
    title: isArabic ? 'التقويم' : 'Calendar',
    subtitle: isArabic
      ? 'الورش والفعاليات والمواعيد وأوقات الحجب في مكان واحد.'
      : 'Classes, events, appointments and blocked time in one place.',
    today: isArabic ? 'اليوم' : 'Today',
    previous: isArabic ? 'السابق' : 'Previous',
    next: isArabic ? 'التالي' : 'Next',
    month: isArabic ? 'شهر' : 'Month',
    week: isArabic ? 'أسبوع' : 'Week',
    day: isArabic ? 'يوم' : 'Day',
    block: isArabic ? 'حجب وقت' : 'Block time',
    fullDay: isArabic ? 'حجب يوم كامل' : 'Block full day',
    scheduler: isArabic ? 'مهمة' : 'Task',
    appointment: isArabic ? 'موعد' : 'Appointment',
    readOnly: isArabic ? 'صلاحية عرض فقط' : 'Read-only access',
    classes: isArabic ? 'ورش' : 'classes',
    eventsLabel: isArabic ? 'فعاليات' : 'events',
    blocks: isArabic ? 'أوقات محجوبة' : 'blocks',
    loading: isArabic ? 'جاري تحميل التقويم...' : 'Loading calendar...',
    more: (count: number) => (isArabic ? `+${count} أخرى` : `+${count} more`),
    noItems: isArabic ? 'لا توجد عناصر' : 'No items',
    planDay: isArabic ? 'تخطيط اليوم' : 'Plan day',
    freeDay: isArabic ? 'هذا اليوم فارغ حالياً.' : 'This day is currently free.',
    scheduledItems: (count: number) =>
      count > 0
        ? (isArabic ? `${count} عنصر مجدول` : `${count} scheduled ${count === 1 ? 'item' : 'items'}`)
        : (isArabic ? 'لا توجد عناصر مجدولة.' : 'Nothing scheduled.'),
    upcoming: isArabic ? 'القادم' : 'Upcoming',
    noUpcoming: isArabic ? 'لا توجد عناصر قادمة في هذه الفترة.' : 'Nothing coming up in this period.',
    allDay: isArabic ? 'طوال اليوم' : 'All day',
    addAt: (time: string) => (isArabic ? `إضافة عنصر عند ${time}` : `Add an item at ${time}`),
  };

  const L = (en: string, ar: string) => (isArabic ? ar : en);

  const typeLabel = (type: CalendarEvent['type']) => (isArabic ? EVENT_LABEL_AR[type] : EVENT_THEME[type].label);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Muscat' });

  const formatLongDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00`).toLocaleDateString(dateLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const todayKey = toDateKey(new Date());

  const weekdayNames = Array.from({ length: 7 }).map((_, index) =>
    // 2023-01-01 was a Sunday; the grid starts its weeks on Sunday.
    new Date(2023, 0, 1 + index).toLocaleDateString(dateLocale, { weekday: 'short' })
  );

  // Month grid including the trailing/leading days of the neighbouring months,
  // so every week row is complete.
  const fullMonthGrid = (() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = addDays(first, -first.getDay());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = Math.ceil((first.getDay() + daysInMonth) / 7);
    return Array.from({ length: rows * 7 }).map((_, index) => {
      const date = addDays(gridStart, index);
      return {
        dateKey: toDateKey(date),
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month,
        // Friday and Saturday are the weekend in Oman.
        isWeekend: date.getDay() === 5 || date.getDay() === 6,
      };
    });
  })();

  const gridDays =
    viewMode === 'week'
      ? weekDays.map((day) => ({ dateKey: day.dateKey, dayNumber: day.dayNumber }))
      : [{ dateKey: selectedDate, dayNumber: selectedDayDate.getDate() }];

  const hourMarks = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 }).map(
    (_, index) => GRID_START_MIN / 60 + index
  );

  const openPlannerAt = (dateKey: string, hour: number) => {
    openDayPlanner(dateKey);
    if (!canManage) return;
    const startHour = Math.min(22, Math.max(0, hour));
    const pad = (value: number) => String(value).padStart(2, '0');
    setItemForm((prev) => ({
      ...prev,
      startDate: dateKey,
      endDate: dateKey,
      isFullDay: false,
      startTime: `${pad(startHour)}:00`,
      endTime: `${pad(Math.min(23, startHour + 2))}:00`,
    }));
  };

  const secondaryButton =
    'inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';
  const iconButton =
    'inline-flex size-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openDayPlanner(selectedDate, 'APPOINTMENT')} className={secondaryButton}>
              <FiUserCheck className="size-4" aria-hidden="true" />
              {t.appointment}
            </button>
            <button type="button" onClick={() => openDayPlanner(selectedDate, 'SCHEDULER')} className={secondaryButton}>
              <FiClock className="size-4" aria-hidden="true" />
              {t.scheduler}
            </button>
            <button
              type="button"
              onClick={() => openDayPlanner(selectedDate, 'BLOCKED', { fullDay: true })}
              className={secondaryButton}
            >
              <FiSlash className="size-4" aria-hidden="true" />
              {t.fullDay}
            </button>
            <button
              type="button"
              onClick={() => openDayPlanner(selectedDate, 'BLOCKED')}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
            >
              <FiPlus className="size-4" aria-hidden="true" />
              {t.block}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {t.readOnly}
          </div>
        )}
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className={`grid gap-5 ${viewMode === 'month' ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button type="button" onClick={goToPreviousMonth} aria-label={t.previous} title={t.previous} className={iconButton}>
                  <FiChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                </button>
                <button type="button" onClick={goToNextMonth} aria-label={t.next} title={t.next} className={iconButton}>
                  <FiChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
              <button type="button" onClick={goToToday} className={`${secondaryButton} h-9`}>
                {t.today}
              </button>
              <h2 className="ms-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100" aria-live="polite">
                {currentViewLabel}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalClasses}</span> {t.classes}
                <span className="mx-1.5">·</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalEvents}</span> {t.eventsLabel}
                <span className="mx-1.5">·</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalBlocks}</span> {t.blocks}
              </p>
              <AnimatedTabs
                className="shrink-0"
                size="sm"
                value={viewMode}
                onValueChange={setViewMode}
                items={[
                  { value: 'month' as CalendarViewMode, label: t.month },
                  { value: 'week' as CalendarViewMode, label: t.week },
                  { value: 'day' as CalendarViewMode, label: t.day },
                ]}
              />
            </div>
          </div>

          {loading && events.length === 0 ? (
            <div role="status" className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
              {t.loading}
            </div>
          ) : viewMode === 'month' ? (
            /* ── Month view ── */
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                {weekdayNames.map((name) => (
                  <div key={name} className="px-1 py-2.5">
                    {name}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {fullMonthGrid.map((cell, index) => {
                  const dayEvents = cell.inMonth ? eventsByDate[cell.dateKey] ?? [] : [];
                  const isSelected = selectedDate === cell.dateKey;
                  const isToday = cell.dateKey === todayKey;
                  const lastColumn = index % 7 === 6;
                  const lastRow = index >= fullMonthGrid.length - 7;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => openDayPlanner(cell.dateKey)}
                      aria-label={`${formatLongDate(cell.dateKey)} — ${t.scheduledItems(dayEvents.length)}`}
                      aria-current={isToday ? 'date' : undefined}
                      className={[
                        'grid-cell group relative flex min-h-[76px] flex-col items-stretch justify-start gap-1 p-1.5 text-start outline-none transition-colors sm:min-h-[124px] sm:p-2',
                        'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--noon-teal)]',
                        lastColumn ? '' : 'border-e',
                        lastRow ? '' : 'border-b',
                        'border-zinc-200 dark:border-zinc-800',
                        isSelected
                          ? 'bg-[color:var(--noon-teal)]/[0.07] dark:bg-[color:var(--noon-teal)]/10'
                          : cell.inMonth
                            ? cell.isWeekend
                              ? 'bg-zinc-50/70 hover:bg-zinc-100/70 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/50'
                              : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'
                            : 'bg-zinc-50/40 hover:bg-zinc-50 dark:bg-zinc-950/20',
                      ].join(' ')}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className={[
                            'inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                            isToday
                              ? 'bg-[color:var(--noon-teal)] text-white'
                              : cell.inMonth
                                ? 'text-zinc-800 dark:text-zinc-100'
                                : 'text-zinc-400 dark:text-zinc-600',
                          ].join(' ')}
                        >
                          {cell.dayNumber}
                        </span>
                        {canManage ? (
                          <FiPlus
                            className="hidden size-4 text-zinc-400 group-hover:block group-focus-visible:block"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>

                      {/* Phones: dots only. Larger screens: time + title chips. */}
                      <span className="flex flex-wrap gap-1 sm:hidden">
                        {dayEvents.slice(0, 4).map((event) => (
                          <span key={`${event.id}-dot`} className={`size-1.5 rounded-full ${EVENT_THEME[event.type].dot}`} />
                        ))}
                      </span>

                      <span className="hidden flex-col gap-1 sm:flex">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            title={`${formatTime(event.startDateTime)} ${event.title}`}
                            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium ${EVENT_THEME[event.type].badge}`}
                          >
                            <span className={`size-1.5 shrink-0 rounded-full ${EVENT_THEME[event.type].dot}`} aria-hidden="true" />
                            <span className="shrink-0 opacity-80" dir="ltr">{formatTime(event.startDateTime)}</span>
                            <span className="truncate">{event.title}</span>
                          </span>
                        ))}
                        {dayEvents.length > 3 ? (
                          <span className="px-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {t.more(dayEvents.length - 3)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Week / day view: hourly time grid ── */
            <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {/* Phones get an agenda list for the week; the grid needs more width. */}
              {viewMode === 'week' ? (
                <div className="space-y-3 p-3 md:hidden">
                  {weekDays.map((day) => {
                    const dayEvents = eventsByDate[day.dateKey] ?? [];
                    const isToday = day.dateKey === todayKey;
                    return (
                      <div key={`agenda-${day.dateKey}`} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-semibold ${isToday ? 'text-[color:var(--noon-teal-strong)]' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {formatLongDate(day.dateKey)}
                          </p>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openDayPlanner(day.dateKey)}
                              aria-label={`${t.planDay}: ${formatLongDate(day.dateKey)}`}
                              className={iconButton}
                            >
                              <FiPlus className="size-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.noItems}</p>
                          ) : (
                            dayEvents.map((event) => (
                              <button
                                key={`agenda-${event.id}`}
                                type="button"
                                onClick={() => openDayPlanner(day.dateKey)}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-xs font-medium ${EVENT_THEME[event.type].badge}`}
                              >
                                <span className="shrink-0 opacity-80" dir="ltr">{formatTime(event.startDateTime)}</span>
                                <span className="truncate">{event.title}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className={viewMode === 'week' ? 'hidden md:block' : ''}>
                {/* Day headers */}
                <div
                  className="grid border-b border-zinc-200 dark:border-zinc-800"
                  style={{ gridTemplateColumns: `3.5rem repeat(${gridDays.length}, minmax(0, 1fr))` }}
                >
                  <div />
                  {gridDays.map((day) => {
                    const isToday = day.dateKey === todayKey;
                    const date = new Date(`${day.dateKey}T00:00:00`);
                    return (
                      <button
                        key={`head-${day.dateKey}`}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day.dateKey);
                          if (viewMode === 'week') setViewMode('day');
                        }}
                        className="grid-cell flex flex-col items-center gap-0.5 border-s border-zinc-200 px-1 py-2 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--noon-teal)] dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                      >
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {date.toLocaleDateString(dateLocale, { weekday: 'short' })}
                        </span>
                        <span
                          className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                            isToday ? 'bg-[color:var(--noon-teal)] text-white' : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable hours */}
                <div ref={timeGridRef} className="max-h-[640px] overflow-y-auto">
                  <div
                    className="relative grid"
                    style={{
                      gridTemplateColumns: `3.5rem repeat(${gridDays.length}, minmax(0, 1fr))`,
                      height: hourMarks.length * HOUR_HEIGHT,
                    }}
                  >
                    {/* Hour labels */}
                    <div className="relative">
                      {hourMarks.map((hour, index) => (
                        <span
                          key={`label-${hour}`}
                          className="absolute end-2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400"
                          style={{ top: index * HOUR_HEIGHT }}
                          dir="ltr"
                        >
                          {index === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}
                        </span>
                      ))}
                    </div>

                    {gridDays.map((day) => {
                      const positioned = layoutDayEvents(eventsByDate[day.dateKey] ?? [], day.dateKey);
                      const isToday = day.dateKey === todayKey;
                      const showNow = isToday && nowMinutes >= GRID_START_MIN && nowMinutes <= GRID_END_MIN;

                      return (
                        <div key={`col-${day.dateKey}`} className="relative border-s border-zinc-200 dark:border-zinc-800">
                          {/* Hour slots: click an empty hour to plan from that time. */}
                          {hourMarks.map((hour) => (
                            <button
                              key={`slot-${day.dateKey}-${hour}`}
                              type="button"
                              onClick={() => openPlannerAt(day.dateKey, hour)}
                              aria-label={t.addAt(`${String(hour).padStart(2, '0')}:00`)}
                              className="grid-cell block w-full border-b border-zinc-100 outline-none transition-colors hover:bg-zinc-50 focus-visible:bg-[color:var(--noon-teal)]/10 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
                              style={{ height: HOUR_HEIGHT }}
                            />
                          ))}

                          {positioned.map((item) => {
                            const visibleStart = Math.max(item.start, GRID_START_MIN);
                            const visibleEnd = Math.min(Math.max(item.end, visibleStart + 15), GRID_END_MIN);
                            if (visibleEnd <= GRID_START_MIN) return null;
                            const top = ((visibleStart - GRID_START_MIN) / 60) * HOUR_HEIGHT;
                            const height = Math.max(24, ((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 2);
                            const width = 100 / item.columns;

                            return (
                              <button
                                key={`block-${day.dateKey}-${item.event.id}`}
                                type="button"
                                onClick={() => openDayPlanner(day.dateKey)}
                                title={`${formatTime(item.event.startDateTime)} – ${formatTime(item.event.endDateTime)} · ${item.event.title}`}
                                className={`absolute flex flex-col items-stretch justify-start overflow-hidden rounded px-1.5 py-1 text-start text-xs outline-none ring-1 ring-white transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[color:var(--noon-teal)] dark:ring-zinc-900 ${EVENT_THEME[item.event.type].badge}`}
                                style={{
                                  top,
                                  height,
                                  insetInlineStart: `calc(${item.column * width}% + 2px)`,
                                  width: `calc(${width}% - 4px)`,
                                }}
                              >
                                <span className="block truncate font-semibold">{item.event.title}</span>
                                {height >= 40 ? (
                                  <span className="block truncate opacity-80">
                                    <bdi dir="ltr">{formatTime(item.event.startDateTime)} – {formatTime(item.event.endDateTime)}</bdi>
                                  </span>
                                ) : null}
                                {height >= 60 ? <span className="block truncate opacity-70">{typeLabel(item.event.type)}</span> : null}
                              </button>
                            );
                          })}

                          {showNow ? (
                            <div
                              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                              style={{ top: ((nowMinutes - GRID_START_MIN) / 60) * HOUR_HEIGHT }}
                              aria-hidden="true"
                            >
                              <span className="-ms-1 size-2 rounded-full bg-rose-500" />
                              <span className="h-px flex-1 bg-rose-500" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Legend ── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            {(Object.keys(EVENT_THEME) as CalendarEvent['type'][]).map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                <span className={`size-2.5 rounded-sm ${EVENT_THEME[type].dot}`} aria-hidden="true" />
                {typeLabel(type)}
              </span>
            ))}
          </div>
        </section>

        {viewMode === 'month' ? (
          <aside className="space-y-5">
            {/* ── Selected day ── */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatLongDate(selectedDate)}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{t.scheduledItems(selectedDayEvents.length)}</p>
                </div>
                {canManage ? (
                  <button type="button" onClick={() => openDayPlanner(selectedDate, 'BLOCKED')} className={`${secondaryButton} h-9 shrink-0`}>
                    {t.planDay}
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {selectedDayEvents.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {t.freeDay}
                  </p>
                ) : (
                  selectedDayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openDayPlanner(selectedDate)}
                      className={`block w-full rounded-lg px-3 py-2 text-start transition hover:brightness-95 ${EVENT_THEME[event.type].badge}`}
                    >
                      <span className="block truncate text-sm font-semibold">{event.title}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-xs opacity-80">
                        <span dir="ltr">{formatTime(event.startDateTime)} – {formatTime(event.endDateTime)}</span>
                        <span>{typeLabel(event.type)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* ── Upcoming ── */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.upcoming}</h2>
              {upcoming.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t.noUpcoming}</p>
              ) : (
                <ol className="mt-3 space-y-1">
                  {upcoming.map((event) => {
                    const eventDateKey = toDateKey(event.startDateTime);
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(eventDateKey)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <span className={`size-2.5 shrink-0 rounded-sm ${EVENT_THEME[event.type].dot}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.title}</span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(event.startDateTime).toLocaleString(dateLocale, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hourCycle: 'h23',
                                timeZone: 'Asia/Muscat',
                              })}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </aside>
        ) : null}
      </div>

      {isDayModalOpen ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => setIsDayModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={formatLongDate(selectedDate)}
            dir={isArabic ? 'rtl' : 'ltr'}
            className="admin-panel flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 md:h-[88dvh] md:max-w-5xl md:rounded-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 sm:text-xl">{formatLongDate(selectedDate)}</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.scheduledItems(selectedDayEvents.length)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {L('Close', 'إغلاق')}
                </button>
              </div>
            </div>

            <div className="grid flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(330px,0.95fr)]">
              <div className="border-b border-zinc-200 p-5 dark:border-zinc-800 md:border-b-0 md:border-e md:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{L('Agenda', 'جدول اليوم')}</h3>
                <div className="mt-4 space-y-4">
                  {selectedDayEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {L('No items for this day yet. Use the form to add one.', 'لا توجد عناصر لهذا اليوم بعد. استخدم النموذج لإضافة عنصر.')}
                    </div>
                  ) : (
                    selectedDayEvents.map((event) => {
                      const deletable = !event.classSession && !event.eventBooking;
                      return (
                        <div key={event.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${EVENT_THEME[event.type].badge}`}>
                                {typeLabel(event.type)}
                              </span>
                              <h4 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</h4>
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                <bdi dir="ltr">{formatTime(event.startDateTime)} – {formatTime(event.endDateTime)}</bdi>
                              </p>
                            </div>
                            {canManage && deletable ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteItem(event.id)}
                                disabled={deletingEventId === event.id}
                                className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/20"
                              >
                                {deletingEventId === event.id ? L('Deleting...', 'جاري الحذف...') : L('Delete', 'حذف')}
                              </button>
                            ) : null}
                          </div>

                          {event.description ? (
                            <article
                              className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 [&_strong]:font-semibold [&_em]:italic [&_p]:leading-6 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(event.description) }}
                            />
                          ) : null}

                          {event.internalNotes ? (
                            <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                              {L('Internal note', 'ملاحظة داخلية')}: {event.internalNotes}
                            </p>
                          ) : null}

                          {event.blockReason ? (
                            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{L('Reason', 'السبب')}: {event.blockReason}</p>
                          ) : null}

                          {event.type === 'APPOINTMENT' && (event.appointmentContactName || event.appointmentContactPhone) ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {L('Contact', 'جهة الاتصال')}: {event.appointmentContactName || '—'}
                              {event.appointmentContactPhone ? <> • <bdi dir="ltr">{event.appointmentContactPhone}</bdi></> : null}
                            </p>
                          ) : null}

                          {event.isBlocked || event.type === 'APPOINTMENT' || event.type === 'SCHEDULER' ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {L('Visibility', 'الظهور')}:{' '}
                              {event.visibleToTrainers
                                ? event.visibleTrainerIds && event.visibleTrainerIds.length > 0
                                  ? L(`Admins + ${event.visibleTrainerIds.length} trainer(s)`, `المشرفون + ${event.visibleTrainerIds.length} مدرب`)
                                  : L('Admins + all trainers', 'المشرفون + جميع المدربين')
                                : L('Admins only', 'المشرفون فقط')}
                            </p>
                          ) : null}

                          {event.classSession?.class ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {L('Trainer', 'المدرب')}: {event.classSession.class.trainer?.fullName || L('Unassigned', 'غير معيّن')}
                            </p>
                          ) : null}

                          {event.eventBooking ? (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {L('Booking', 'الحجز')}: <bdi dir="ltr">{event.eventBooking.bookingNumber}</bdi> • {event.eventBooking.fullName}
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
                    {canManage ? L('Add calendar item', 'إضافة عنصر للتقويم') : t.readOnly}
                  </h3>
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setIsComposerOpen((prev) => !prev)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {isComposerOpen ? L('Hide', 'إخفاء') : L('Show', 'إظهار')}
                    </button>
                  ) : null}
                </div>

                {canManage && isComposerOpen ? (
                  <div className="space-y-5">
                    <label className="block space-y-1.5 text-sm">
                      <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Type', 'النوع')}</span>
                      <select
                        value={itemForm.type}
                        onChange={(event) => {
                          const nextType = event.target.value as CreatableCalendarType;
                          setItemForm((prev) => ({
                            ...prev,
                            ...createEmptyItemForm(prev.startDate, nextType, isArabic),
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            title:
                              prev.title.trim() && prev.title !== defaultTitleForType(prev.type, isArabic)
                                ? prev.title
                                : defaultTitleForType(nextType, isArabic),
                          }));
                        }}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        {(Object.keys(CREATABLE_TYPE_LABEL) as CreatableCalendarType[]).map((type) => (
                          <option key={type} value={type}>
                            {isArabic ? EVENT_LABEL_AR[type] : CREATABLE_TYPE_LABEL[type]}
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
                        {t.fullDay}
                      </label>
                    ) : null}

                    {!itemForm.isFullDay ? (
                      <div className="space-y-2 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Quick time', 'وقت سريع')}</span>
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
                      <label className="block space-y-1.5 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Start date', 'تاريخ البداية')}</span>
                        <input
                          type="date"
                          value={itemForm.startDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, startDate: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="block space-y-1.5 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Start time', 'وقت البداية')}</span>
                        <QuarterHourTimeSelect
                          hour24
                          placeholder={L('Time', 'الوقت')}
                          value={itemForm.startTime}
                          onChange={(value) => setItemForm((prev) => ({ ...prev, startTime: value }))}
                          disabled={itemForm.isFullDay}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="block space-y-1.5 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('End date', 'تاريخ النهاية')}</span>
                        <input
                          type="date"
                          value={itemForm.endDate}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, endDate: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="block space-y-1.5 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('End time', 'وقت النهاية')}</span>
                        <QuarterHourTimeSelect
                          hour24
                          placeholder={L('Time', 'الوقت')}
                          value={itemForm.endTime}
                          onChange={(value) => setItemForm((prev) => ({ ...prev, endTime: value }))}
                          disabled={itemForm.isFullDay}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    </div>

                    <label className="block space-y-1.5 text-sm">
                      <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Title', 'العنوان')}</span>
                      <input
                        value={itemForm.title}
                        onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>

                    <MarkdownEditor
                      label={L('Description (optional)', 'الوصف (اختياري)')}
                      value={itemForm.description}
                      onChange={(value) => setItemForm((prev) => ({ ...prev, description: value }))}
                      rows={4}
                      placeholder={L('Write a description... Markdown is supported.', 'اكتب وصفاً... يدعم تنسيق Markdown.')}
                    />

                    {itemForm.type === 'PRIVATE_SESSION' ? (
                      <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={itemForm.autoCreateCleaningBlock}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, autoCreateCleaningBlock: event.target.checked }))}
                        />
                        {L('Auto add 3-hour cleaning block after this private session', 'إضافة فترة تنظيف لمدة 3 ساعات تلقائياً بعد هذه الجلسة الخاصة')}
                      </label>
                    ) : null}

                    {itemForm.type === 'APPOINTMENT' || itemForm.type === 'SCHEDULER' ? (
                      <>
                        {itemForm.type === 'APPOINTMENT' ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block space-y-1.5 text-sm">
                              <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Contact name', 'اسم جهة الاتصال')}</span>
                              <input
                                value={itemForm.appointmentContactName}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, appointmentContactName: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </label>
                            <label className="block space-y-1.5 text-sm">
                              <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Contact phone', 'هاتف جهة الاتصال')}</span>
                              <input
                                value={itemForm.appointmentContactPhone}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, appointmentContactPhone: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                            </label>
                          </div>
                        ) : null}

                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                          {L('Tasks and appointments are non-blocking and do not lock booking slots.', 'المهام والمواعيد لا تحجب الوقت ولا تغلق فترات الحجز.')}
                        </div>

                        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                          <input
                            type="checkbox"
                            checked={itemForm.notificationsEnabled}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, notificationsEnabled: event.target.checked }))}
                          />
                          {L('Enable notifications', 'تفعيل الإشعارات')}
                        </label>

                        {itemForm.notificationsEnabled ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block space-y-1.5 text-sm">
                              <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Reminder before start', 'تذكير قبل البداية')}</span>
                              <select
                                value={itemForm.reminderMinutesBefore}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, reminderMinutesBefore: event.target.value }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              >
                                <option value="NONE">{L('No early reminder', 'بدون تذكير مسبق')}</option>
                                <option value="15">{L('15 minutes', '15 دقيقة')}</option>
                                <option value="30">{L('30 minutes', '30 دقيقة')}</option>
                                <option value="60">{L('60 minutes', '60 دقيقة')}</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                              <input
                                type="checkbox"
                                checked={itemForm.notifyAtStart}
                                onChange={(event) => setItemForm((prev) => ({ ...prev, notifyAtStart: event.target.checked }))}
                              />
                              {L('Notify at start time', 'إشعار عند وقت البداية')}
                            </label>
                          </div>
                        ) : null}
                      </>
                    ) : null}

                    {showBlockFields ? (
                      <label className="block space-y-1.5 text-sm">
                        <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Reason', 'السبب')}</span>
                        <input
                          value={itemForm.blockReason}
                          onChange={(event) => setItemForm((prev) => ({ ...prev, blockReason: event.target.value }))}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                    ) : null}

                    {showVisibilityFields ? (
                      <>
                        <label className="block space-y-1.5 text-sm">
                          <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Internal notes', 'ملاحظات داخلية')}</span>
                          <textarea
                            rows={3}
                            value={itemForm.internalNotes}
                            onChange={(event) => setItemForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>

                        <label className="block space-y-1.5 text-sm">
                          <span className="block font-medium text-zinc-700 dark:text-zinc-200">{L('Visibility', 'الظهور')}</span>
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
                            <option value="ADMINS">{L('Admins only', 'المشرفون فقط')}</option>
                            <option value="ADMINS_AND_TRAINERS">{L('Admins + Trainers', 'المشرفون + المدربون')}</option>
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
                              {L('All trainers', 'جميع المدربين')}
                            </label>

                            {!itemForm.visibleToAllTrainers ? (
                              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                                {trainers.length === 0 ? (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{L('No trainer list available.', 'قائمة المدربين غير متاحة.')}</p>
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
                      L('Form hidden. Click Show to add a new item for this day.', 'النموذج مخفي. اضغط «إظهار» لإضافة عنصر جديد لهذا اليوم.')
                    ) : (
                      L('This role can only view the timetable and existing items.', 'هذا الدور يمكنه عرض الجدول والعناصر الحالية فقط.')
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
                  {L('Close', 'إغلاق')}
                </button>
                {canManage && isComposerOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setItemForm(createEmptyItemForm(selectedDate, itemForm.type, isArabic))}
                      className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {L('Reset', 'إعادة تعيين')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreateItem()}
                      disabled={creatingItem}
                      className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {creatingItem ? L('Saving...', 'جاري الحفظ...') : L('Save item', 'حفظ العنصر')}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
