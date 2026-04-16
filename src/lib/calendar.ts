import { query } from '@/lib/db/pool';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import type { CalendarEventType, EventType } from '@/lib/db/types';

export type PrivateClassType = 'cooking' | 'arts-crafts';

export type BookingCalendarSettings = {
  timezone: string;
  eventWindowDays: number;
  slotIntervalMinutes: number;
  leadTimeHours: number;
  startHour: number;
  endHour: number;
};

export type EventBookingRule = {
  durationMinutes: number;
  calendarType: CalendarEventType;
  color: string;
};

export type CalendarOccupancy = {
  id: string;
  type: CalendarEventType;
  title: string;
  startDateTime: string;
  endDateTime: string;
  isBlocked: boolean;
  eventBookingId: string | null;
};

export type PublicAvailabilitySlot = {
  startDateTime: string;
  endDateTime: string;
  time: string;
};

export type PublicAvailabilityDay = {
  date: string;
  slots: PublicAvailabilitySlot[];
};

export const defaultBookingCalendarSettings: BookingCalendarSettings = {
  timezone: 'Asia/Muscat',
  eventWindowDays: 45,
  slotIntervalMinutes: 60,
  leadTimeHours: 12,
  startHour: 9,
  endHour: 20,
};

const MUSCAT_OFFSET_MINUTES = 4 * 60;
const PUBLIC_EVENT_START_HOUR = 10;
const NIGHT_WORKSHOP_START_HOUR = 18;
const NIGHT_WORKSHOP_TYPES = new Set<CalendarEventType>(['CLASS', 'PRIVATE_SESSION', 'COMPETITION', 'BIRTHDAY_PARTY']);

export const EVENT_BOOKING_RULES: Record<EventType, EventBookingRule> = {
  COOKING_COMPETITION: {
    durationMinutes: 180,
    calendarType: 'COMPETITION',
    color: '#f97316',
  },
  PRIVATE_CLASS: {
    durationMinutes: 150,
    calendarType: 'PRIVATE_SESSION',
    color: '#14b8a6',
  },
  BIRTHDAY_PARTY: {
    durationMinutes: 120,
    calendarType: 'BIRTHDAY_PARTY',
    color: '#ec4899',
  },
};

function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export async function getBookingCalendarSettings(): Promise<BookingCalendarSettings> {
  const saved = await getAdminSettingsByKey<Partial<BookingCalendarSettings>>('calendar.booking');
  return {
    timezone: typeof saved?.timezone === 'string' && saved.timezone ? saved.timezone : defaultBookingCalendarSettings.timezone,
    eventWindowDays: Math.max(7, Math.min(120, parseInteger(saved?.eventWindowDays, defaultBookingCalendarSettings.eventWindowDays))),
    slotIntervalMinutes: Math.max(30, Math.min(180, parseInteger(saved?.slotIntervalMinutes, defaultBookingCalendarSettings.slotIntervalMinutes))),
    leadTimeHours: Math.max(0, Math.min(72, parseInteger(saved?.leadTimeHours, defaultBookingCalendarSettings.leadTimeHours))),
    startHour: Math.max(0, Math.min(22, parseInteger(saved?.startHour, defaultBookingCalendarSettings.startHour))),
    endHour: Math.max(1, Math.min(24, parseInteger(saved?.endHour, defaultBookingCalendarSettings.endHour))),
  };
}

export function getEventDurationMinutes(eventType: EventType, classType?: PrivateClassType): number {
  if (eventType === 'PRIVATE_CLASS' && classType === 'cooking') {
    return 180;
  }
  return EVENT_BOOKING_RULES[eventType].durationMinutes;
}

