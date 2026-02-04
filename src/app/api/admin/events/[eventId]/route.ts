import { NextRequest, NextResponse } from 'next/server';
import { findUniqueEventBooking, updateEventBooking, deleteEventBooking, createCalendarEvent, addWalletCredit } from '@/lib/db/events';
import { query } from '@/lib/db/pool';

type Params = {
  params: Promise<{ eventId: string }>;
};

// GET: Get single event
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const event = await findUniqueEventBooking({ id: params.eventId });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get calendar event
    const calendarResult = await query(
      `SELECT * FROM calendar_events WHERE event_booking_id = $1`,
      [params.eventId]
    );

    return NextResponse.json({
      ...event,
      calendarEvent: calendarResult.rows[0] ? {
        id: calendarResult.rows[0].id,
        type: calendarResult.rows[0].type,
        startDateTime: calendarResult.rows[0].start_date_time,
        endDateTime: calendarResult.rows[0].end_date_time,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT: Update event
export async function PUT(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bookingNumber: _, ...updateData } = body;

    const updatedEvent = await updateEventBooking(params.eventId, updateData);

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if calendar event exists
    const calendarResult = await query(
      `SELECT * FROM calendar_events WHERE event_booking_id = $1`,
      [params.eventId]
    );

    // If status changed to CLIENT_CONFIRMED, create calendar event
    if (updateData.status === 'CLIENT_CONFIRMED' && calendarResult.rows.length === 0) {
      const eventTypeMap: Record<string, string> = {
        COOKING_COMPETITION: 'COMPETITION',
        PRIVATE_CLASS: 'PRIVATE_SESSION',
        BIRTHDAY_PARTY: 'BIRTHDAY_PARTY',
      };

      const startDateTime = new Date(updatedEvent.selectedDate as Date);
      const timeStr = updatedEvent.selectedTime as string;
      const [hours, minutes] = timeStr.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Estimate duration (3 hours for competition, 2-3 for others)
      const duration = updatedEvent.eventType === 'COOKING_COMPETITION' ? 3 : 2.5;
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60000);

      await createCalendarEvent({
        type: eventTypeMap[updatedEvent.eventType as string] as 'CLASS' | 'PRIVATE_SESSION' | 'COMPETITION' | 'BIRTHDAY_PARTY' | 'BLOCKED' | 'CLEANING',
        startDateTime,
        endDateTime,
        title: `${updatedEvent.eventType} - ${updatedEvent.companyOrGroupName || updatedEvent.fullName}`,
        description: (updatedEvent.specialRequests as string) || '',
        eventBookingId: params.eventId,
      });

      // Add cleaning block if cooking-related
      if (
        updatedEvent.eventType === 'COOKING_COMPETITION' ||
        (updatedEvent.eventType === 'PRIVATE_CLASS' && updatedEvent.preferredDish)
      ) {
        const cleaningStart = new Date(endDateTime);
        const cleaningEnd = new Date(cleaningStart.getTime() + 3 * 60 * 60000);

        await createCalendarEvent({
          type: 'CLEANING',
          startDateTime: cleaningStart,
          endDateTime: cleaningEnd,
          title: 'Cleaning - Event',
          isBlocked: true,
          blockReason: 'Post-event cleaning',
        });
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel/Delete event
export async function DELETE(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const event = await findUniqueEventBooking({ id: params.eventId });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If paid, add to wallet
    if (event.paymentStatus === 'PAID' && event.totalAmount) {
      const refundAmount = event.totalAmount as number;
      await addWalletCredit(
        event.userId as string,
        refundAmount,
        `Event cancellation refund - ${event.bookingNumber}`
      );
    }

    // Delete calendar events first
    await query(
      `DELETE FROM calendar_events WHERE event_booking_id = $1`,
      [params.eventId]
    );

    // Delete event booking
    await deleteEventBooking(params.eventId);

    return NextResponse.json({
      message: 'Event cancelled successfully',
      refunded: event.paymentStatus === 'PAID',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
