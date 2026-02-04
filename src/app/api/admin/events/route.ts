import { NextRequest, NextResponse } from 'next/server';
import { findManyEventBookings, createEventBooking } from '@/lib/db/events';

// GET: List all event bookings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, string> = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const { events, total } = await findManyEventBookings({
      where: where as {
        eventType?: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
        status?: 'NEW' | 'IN_PROGRESS' | 'PENDING_CLIENT_CONFIRMATION' | 'CLIENT_CONFIRMED' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

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

    const eventBooking = await createEventBooking({
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