export function createMuscatDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+04:00`);
}

export function toMuscatDateKey(value: Date): string {
  return new Date(value.getTime() + MUSCAT_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function getMuscatMinutesOfDay(value: Date): number {
  const shifted = new Date(value.getTime() + MUSCAT_OFFSET_MINUTES * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

function getNextMuscatDateKey(dateKey: string): string {
  return toMuscatDateKey(addMinutes(createMuscatDateTime(dateKey, '00:00'), 24 * 60));
}

export function eventBookingToCalendarType(eventType: EventType): CalendarEventType {
  return EVENT_BOOKING_RULES[eventType].calendarType;
}

export function shouldCreateCleaningBlock(eventType: EventType, classType?: PrivateClassType): boolean {
  return eventType === 'COOKING_COMPETITION' || (eventType === 'PRIVATE_CLASS' && classType === 'cooking');
}

export function buildEventCalendarTitle(input: {
  eventType: EventType;
  fullName: string;
  companyOrGroupName?: string;
}): string {
  const subject = input.companyOrGroupName?.trim() || input.fullName.trim();
  if (input.eventType === 'COOKING_COMPETITION') return `Cooking Competition - ${subject}`;
  if (input.eventType === 'PRIVATE_CLASS') return `Private Class - ${subject}`;
  return `Birthday Party - ${subject}`;
}

export async function findCalendarOccupancy(input: {
  startDateTime: Date;
  endDateTime: Date;
  excludeEventBookingId?: string;
}): Promise<CalendarOccupancy[]> {
  const values: unknown[] = [input.startDateTime, input.endDateTime];
  let sql = `
    SELECT
      ce.id,
      ce.type,
      ce.title,
      ce.start_date_time,
      ce.end_date_time,
      ce.is_blocked,
      ce.event_booking_id
    FROM calendar_events ce
    WHERE ce.end_date_time > $1
      AND ce.start_date_time < $2
      AND ce.type NOT IN ('APPOINTMENT', 'SCHEDULER')
  `;

  if (input.excludeEventBookingId) {
    values.push(input.excludeEventBookingId);
    sql += ` AND (ce.event_booking_id IS NULL OR ce.event_booking_id <> $3)`;
  }

  sql += ` ORDER BY ce.start_date_time ASC`;

  const result = await query(sql, values);

  return result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    startDateTime: new Date(row.start_date_time).toISOString(),
    endDateTime: new Date(row.end_date_time).toISOString(),
    isBlocked: Boolean(row.is_blocked),
    eventBookingId: row.event_booking_id ?? null,
  }));
}

export async function isEventSlotAvailable(input: {
  eventType: EventType;
  selectedDate: string;
  selectedTime: string;
  classType?: PrivateClassType;
  excludeEventBookingId?: string;
}): Promise<{ available: boolean; conflicts: CalendarOccupancy[]; startDateTime: Date; endDateTime: Date }> {
  const startDateTime = createMuscatDateTime(input.selectedDate, input.selectedTime);
  const endDateTime = addMinutes(startDateTime, getEventDurationMinutes(input.eventType, input.classType));
  const conflicts = await findCalendarOccupancy({
    startDateTime,
    endDateTime,
    excludeEventBookingId: input.excludeEventBookingId,
  });

  return {
    available: conflicts.length === 0,
    conflicts,
    startDateTime,
    endDateTime,
  };
}

export async function getEventAvailability(input: {
  eventType: EventType;
  classType?: PrivateClassType;
  days?: number;
}): Promise<{
  days: PublicAvailabilityDay[];
  durationMinutes: number;
  timezone: string;
  rangeEnd: string;
}> {
  const settings = await getBookingCalendarSettings();
  const durationMinutes = getEventDurationMinutes(input.eventType, input.classType);
  const horizonDays = Math.max(7, Math.min(input.days ?? settings.eventWindowDays, settings.eventWindowDays));
  const now = new Date();
  const todayKey = toMuscatDateKey(now);
  const rangeStart = createMuscatDateTime(todayKey, '00:00');
  const rangeEnd = addMinutes(rangeStart, (horizonDays + 1) * 24 * 60);

  const occupancy = await findCalendarOccupancy({
    startDateTime: rangeStart,
    endDateTime: rangeEnd,
  });
  const publicStartHour = Math.max(settings.startHour, PUBLIC_EVENT_START_HOUR);
  const nextDayBlockedKeys = new Set<string>();

  occupancy.forEach((item) => {
    if (!NIGHT_WORKSHOP_TYPES.has(item.type)) {
      return;
    }

    const workshopStart = new Date(item.startDateTime);
    if (getMuscatMinutesOfDay(workshopStart) < NIGHT_WORKSHOP_START_HOUR * 60) {
      return;
    }

    nextDayBlockedKeys.add(getNextMuscatDateKey(toMuscatDateKey(workshopStart)));
  });

  const leadTimeMs = settings.leadTimeHours * 60 * 60 * 1000;
  const days: PublicAvailabilityDay[] = [];

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const date = addMinutes(rangeStart, dayOffset * 24 * 60);
    const dateKey = toMuscatDateKey(date);

    if (nextDayBlockedKeys.has(dateKey)) {
      continue;
    }

    const slots: PublicAvailabilitySlot[] = [];

    for (
      let minutes = publicStartHour * 60;
      minutes + durationMinutes <= settings.endHour * 60;
      minutes += settings.slotIntervalMinutes
    ) {
      const hours = Math.floor(minutes / 60);
      const slotMinutes = minutes % 60;
      const time = `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`;
      const slotStart = createMuscatDateTime(dateKey, time);
      const slotEnd = addMinutes(slotStart, durationMinutes);

      if (slotStart.getTime() < now.getTime() + leadTimeMs) {
        continue;
      }

      const overlaps = occupancy.some((item) => {
        const busyStart = new Date(item.startDateTime).getTime();
        const busyEnd = new Date(item.endDateTime).getTime();
        return slotStart.getTime() < busyEnd && slotEnd.getTime() > busyStart;
      });

      if (!overlaps) {
        slots.push({
          startDateTime: slotStart.toISOString(),
          endDateTime: slotEnd.toISOString(),
          time,
        });
      }
    }

    if (slots.length > 0) {
      days.push({
        date: dateKey,
        slots,
      });
    }
  }

  return {
    days,
    durationMinutes,
    timezone: settings.timezone,
    rangeEnd: rangeEnd.toISOString(),
  };
}
