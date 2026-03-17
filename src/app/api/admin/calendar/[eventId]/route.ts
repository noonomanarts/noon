import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteCalendarEvent } from '@/lib/db/events';
import { query } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';

type Params = {
  params: Promise<{ eventId: string }>;
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

  const currentUser = await getUserById(sessionId);
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true };
}

export async function DELETE(request: Request, props: Params) {
  const params = await props.params;

  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const eventResult = await query(
      `SELECT id, class_session_id, event_booking_id
       FROM calendar_events
       WHERE id = $1
       LIMIT 1`,
      [params.eventId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    const row = eventResult.rows[0];
    if (row.class_session_id || row.event_booking_id) {
      return NextResponse.json(
        { error: 'This event is linked to an official class/event booking and cannot be deleted from timetable.' },
        { status: 409 }
      );
    }

    const deleted = await deleteCalendarEvent(params.eventId);
    if (!deleted) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 500 });
  }
}
