import { NextRequest, NextResponse } from 'next/server';
import { findUniqueClass, findClassSessions, createClassSession } from '@/lib/db/classes';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/db/events';
import { query, transaction } from '@/lib/db/pool';
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
          `SELECT * FROM calendar_events WHERE class_session_id = $1 AND type = 'CLASS' LIMIT 1`,
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

    if (classData.category === 'COOKING') {
      const cleaningStart = new Date(end);
      const cleaningEnd = new Date(cleaningStart.getTime() + 3 * 60 * 60000);
      const cleaningConflicts = await findCalendarOccupancy({
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
      });

      if (cleaningConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'This session requires a 3-hour cleaning block, but that cleaning window conflicts with existing schedule items',
            conflicts: cleaningConflicts,
          },
          { status: 409 }
        );
      }
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
        classSessionId: session.id as string,
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

// PATCH: Edit existing session for a class
export async function PATCH(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const body = await request.json();
    const {
      sessionId,
      startDateTime,
      endDateTime,
      seatsTotal,
    }: {
      sessionId?: string;
      startDateTime?: string;
      endDateTime?: string;
      seatsTotal?: number;
    } = body;

    if (!sessionId || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: 'sessionId, startDateTime, and endDateTime are required' }, { status: 400 });
    }

    const classData = await findUniqueClass({ id: params.classId });
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const sessionResult = await query(
      `SELECT * FROM class_sessions WHERE id = $1 AND class_id = $2 LIMIT 1`,
      [sessionId, params.classId]
    );
    const existingSession = sessionResult.rows[0];
    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid session start or end time' }, { status: 400 });
    }

    const currentSeatsBooked = Number(existingSession.seats_booked ?? 0);
    const nextSeatsTotal = Number.isInteger(seatsTotal) && (seatsTotal as number) > 0
      ? (seatsTotal as number)
      : Number(existingSession.seats_total ?? classData.seatsTotal ?? 0);

    if (nextSeatsTotal < currentSeatsBooked) {
      return NextResponse.json(
        { error: `Total seats cannot be less than current bookings (${currentSeatsBooked})` },
        { status: 400 }
      );
    }

    const classEventResult = await query(
      `SELECT id FROM calendar_events WHERE class_session_id = $1 AND type = 'CLASS' LIMIT 1`,
      [sessionId]
    );
    const classEventId: string | null = classEventResult.rows[0]?.id ?? null;

    const oldEnd = new Date(existingSession.end_date_time);
    const oldCleaningStart = oldEnd;
    const oldCleaningEnd = new Date(oldEnd.getTime() + 3 * 60 * 60000);

    const cleaningResult = await query(
      `SELECT id
       FROM calendar_events
       WHERE type = 'CLEANING'
         AND (
           class_session_id = $1
           OR (
             title = $2
             AND block_reason = 'Post-cooking class cleaning'
             AND start_date_time = $3
             AND end_date_time = $4
           )
         )
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, `Cleaning - ${classData.title as string}`, oldCleaningStart, oldCleaningEnd]
    );
    const cleaningEventId: string | null = cleaningResult.rows[0]?.id ?? null;

    const excludeConflictIds = new Set<string>();
    if (classEventId) excludeConflictIds.add(classEventId);
    if (cleaningEventId) excludeConflictIds.add(cleaningEventId);

    const slotConflicts = await findCalendarOccupancy({
      startDateTime: start,
      endDateTime: end,
    });
    const filteredSlotConflicts = slotConflicts.filter((item) => !excludeConflictIds.has(item.id));
    if (filteredSlotConflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'This time conflicts with an existing class, event, or blocked period',
          conflicts: filteredSlotConflicts,
        },
        { status: 409 }
      );
    }

    if (classData.category === 'COOKING') {
      const newCleaningStart = new Date(end);
      const newCleaningEnd = new Date(newCleaningStart.getTime() + 3 * 60 * 60000);
      const cleaningConflicts = await findCalendarOccupancy({
        startDateTime: newCleaningStart,
        endDateTime: newCleaningEnd,
      });
      const filteredCleaningConflicts = cleaningConflicts.filter((item) => !excludeConflictIds.has(item.id));
      if (filteredCleaningConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'This session requires a 3-hour cleaning block, but that cleaning window conflicts with existing schedule items',
            conflicts: filteredCleaningConflicts,
          },
          { status: 409 }
        );
      }
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE class_sessions
         SET start_date_time = $1,
             end_date_time = $2,
             seats_total = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [start, end, nextSeatsTotal, sessionId]
      );
    });

    if (classEventId) {
      await updateCalendarEvent(classEventId, {
        startDateTime: start,
        endDateTime: end,
      });
    } else {
      await createCalendarEvent({
        type: 'CLASS',
        startDateTime: start,
        endDateTime: end,
        title: classData.title as string,
        description: classData.description as string,
        classSessionId: sessionId,
      });
    }

    if (classData.category === 'COOKING') {
      const cleaningStart = new Date(end);
      const cleaningEnd = new Date(cleaningStart.getTime() + 3 * 60 * 60000);

      if (cleaningEventId) {
        await updateCalendarEvent(cleaningEventId, {
          startDateTime: cleaningStart,
          endDateTime: cleaningEnd,
          title: `Cleaning - ${classData.title as string}`,
          isBlocked: true,
          blockReason: 'Post-cooking class cleaning',
        });
      } else {
        await createCalendarEvent({
          type: 'CLEANING',
          startDateTime: cleaningStart,
          endDateTime: cleaningEnd,
          title: `Cleaning - ${classData.title as string}`,
          classSessionId: sessionId,
          isBlocked: true,
          blockReason: 'Post-cooking class cleaning',
        });
      }
    }

    const updatedResult = await query(
      `SELECT * FROM class_sessions WHERE id = $1 LIMIT 1`,
      [sessionId]
    );

    return NextResponse.json(updatedResult.rows[0] ?? null);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// DELETE: Remove an existing session for a class (only when no bookings exist)
export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const classData = await findUniqueClass({ id: params.classId });
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const sessionResult = await query(
      `SELECT * FROM class_sessions WHERE id = $1 AND class_id = $2 LIMIT 1`,
      [sessionId, params.classId]
    );
    const session = sessionResult.rows[0];
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const bookingsResult = await query(
      `SELECT COUNT(*)::int AS count FROM bookings WHERE session_id = $1`,
      [sessionId]
    );
    const bookingsCount = Number(bookingsResult.rows[0]?.count ?? 0);
    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a session that already has bookings' },
        { status: 409 }
      );
    }

    const end = new Date(session.end_date_time);
    const cleaningStart = end;
    const cleaningEnd = new Date(end.getTime() + 3 * 60 * 60000);

    await transaction(async (client) => {
      // Remove linked calendar events first (class + cleaning linked via class_session_id)
      await client.query(
        `DELETE FROM calendar_events WHERE class_session_id = $1`,
        [sessionId]
      );

      // Backward-compat cleanup: older cleaning events were created without class_session_id
      if (classData.category === 'COOKING') {
        await client.query(
          `DELETE FROM calendar_events
           WHERE type = 'CLEANING'
             AND title = $1
             AND block_reason = 'Post-cooking class cleaning'
             AND start_date_time = $2
             AND end_date_time = $3`,
          [`Cleaning - ${classData.title as string}`, cleaningStart, cleaningEnd]
        );
      }

      await client.query(`DELETE FROM class_sessions WHERE id = $1`, [sessionId]);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
