import { readSessionUserId } from '@/lib/sessionToken';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  addWalletCredit,
  createCalendarEvent,
  deleteEventBooking,
  findUniqueEventBooking,
  updateCalendarEvent,
  updateEventBooking,
} from '@/lib/db/events';
import { cleanupClosedEventSettlement } from '@/lib/db/eventFinance';
import { query } from '@/lib/db/pool';
import {
  EVENT_BOOKING_CONFIRMATION_TOKEN_TTL_MS,
  generateEventBookingConfirmationToken,
  sendEventBookingCompletionRequest,
  sendEventBookingPaymentStatusNotification,
} from '@/lib/eventBookingWorkflow';
import { notifyPhotographerDashboardUsers } from '@/lib/photographerNotifications';
import {
  addMinutes,
  buildEventCalendarTitle,
  eventBookingToCalendarType,
  findCalendarOccupancy,
  isEventSlotAvailable,
  shouldCreateCleaningBlock,
} from '@/lib/calendar';
import { isQuarterHourTimeValue } from '@/lib/dateTime';
import { getSessionUserById } from '@/lib/db/users';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) return null;

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

/**
 * event_bookings.selected_date is a DATE column, which the pg driver returns
 * as a Date at local midnight (not a string). Normalise both shapes to
 * YYYY-MM-DD.
 */
function toDateKey(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return '';
}

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
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bookingNumber: _, ...updateData } = body;

    if (updateData.selectedTime !== undefined && !isQuarterHourTimeValue(String(updateData.selectedTime || ''))) {
      return NextResponse.json({ error: 'Time minutes must be 00, 15, 30, or 45' }, { status: 400 });
    }

    const existingEvent = await findUniqueEventBooking({ id: params.eventId });
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let confirmationToken: string | null = null;
    const isTransitionToPendingConfirmation =
      updateData.status === 'PENDING_CLIENT_CONFIRMATION' &&
      existingEvent.status !== 'PENDING_CLIENT_CONFIRMATION';

    if (isTransitionToPendingConfirmation) {
      confirmationToken = generateEventBookingConfirmationToken();
      updateData.confirmationToken = confirmationToken;
      updateData.confirmationTokenExpiresAt = new Date(Date.now() + EVENT_BOOKING_CONFIRMATION_TOKEN_TTL_MS);
    } else if (updateData.status === 'PENDING_CLIENT_CONFIRMATION') {
      // Already in this status — do not re-generate the token or re-send the link.
      delete updateData.status;
    }

    // Validate a new slot BEFORE saving anything, so a conflicting change is
    // rejected cleanly instead of being half-applied.
    const existingDate = toDateKey(existingEvent.selectedDate);
    const existingTime = typeof existingEvent.selectedTime === 'string' ? existingEvent.selectedTime : '';
    if (updateData.selectedDate !== undefined) {
      const requestedDate = toDateKey(updateData.selectedDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      updateData.selectedDate = requestedDate;
    }
    const requestedSlotDate = (updateData.selectedDate as string | undefined) ?? existingDate;
    const requestedSlotTime = updateData.selectedTime !== undefined ? String(updateData.selectedTime) : existingTime;
    const slotChanged = requestedSlotDate !== existingDate || requestedSlotTime !== existingTime;
    const isConfirming = updateData.status === 'CLIENT_CONFIRMED' && existingEvent.status !== 'CLIENT_CONFIRMED';
    const enforceSlot = slotChanged || isConfirming;

    if (enforceSlot && requestedSlotDate && requestedSlotTime) {
      const existingEventType = existingEvent.eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
      const existingClassType = getPrivateClassType({ ...existingEvent, ...updateData });
      const precheck = await isEventSlotAvailable({
        eventType: existingEventType,
        selectedDate: requestedSlotDate,
        selectedTime: requestedSlotTime,
        classType: existingClassType,
        excludeEventBookingId: params.eventId,
      });
      if (!precheck.available) {
        return NextResponse.json(
          { error: 'Selected slot conflicts with another confirmed or held booking' },
          { status: 409 }
        );
      }
      if (shouldCreateCleaningBlock(existingEventType, existingClassType)) {
        const cleaningStart = new Date(precheck.endDateTime);
        const cleaningConflicts = await findCalendarOccupancy({
          startDateTime: cleaningStart,
          endDateTime: addMinutes(cleaningStart, 180),
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
      }
    }

    const paymentStatusChanged =
      typeof updateData.paymentStatus === 'string' &&
      updateData.paymentStatus !== existingEvent.paymentStatus;
    const nextPaymentStatus = paymentStatusChanged ? (updateData.paymentStatus as string) : null;

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
    const selectedDate = toDateKey(updatedEvent.selectedDate);
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

      // Conflicts were already rejected before saving; a plain rename or note
      // edit must not be blocked by an overlap that existed beforehand.
      if (enforceSlot && !availability.available) {
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

        if (enforceSlot && cleaningConflicts.length > 0) {
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

    if (updateData.status === 'PENDING_CLIENT_CONFIRMATION' && confirmationToken) {
      void sendEventBookingCompletionRequest({
        event: updatedEvent,
        token: confirmationToken,
        origin: request.nextUrl.origin,
      }).catch((notificationError) => {
        console.error('Failed to send event completion request:', notificationError);
      });
    }

    if (nextPaymentStatus) {
      const paymentKind = nextPaymentStatus === 'PAID'
        ? 'PAID'
        : nextPaymentStatus === 'FAILED'
          ? 'FAILED'
          : nextPaymentStatus === 'REFUNDED'
            ? 'REFUNDED'
            : null;
      if (paymentKind) {
        void sendEventBookingPaymentStatusNotification({
          event: updatedEvent,
          kind: paymentKind,
        }).catch((notificationError) => {
          console.error('Failed to send event payment status notification:', notificationError);
        });
      }
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
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await findUniqueEventBooking({ id: params.eventId });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status === 'COMPLETED') {
      await cleanupClosedEventSettlement({ eventId: params.eventId });
    }

    // If paid, add to wallet for non-completed events only.
    // The refund is "claimed" with a conditional update first, so two delete
    // requests arriving together (double click, retry) credit the wallet once.
    let refunded = false;
    if (event.status !== 'COMPLETED' && event.paymentStatus === 'PAID' && event.totalAmount && event.userId) {
      const claim = await query(
        `UPDATE event_bookings SET payment_status = 'REFUNDED', updated_at = NOW()
         WHERE id = $1 AND payment_status = 'PAID'
         RETURNING id`,
        [params.eventId]
      );
      if ((claim.rowCount ?? 0) > 0) {
        const refundAmount = Number(event.totalAmount);
        try {
          await addWalletCredit(
            event.userId as string,
            refundAmount,
            `Event cancellation refund - ${event.bookingNumber}`
          );
          refunded = true;
        } catch (refundError) {
          // Put the booking back so the refund can be retried.
          await query(
            `UPDATE event_bookings SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1 AND payment_status = 'REFUNDED'`,
            [params.eventId]
          );
          throw refundError;
        }
      }
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
      refunded,
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
