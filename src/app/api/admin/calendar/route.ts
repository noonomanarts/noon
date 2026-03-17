import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { addMinutes, findCalendarOccupancy } from '@/lib/calendar';
import { createCalendarEvent, findCalendarEvents } from '@/lib/db/events';
import { getUserById } from '@/lib/db/users';
import type { CalendarEventType } from '@/lib/db/types';

const ALLOWED_TYPES = new Set<CalendarEventType>([
  'CLASS',
  'PRIVATE_SESSION',
  'COMPETITION',
  'BIRTHDAY_PARTY',
  'BLOCKED',
  'CLEANING',
  'APPOINTMENT',
  'SCHEDULER',
]);

const TYPE_COLORS: Record<CalendarEventType, string> = {
  CLASS: '#0ea5e9',
  PRIVATE_SESSION: '#14b8a6',
  COMPETITION: '#f97316',
  BIRTHDAY_PARTY: '#ec4899',
  BLOCKED: '#52525b',
  CLEANING: '#f59e0b',
  APPOINTMENT: '#0f766e',
  SCHEDULER: '#0ea5a4',
};

async function requireAdminUser(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true };
}

function parseCalendarType(value: unknown): CalendarEventType | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim() as CalendarEventType;
  return ALLOWED_TYPES.has(trimmed) ? trimmed : null;
}

function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeTrainerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();
  value.forEach((item) => {
    if (typeof item === 'string' && item.trim()) {
      deduped.add(item.trim());
    }
  });
  return [...deduped];
}

function parseReminderMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 1440) return null;
  return parsed;
}

// GET: List calendar events for admin
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = parseCalendarType(searchParams.get('type'));

    const events = await findCalendarEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type || undefined,
    });

    return NextResponse.json(Array.isArray(events) ? events : []);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST: Create calendar event
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const startDateTime = new Date(String(body.startDateTime || ''));
    const endDateTime = new Date(String(body.endDateTime || ''));
    const type = parseCalendarType(body.type) || 'BLOCKED';
    if (type === 'CLASS') {
      return NextResponse.json(
        { error: 'Class events must be managed from class sessions' },
        { status: 400 }
      );
    }
    const title = sanitizeText(body.title) || (type === 'BLOCKED' ? 'Blocked time' : 'Calendar item');
    const description = sanitizeText(body.description);
    const blockReason = sanitizeText(body.blockReason);
    const internalNotes = sanitizeText(body.internalNotes);
    const appointmentContactName = sanitizeText(body.appointmentContactName);
    const appointmentContactPhone = sanitizeText(body.appointmentContactPhone);
    const notificationsEnabled = Boolean(body.notificationsEnabled);
    const notifyAtStart = Boolean(body.notifyAtStart);
    const reminderMinutesBefore = parseReminderMinutes(body.reminderMinutesBefore);

    const visibleToTrainers = Boolean(body.visibleToTrainers);
    const visibleToAllTrainers = Boolean(body.visibleToAllTrainers);
    const visibleTrainerIds = visibleToAllTrainers ? [] : sanitizeTrainerIds(body.visibleTrainerIds);
    const autoCreateCleaningBlock = type === 'PRIVATE_SESSION' && Boolean(body.autoCreateCleaningBlock);
    const isPlannerType = type === 'APPOINTMENT' || type === 'SCHEDULER';
    const allowTrainerVisibility = type === 'BLOCKED' || type === 'CLEANING' || isPlannerType;

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime()) ||
      endDateTime <= startDateTime
    ) {
      return NextResponse.json({ error: 'Invalid start/end time' }, { status: 400 });
    }

    if (visibleToTrainers && !visibleToAllTrainers && visibleTrainerIds.length === 0 && allowTrainerVisibility) {
      return NextResponse.json(
        { error: 'Select at least one trainer or choose all trainers visibility' },
        { status: 400 }
      );
    }

    if (!isPlannerType) {
      const conflicts = await findCalendarOccupancy({ startDateTime, endDateTime });
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'This time conflicts with an existing class, event, or blocked period',
            conflicts,
          },
          { status: 409 }
        );
      }
    }

    if (autoCreateCleaningBlock && !isPlannerType) {
      const cleaningStart = new Date(endDateTime);
      const cleaningEnd = addMinutes(cleaningStart, 180);
      const cleaningConflicts = await findCalendarOccupancy({ startDateTime: cleaningStart, endDateTime: cleaningEnd });
      if (cleaningConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot create this private session because its required 3-hour cleaning window conflicts with another item',
            conflicts: cleaningConflicts,
          },
          { status: 409 }
        );
      }
    }

    const isBlocked = type === 'BLOCKED' || type === 'CLEANING';

    const calendarEvent = await createCalendarEvent({
      type,
      startDateTime,
      endDateTime,
      title,
      description,
      isBlocked,
      blockReason,
      internalNotes,
      visibleToTrainers: allowTrainerVisibility ? visibleToTrainers : false,
      visibleTrainerIds: allowTrainerVisibility ? visibleTrainerIds : [],
      appointmentContactName: type === 'APPOINTMENT' ? appointmentContactName : undefined,
      appointmentContactPhone: type === 'APPOINTMENT' ? appointmentContactPhone : undefined,
      notificationsEnabled: isPlannerType ? notificationsEnabled : false,
      reminderMinutesBefore: isPlannerType ? reminderMinutesBefore : null,
      notifyAtStart: isPlannerType ? notifyAtStart : false,
      color: TYPE_COLORS[type],
    });

    if (autoCreateCleaningBlock) {
      const cleaningStart = new Date(endDateTime);
      const cleaningEnd = addMinutes(cleaningStart, 180);
      await createCalendarEvent({
        type: 'CLEANING',
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
        title: `Cleaning - ${title}`,
        isBlocked: true,
        blockReason: 'Post-private cooking session cleaning',
        visibleToTrainers: allowTrainerVisibility ? visibleToTrainers : false,
        visibleTrainerIds: allowTrainerVisibility ? visibleTrainerIds : [],
        color: TYPE_COLORS.CLEANING,
      });
    }

    return NextResponse.json(calendarEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
