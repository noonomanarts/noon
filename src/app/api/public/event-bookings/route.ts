import { NextRequest, NextResponse } from 'next/server';
import { createEventBooking } from '@/lib/db/events';
import { getUserByEmail, createUser } from '@/lib/db/users';
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
      const existingUser = await getUserByEmail(email);
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create a customer account for them
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const newUser = await createUser({
          email,
          password: tempPassword,
          fullName,
          phoneNumber,
          role: 'CUSTOMER',
          preferredLanguage: 'ENGLISH',
        });
        
        if (newUser) {
          userId = newUser.id;
        } else {
          return NextResponse.json(
            { error: 'Failed to create user account' },
            { status: 500 }
          );
        }
        
        // TODO: Send welcome email with password
      }
    }

    // Calculate total amount (placeholder - should be calculated based on package + gifts)
    let totalAmount = 0;
    if (packageType === 'STANDARD') {
      totalAmount = 2500; // Base price for standard
    } else if (packageType === 'PREMIUM') {
      totalAmount = 3500; // Base price for premium
    }
    
    if (gifts && Array.isArray(gifts)) {
      gifts.forEach((gift: { price: number }) => {
        totalAmount += gift.price;
      });
    }

    // Calculate number of groups (simplified)
    const numberOfGroups = Math.ceil(numberOfParticipants / 5);

    // Create event booking
    const eventBooking = await createEventBooking({
      userId,
      eventType,
      selectedDate: new Date(selectedDate),
      selectedTime,
      packageType,
      numberOfParticipants,
      numberOfGroups,
      gifts: gifts ? { items: gifts } : undefined,
      fullName,
      email,
      phoneNumber,
      companyOrGroupName,
      preferredDish,
      specialRequests,
      totalAmount,
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
