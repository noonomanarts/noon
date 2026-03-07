import { NextResponse } from 'next/server';
import { deleteCalendarEvent } from '@/lib/db/events';

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function DELETE(request: Request, props: Params) {
  const params = await props.params;

  try {
    const deleted = await deleteCalendarEvent(params.eventId);

    if (!deleted) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
