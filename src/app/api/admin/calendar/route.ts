import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET: List calendar events
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    const where: any = {};

    if (startDate && endDate) {
      where.startDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (type) {
      where.type = type;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        classSession: {
          include: {
            class: {
              select: {
                id: true,
                title: true,
                category: true,
                trainer: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        eventBooking: {
          select: {
            id: true,
            bookingNumber: true,
            eventType: true,
            fullName: true,
            status: true,
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
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

    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        type: 'BLOCKED',
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        title: title || 'Blocked Time',
        isBlocked: true,
        blockReason,
        internalNotes,
        visibleToTrainers: visibleToTrainers || false,
        visibleTrainerIds: visibleTrainerIds || [],
      },
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
