import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type Params = {
  params: Promise<{ classId: string }>;
};

// GET: List sessions for a class
export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;
  try {
    const sessions = await prisma.classSession.findMany({
      where: { classId: params.classId },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            numberOfParticipants: true,
          },
        },
        calendarEvent: true,
      },
      orderBy: { startDateTime: 'asc' },
    });

    return NextResponse.json(sessions);
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
    const classData = await prisma.class.findUnique({
      where: { id: params.classId },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Calculate end time if not provided
    const start = new Date(startDateTime);
    const end = endDateTime
      ? new Date(endDateTime)
      : new Date(start.getTime() + classData.durationMinutes * 60000);

    // Create session
    const session = await prisma.classSession.create({
      data: {
        classId: params.classId,
        startDateTime: start,
        endDateTime: end,
        seatsTotal: seatsTotal || classData.seatsTotal,
      },
    });

    // Create calendar event
    await prisma.calendarEvent.create({
      data: {
        type: 'CLASS',
        startDateTime: start,
        endDateTime: end,
        title: classData.title,
        description: classData.description,
        classSessionId: session.id,
      },
    });

    // If cooking class, add 3-hour cleaning block
    if (classData.category === 'COOKING') {
      const cleaningStart = new Date(end);
      const cleaningEnd = new Date(cleaningStart.getTime() + 3 * 60 * 60000);

      await prisma.calendarEvent.create({
        data: {
          type: 'CLEANING',
          startDateTime: cleaningStart,
          endDateTime: cleaningEnd,
          title: 'Cleaning - ' + classData.title,
          isBlocked: true,
          blockReason: 'Post-cooking class cleaning',
        },
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
