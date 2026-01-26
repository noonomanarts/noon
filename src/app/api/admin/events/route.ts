import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET: List all event bookings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST: Create event booking (manual by admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      eventType,
      selectedDate,
      selectedTime,
      packageType,
      numberOfParticipants,
      numberOfGroups,
      gifts,
      fullName,
      email,
      phoneNumber,
      companyOrGroupName,
      preferredDish,
      specialRequests,
      totalAmount,
    } = body;

    // Generate booking number
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.eventBooking.count();
    const bookingNumber = `EVT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const eventBooking = await prisma.eventBooking.create({
      data: {
        bookingNumber,
        userId,
        eventType,
        selectedDate: new Date(selectedDate),
        selectedTime,
        packageType,
        numberOfParticipants,
        numberOfGroups,
        gifts,
        fullName,
        email,
        phoneNumber,
        companyOrGroupName,
        preferredDish,
        specialRequests,
        totalAmount,
        status: 'NEW',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(eventBooking, { status: 201 });
  } catch (error) {
    console.error('Error creating event booking:', error);
    return NextResponse.json(
      { error: 'Failed to create event booking' },
      { status: 500 }
    );
  }
}
