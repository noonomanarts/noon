import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type Params = {
  params: Promise<{ eventId: string }>;
};

// GET: Get single event
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const event = await prisma.eventBooking.findUnique({
      where: { id: params.eventId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        calendarEvent: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
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
    const { bookingNumber: _, ...updateData } = body;

    const updatedEvent = await prisma.eventBooking.update({
      where: { id: params.eventId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        calendarEvent: true,
      },
    });

    // If status changed to CLIENT_CONFIRMED, create calendar event
    if (
      updateData.status === 'CLIENT_CONFIRMED' &&
      !updatedEvent.calendarEvent
    ) {
      const eventTypeMap = {
        COOKING_COMPETITION: 'COMPETITION',
        PRIVATE_CLASS: 'PRIVATE_SESSION',
        BIRTHDAY_PARTY: 'BIRTHDAY_PARTY',
      };

      const startDateTime = new Date(updatedEvent.selectedDate);
      const [hours, minutes] = updatedEvent.selectedTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Estimate duration (3 hours for competition, 2-3 for others)
      const duration =
        updatedEvent.eventType === 'COOKING_COMPETITION' ? 3 : 2.5;
      const endDateTime = new Date(
        startDateTime.getTime() + duration * 60 * 60000
      );

      await prisma.calendarEvent.create({
        data: {
          type: eventTypeMap[updatedEvent.eventType] as any,
          startDateTime,
          endDateTime,
          title: `${updatedEvent.eventType} - ${updatedEvent.companyOrGroupName || updatedEvent.fullName}`,
          description: updatedEvent.specialRequests || '',
          eventBookingId: updatedEvent.id,
        },
      });

      // Add cleaning block if cooking-related
      if (
        updatedEvent.eventType === 'COOKING_COMPETITION' ||
        (updatedEvent.eventType === 'PRIVATE_CLASS' &&
          updatedEvent.preferredDish)
      ) {
        const cleaningStart = new Date(endDateTime);
        const cleaningEnd = new Date(
          cleaningStart.getTime() + 3 * 60 * 60000
        );

        await prisma.calendarEvent.create({
          data: {
            type: 'CLEANING',
            startDateTime: cleaningStart,
            endDateTime: cleaningEnd,
            title: 'Cleaning - Event',
            isBlocked: true,
            blockReason: 'Post-event cleaning',
          },
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
    const event = await prisma.eventBooking.findUnique({
      where: { id: params.eventId },
      include: { calendarEvent: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If paid, add to wallet
    if (event.paymentStatus === 'PAID' && event.totalAmount) {
      const refundAmount = event.totalAmount;
      
      await prisma.$transaction(async (tx) => {
        // Get or create wallet
        let wallet = await tx.wallet.findUnique({
          where: { userId: event.userId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: event.userId },
          });
        }

        // Add credit
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: refundAmount } },
        });

        // Add transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: refundAmount,
            type: 'CREDIT',
            reason: `Event cancellation refund - ${event.bookingNumber}`,
          },
        });
      });
    }

    // Delete event (cascade will delete calendar event)
    await prisma.eventBooking.delete({
      where: { id: params.eventId },
    });

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
