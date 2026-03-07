import { NextRequest, NextResponse } from 'next/server';
import { findUniqueClass, findClassSessions, createClassSession } from '@/lib/db/classes';
import { createCalendarEvent } from '@/lib/db/events';
import { query } from '@/lib/db/pool';
import { findCalendarOccupancy } from '@/lib/calendar';

type Params = {
  params: Promise<{ classId: string }>;
};

// GET: List sessions for a class
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const sessions = await findClassSessions(params.classId, { includeCancelled: true });

    // Get bookings and calendar events for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const bookingsResult = await query(
          `SELECT id, status, number_of_participants FROM bookings WHERE session_id = $1`,
          [session.id]
        );

        const calendarResult = await query(
          `SELECT * FROM calendar_events WHERE class_session_id = $1`,
          [session.id]
        );

        return {
          ...session,
          bookings: bookingsResult.rows.map(b => ({
            id: b.id,
            status: b.status,
            numberOfParticipants: b.number_of_participants,
          })),
          calendarEvent: calendarResult.rows[0] ? {
            id: calendarResult.rows[0].id,
            type: calendarResult.rows[0].type,
            startDateTime: calendarResult.rows[0].start_date_time,
            endDateTime: calendarResult.rows[0].end_date_time,
          } : null,
        };
      })
    );

    return NextResponse.json(sessionsWithDetails);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST: Create new session for a class
export async function POST(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const body = await request.json();
    const { startDateTime, endDateTime, seatsTotal } = body;

    // Verify class exists
    const classData = await findUniqueClass({ id: params.classId });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Calculate end time if not provided
    const start = new Date(startDateTime);
    const end = endDateTime
      ? new Date(endDateTime)
      : new Date(start.getTime() + (classData.durationMinutes as number) * 60000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid session start or end time' }, { status: 400 });
    }

    const conflicts = await findCalendarOccupancy({
      startDateTime: start,
      endDateTime: end,
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'This time conflicts with an existing class, event, or blocked period',
          conflicts,
        },
        { status: 409 }
      );
    }

    // Create session
    const session = await createClassSession({
      classId: params.classId,
      startDateTime: start,
      endDateTime: end,
      seatsTotal: seatsTotal || (classData.seatsTotal as number),
    });

    // Create calendar event
    await createCalendarEvent({
      type: 'CLASS',
      startDateTime: start,
      endDateTime: end,
      title: classData.title as string,
      description: classData.description as string,
      classSessionId: session.id as string,
    });

    // If cooking class, add 3-hour cleaning block
    if (classData.category === 'COOKING') {
      const cleaningStart = new Date(end);
      const cleaningEnd = new Date(cleaningStart.getTime() + 3 * 60 * 60000);

      await createCalendarEvent({
        type: 'CLEANING',
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
        title: 'Cleaning - ' + classData.title,
        isBlocked: true,
        blockReason: 'Post-cooking class cleaning',
      });
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
