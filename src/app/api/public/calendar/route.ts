import { NextRequest, NextResponse } from 'next/server';
import { getEventAvailability } from '@/lib/calendar';
import type { EventType } from '@/lib/db/types';

const EVENT_TYPES = new Set(['COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY']);
const PRIVATE_CLASS_TYPES = new Set(['cooking', 'arts-crafts']);

function parseSafeString(value: string | null, maxLength = 80): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = parseSafeString(searchParams.get('eventType'));
    const classType = parseSafeString(searchParams.get('classType'));
    const daysRaw = Number(searchParams.get('days'));

    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    if (classType && !PRIVATE_CLASS_TYPES.has(classType)) {
      return NextResponse.json({ error: 'Invalid private class type' }, { status: 400 });
    }

    const availability = await getEventAvailability({
      eventType: eventType as EventType,
      classType: classType ? (classType as 'cooking' | 'arts-crafts') : undefined,
      days: Number.isFinite(daysRaw) ? daysRaw : undefined,
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching public calendar availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available time slots' },
      { status: 500 }
    );
  }
}
