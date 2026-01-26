import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

// POST: Create event booking from public (website)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      eventType,
      selectedDate,
      selectedTime,
      packageType,
      numberOfParticipants,
      gifts,
      fullName,
      email,
      phoneNumber,
      companyOrGroupName,
      specialRequests,
      preferredDish,
    } = body;

    // Validation
    if (!eventType || !selectedDate || !selectedTime || !fullName || !email || !phoneNumber || !numberOfParticipants) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;
    
    let userId = sessionId;
    
    // If not logged in, try to find user by email or create guest entry
    if (!userId) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create a customer account for them
        const bcrypt = await import('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const newUser = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            fullName,
            phoneNumber,
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
        });
        
        userId = newUser.id;
        
        // TODO: Send welcome email with password
      }
    }

    // Generate booking number
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.eventBooking.count();
    const bookingNumber = `EVT-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount (placeholder - should be calculated based on package + gifts)
    let totalAmount = 0;
    if (packageType === 'STANDARD') {
      totalAmount = 2500; // Base price for standard
    } else if (packageType === 'PREMIUM') {
      totalAmount = 3500; // Base price for premium
    }
    
    if (gifts && Array.isArray(gifts)) {
      gifts.forEach((gift: any) => {
        totalAmount += gift.price;
      });
    }

    // Calculate number of groups (simplified)
    const numberOfGroups = Math.ceil(numberOfParticipants / 5);

    // Create event booking
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
        gifts: gifts ? JSON.parse(JSON.stringify(gifts)) : null,
        fullName,
        email,
        phoneNumber,
        companyOrGroupName,
        specialRequests,
        preferredDish,
        totalAmount,
        status: 'NEW',
      },
    });

    // TODO: Send confirmation email
    // TODO: Send WhatsApp notification

    return NextResponse.json(
      {
        success: true,
        bookingNumber: eventBooking.bookingNumber,
        message: 'Booking request submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating event booking:', error);
    return NextResponse.json(
      { error: 'Failed to create event booking' },
      { status: 500 }
    );
  }
}
