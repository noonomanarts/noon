import { NextRequest, NextResponse } from 'next/server';
import {
  addWalletCredit,
  createCalendarEvent,
  deleteEventBooking,
  findUniqueEventBooking,
  updateCalendarEvent,
  updateEventBooking,
} from '@/lib/db/events';
import { query } from '@/lib/db/pool';
import { notifyPhotographerDashboardUsers } from '@/lib/photographerNotifications';
import {
  addMinutes,
  buildEventCalendarTitle,
  eventBookingToCalendarType,
  findCalendarOccupancy,
  isEventSlotAvailable,
  shouldCreateCleaningBlock,
} from '@/lib/calendar';

function getPrivateClassType(event: Record<string, unknown>): 'cooking' | 'arts-crafts' | undefined {
  const preferredDish = typeof event.preferredDish === 'string' ? event.preferredDish.trim() : '';
  if (preferredDish) {
    return 'cooking';
  }

  const specialRequests = typeof event.specialRequests === 'string' ? event.specialRequests : '';
  if (specialRequests.includes('Private class type: arts-crafts')) {
    return 'arts-crafts';
  }
  if (specialRequests.includes('Private class type: cooking')) {
    return 'cooking';
  }

  return undefined;
}

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
      `SELECT * FROM calendar_events
       WHERE event_booking_id = $1
       ORDER BY CASE WHEN type = 'CLEANING' THEN 1 ELSE 0 END, start_date_time ASC`,
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

    const calendarResult = await query(
      `SELECT * FROM calendar_events
       WHERE event_booking_id = $1
       ORDER BY CASE WHEN type = 'CLEANING' THEN 1 ELSE 0 END, start_date_time ASC`,
      [params.eventId]
    );

    const primaryCalendarEvent = calendarResult.rows.find((row) => row.type !== 'CLEANING') ?? null;
    const cleaningCalendarEvent = calendarResult.rows.find((row) => row.type === 'CLEANING') ?? null;
    const eventType = updatedEvent.eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
    const classType = getPrivateClassType(updatedEvent);
    const selectedDate = typeof updatedEvent.selectedDate === 'string' ? updatedEvent.selectedDate.slice(0, 10) : '';
    const selectedTime = typeof updatedEvent.selectedTime === 'string' ? updatedEvent.selectedTime : '';
    const title = buildEventCalendarTitle({
      eventType,
      fullName: String(updatedEvent.fullName || ''),
      companyOrGroupName: typeof updatedEvent.companyOrGroupName === 'string' ? updatedEvent.companyOrGroupName : undefined,
    });

    const scheduleChanged =
      updateData.selectedDate !== undefined ||
      updateData.selectedTime !== undefined ||
      updateData.fullName !== undefined ||
      updateData.companyOrGroupName !== undefined ||
      updateData.specialRequests !== undefined;

    if (selectedDate && selectedTime && (scheduleChanged || updateData.status === 'CLIENT_CONFIRMED')) {
      const availability = await isEventSlotAvailable({
        eventType,
        selectedDate,
        selectedTime,
        classType,
        excludeEventBookingId: params.eventId,
      });

      if (!availability.available) {
        return NextResponse.json(
          { error: 'Selected slot conflicts with another confirmed or held booking' },
          { status: 409 }
        );
      }

      if (primaryCalendarEvent) {
        await updateCalendarEvent(primaryCalendarEvent.id as string, {
          type: eventBookingToCalendarType(eventType),
          startDateTime: availability.startDateTime,
          endDateTime: availability.endDateTime,
          title: updateData.status === 'CLIENT_CONFIRMED' || updatedEvent.status === 'CLIENT_CONFIRMED'
            ? title
            : `Requested - ${title}`,
          description: (updatedEvent.specialRequests as string) || '',
          color:
            eventType === 'COOKING_COMPETITION'
              ? '#f97316'
              : eventType === 'PRIVATE_CLASS'
                ? '#14b8a6'
                : '#ec4899',
        });
      } else {
        await createCalendarEvent({
          type: eventBookingToCalendarType(eventType),
          startDateTime: availability.startDateTime,
          endDateTime: availability.endDateTime,
          title: updateData.status === 'CLIENT_CONFIRMED' || updatedEvent.status === 'CLIENT_CONFIRMED'
            ? title
            : `Requested - ${title}`,
          description: (updatedEvent.specialRequests as string) || '',
          eventBookingId: params.eventId,
          color:
            eventType === 'COOKING_COMPETITION'
              ? '#f97316'
              : eventType === 'PRIVATE_CLASS'
                ? '#14b8a6'
                : '#ec4899',
        });
      }

      if (shouldCreateCleaningBlock(eventType, classType)) {
        const cleaningStart = new Date(availability.endDateTime);
        const cleaningEnd = addMinutes(cleaningStart, 180);
        const cleaningConflicts = await findCalendarOccupancy({
          startDateTime: cleaningStart,
          endDateTime: cleaningEnd,
          excludeEventBookingId: params.eventId,
        });

        if (cleaningConflicts.length > 0) {
          return NextResponse.json(
            {
              error: 'This event requires a 3-hour cleaning block, but the cleaning window conflicts with existing schedule items',
              conflicts: cleaningConflicts,
            },
            { status: 409 }
          );
        }

        if (cleaningCalendarEvent) {
          await updateCalendarEvent(cleaningCalendarEvent.id as string, {
            startDateTime: cleaningStart,
            endDateTime: cleaningEnd,
            title: `Cleaning - ${title}`,
            isBlocked: true,
            blockReason: 'Post-event cleaning',
            color: '#f59e0b',
          });
        } else {
          await createCalendarEvent({
            type: 'CLEANING',
            startDateTime: cleaningStart,
            endDateTime: cleaningEnd,
            title: `Cleaning - ${title}`,
            isBlocked: true,
            blockReason: 'Post-event cleaning',
            eventBookingId: params.eventId,
            color: '#f59e0b',
          });
        }
      }
    }

    if (updateData.status === 'CANCELLED') {
      await query(
        `DELETE FROM calendar_events WHERE event_booking_id = $1`,
        [params.eventId]
      );
    }

    // Notify photographer when event is confirmed
    if (updateData.status === 'CLIENT_CONFIRMED') {
      const eventLabel = eventType === 'COOKING_COMPETITION'
        ? 'Cooking Competition'
        : eventType === 'PRIVATE_CLASS'
          ? 'Private Class'
          : 'Birthday Party';
      void notifyPhotographerDashboardUsers({
        type: 'PHOTOGRAPHER_EVENT_CONFIRMED',
        title: 'Event Confirmed',
        message: `${eventLabel} for "${updatedEvent.fullName}" (${updatedEvent.companyOrGroupName || 'N/A'}) has been confirmed on ${selectedDate}.`,
        data: { eventId: params.eventId, eventType, fullName: updatedEvent.fullName },
      }).catch(() => {});
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
    if (event.paymentStatus === 'PAID' && event.totalAmount && event.userId) {
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
