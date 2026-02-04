import { NextRequest, NextResponse } from 'next/server';
import { findCalendarEvents, createCalendarEvent } from '@/lib/db/events';

// GET: List calendar events
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    const events = await findCalendarEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type: type as 'CLASS' | 'PRIVATE_SESSION' | 'COMPETITION' | 'BIRTHDAY_PARTY' | 'BLOCKED' | 'CLEANING' | undefined,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST: Create blocked time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startDateTime,
      endDateTime,
      title,
      blockReason,
      internalNotes,
      visibleToTrainers,
      visibleTrainerIds,
    } = body;

    const calendarEvent = await createCalendarEvent({
      type: 'BLOCKED',
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      title: title || 'Blocked Time',
      isBlocked: true,
      blockReason,
      internalNotes,
      visibleToTrainers: visibleToTrainers || false,
      visibleTrainerIds: visibleTrainerIds || [],
    });

    return NextResponse.json(calendarEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating blocked time:', error);
    return NextResponse.json(
      { error: 'Failed to create blocked time' },
      { status: 500 }
    );
  }
}
