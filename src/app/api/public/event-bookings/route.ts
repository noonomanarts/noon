import { NextRequest, NextResponse } from 'next/server';
import { createEventBooking } from '@/lib/db/events';
import { getUserByEmail, createUser, getUserById } from '@/lib/db/users';
import { cookies } from 'next/headers';
import { isDateInPast, isValidEmail, isValidPhone } from '@/lib/forms/eventBooking';
import {
  addMinutes,
  buildEventCalendarTitle,
  eventBookingToCalendarType,
  findCalendarOccupancy,
  isEventSlotAvailable,
  shouldCreateCleaningBlock,
} from '@/lib/calendar';
import { createCalendarEvent } from '@/lib/db/events';
import {
  getBirthdayPartyTotal,
  getPremiumCompetitionTotal,
  getPrivateArtsCraftsClassTotal,
  getPrivateCookingClassTotal,
  getStandardCompetitionTotal,
} from '@/lib/competitionPricing';

const EVENT_TYPES = new Set(['COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY']);
const PACKAGE_TYPES = new Set(['STANDARD', 'PREMIUM']);
const PRIVATE_CLASS_TYPES = new Set(['cooking', 'arts-crafts']);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseSafeString(value: unknown, maxLength = 255): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function parseParticipantCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function sanitizeGifts(value: unknown): Array<{
  id: string;
  name: string;
  price: number;
  scope?: string;
}> {
  if (!Array.isArray(value)) return [];

  const sanitized: Array<{ id: string; name: string; price: number; scope?: string }> = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    const id = parseSafeString(candidate.id, 80);
    const name = parseSafeString(candidate.name, 200);
    const scope = parseSafeString(candidate.scope, 80);
    const price = Number(candidate.price);

    if (!id || !name || !Number.isFinite(price) || price < 0) {
      continue;
    }

    sanitized.push({ id, name, price, scope: scope || undefined });
    if (sanitized.length >= 20) break;
  }

  return sanitized;
}

function validateParticipantsByEvent(
  eventType: string,
  participants: number,
  packageType?: 'STANDARD' | 'PREMIUM',
  privateClassType?: string
): boolean {
  if (!Number.isInteger(participants)) return false;
  if (eventType === 'COOKING_COMPETITION') {
    const minParticipants = packageType === 'PREMIUM' ? 6 : 8;
    return participants >= minParticipants && participants <= 40;
  }
  if (eventType === 'PRIVATE_CLASS') {
    if (privateClassType === 'arts-crafts') return participants >= 6;
    return participants >= 6 && participants <= 32;
  }
  if (eventType === 'BIRTHDAY_PARTY') return participants >= 1 && participants <= 40;
  return false;
}

// POST: Create event booking from public (website)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const eventType = parseSafeString(body.eventType, 80);
    const selectedDateRaw = parseSafeString(body.selectedDate, 20);
    const selectedTime = parseSafeString(body.selectedTime, 10);
    const packageTypeRaw = parseSafeString(body.packageType, 40);
    const classTypeRaw = parseSafeString(body.classType, 40);
    const fullName = parseSafeString(body.fullName, 255);
    const email = parseSafeString(body.email, 255).toLowerCase();
    const phoneNumber = parseSafeString(body.phoneNumber, 50);
    const companyOrGroupName = parseSafeString(body.companyOrGroupName, 255) || undefined;
    const specialRequestsRaw = parseSafeString(body.specialRequests, 3000);
    const preferredDish = parseSafeString(body.preferredDish, 255) || undefined;
    const preferredLanguage = parseSafeString(body.preferredLanguage, 20);
    const numberOfParticipants = parseParticipantCount(body.numberOfParticipants);
    const sanitizedGifts = sanitizeGifts(body.gifts);
    const childAge = parseParticipantCount(body.childAge);

    // Validation
    if (!eventType || !selectedDateRaw || !selectedTime || !fullName || !email || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    if (!TIME_PATTERN.test(selectedTime)) {
      return NextResponse.json(
        { error: 'Invalid time format' },
        { status: 400 }
      );
    }

    const selectedDate = new Date(`${selectedDateRaw}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      );
    }

    if (isDateInPast(selectedDateRaw)) {
      return NextResponse.json(
        { error: 'Selected date cannot be in the past' },
        { status: 400 }
      );
    }

    const packageType =
      packageTypeRaw && PACKAGE_TYPES.has(packageTypeRaw)
        ? (packageTypeRaw as 'STANDARD' | 'PREMIUM')
        : undefined;

    if (eventType === 'COOKING_COMPETITION' && !packageType) {
      return NextResponse.json(
        { error: 'Package type is required for cooking competition' },
        { status: 400 }
      );
    }

    if (eventType !== 'COOKING_COMPETITION' && packageTypeRaw && !packageType) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    if (!validateParticipantsByEvent(eventType, numberOfParticipants, packageType, classTypeRaw)) {
      return NextResponse.json(
        { error: 'Invalid number of participants for this event type' },
        { status: 400 }
      );
    }

    if (eventType === 'BIRTHDAY_PARTY' && (!Number.isInteger(childAge) || childAge < 10)) {
      return NextResponse.json(
        { error: 'Birthday party age is required and minimum age is 10' },
        { status: 400 }
      );
    }

    if (eventType === 'PRIVATE_CLASS' && classTypeRaw && !PRIVATE_CLASS_TYPES.has(classTypeRaw)) {
      return NextResponse.json(
        { error: 'Invalid private class type' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      );
    }

    if (!isValidPhone(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check if user is logged in
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    let userId: string | undefined;

    if (sessionId) {
      const sessionUser = await getUserById(sessionId);
      if (sessionUser) {
        userId = sessionUser.id;
      }
    }

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
          preferredLanguage: preferredLanguage === 'ar' ? 'ARABIC' : 'ENGLISH',
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

    if (!userId) {
      return NextResponse.json(
        { error: 'Unable to resolve user account' },
        { status: 500 }
      );
    }

    const giftsTotal = sanitizedGifts.reduce((sum, gift) => sum + gift.price, 0);

    // Keep amount as preliminary estimate; admin can update final pricing later.
    let totalAmount: number | undefined;
    if (eventType === 'COOKING_COMPETITION') {
      if (packageType === 'STANDARD') {
        const standardTotal = getStandardCompetitionTotal(numberOfParticipants);
        totalAmount = (standardTotal ?? 0) + giftsTotal;
      } else {
        const premiumTotal = getPremiumCompetitionTotal(numberOfParticipants);
        totalAmount = (premiumTotal ?? 0) + giftsTotal;
      }
    } else if (eventType === 'PRIVATE_CLASS' && classTypeRaw === 'cooking') {
      const privateCookingTotal = getPrivateCookingClassTotal(numberOfParticipants);
      totalAmount = (privateCookingTotal ?? 0) + giftsTotal;
    } else if (eventType === 'PRIVATE_CLASS' && classTypeRaw === 'arts-crafts') {
      const privateArtsCraftsTotal = getPrivateArtsCraftsClassTotal(numberOfParticipants);
      totalAmount = (privateArtsCraftsTotal ?? 0) + giftsTotal;
    } else if (eventType === 'BIRTHDAY_PARTY') {
      const birthdayTotal = getBirthdayPartyTotal(numberOfParticipants);
      totalAmount = (birthdayTotal ?? 0) + giftsTotal;
    } else if (giftsTotal > 0) {
      totalAmount = giftsTotal;
    }

    let numberOfGroups: number | undefined;
    if (eventType === 'COOKING_COMPETITION') {
      numberOfGroups = Math.max(2, Math.min(8, Math.ceil(numberOfParticipants / 5)));
    } else if (eventType === 'PRIVATE_CLASS') {
      numberOfGroups = Math.ceil(numberOfParticipants / 2);
    }

    const metadataParts: string[] = [];
    if (eventType === 'PRIVATE_CLASS' && PRIVATE_CLASS_TYPES.has(classTypeRaw)) {
      metadataParts.push(`Private class type: ${classTypeRaw}`);
      if (classTypeRaw === 'arts-crafts' && numberOfParticipants > 12) {
        metadataParts.push('External venue may be required; rental cost will be added to final workshop price');
      }
    }
    if (eventType === 'BIRTHDAY_PARTY') {
      metadataParts.push(`Child age: ${childAge}`);
    }
    if (preferredLanguage) {
      metadataParts.push(`Preferred language: ${preferredLanguage}`);
    }

    const mergedSpecialRequests = [specialRequestsRaw, metadataParts.join(' | ')]
      .filter(Boolean)
      .join(specialRequestsRaw ? '\n' : '') || undefined;

    const availability = await isEventSlotAvailable({
      eventType: eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
      selectedDate: selectedDateRaw,
      selectedTime,
      classType:
        eventType === 'PRIVATE_CLASS' && PRIVATE_CLASS_TYPES.has(classTypeRaw)
          ? (classTypeRaw as 'cooking' | 'arts-crafts')
          : undefined,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: 'Selected slot is no longer available. Please choose another time.' },
        { status: 409 }
      );
    }

    if (
      shouldCreateCleaningBlock(
        eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
        classTypeRaw === 'cooking' || classTypeRaw === 'arts-crafts'
          ? (classTypeRaw as 'cooking' | 'arts-crafts')
          : undefined
      )
    ) {
      const cleaningStart = new Date(availability.endDateTime);
      const cleaningEnd = addMinutes(cleaningStart, 180);
      const cleaningConflicts = await findCalendarOccupancy({
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
      });

      if (cleaningConflicts.length > 0) {
        return NextResponse.json(
          {
            error: 'Selected slot requires a 3-hour cleaning window that conflicts with another reservation',
            conflicts: cleaningConflicts,
          },
          { status: 409 }
        );
      }
    }

    // Create event booking
    const eventBooking = await createEventBooking({
      userId,
      eventType: eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
      selectedDate,
      selectedTime,
      packageType,
      numberOfParticipants,
      numberOfGroups,
      gifts: sanitizedGifts.length > 0 ? { items: sanitizedGifts } : undefined,
      fullName,
      email,
      phoneNumber,
      companyOrGroupName,
      preferredDish: eventType === 'PRIVATE_CLASS' ? preferredDish : undefined,
      specialRequests: mergedSpecialRequests,
      totalAmount,
    });

    const calendarTitle = buildEventCalendarTitle({
      eventType: eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
      fullName,
      companyOrGroupName,
    });

    await createCalendarEvent({
      type: eventBookingToCalendarType(eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY'),
      startDateTime: availability.startDateTime,
      endDateTime: availability.endDateTime,
      title: `Requested - ${calendarTitle}`,
      description: mergedSpecialRequests,
      eventBookingId: eventBooking.id as string,
      color:
        eventType === 'COOKING_COMPETITION'
          ? '#f97316'
          : eventType === 'PRIVATE_CLASS'
            ? '#14b8a6'
            : '#ec4899',
    });

    if (
      shouldCreateCleaningBlock(
        eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
        classTypeRaw === 'cooking' || classTypeRaw === 'arts-crafts'
          ? (classTypeRaw as 'cooking' | 'arts-crafts')
          : undefined
      )
    ) {
      const cleaningStart = new Date(availability.endDateTime);
      const cleaningEnd = addMinutes(cleaningStart, 180);

      await createCalendarEvent({
        type: 'CLEANING',
        startDateTime: cleaningStart,
        endDateTime: cleaningEnd,
        title: `Cleaning - ${calendarTitle}`,
        isBlocked: true,
        blockReason: 'Post-event cleaning',
        eventBookingId: eventBooking.id as string,
        color: '#f59e0b',
      });
    }

    // TODO: Send confirmation email
    // TODO: Send WhatsApp notification

    return NextResponse.json(
      {
        success: true,
        bookingNumber: eventBooking.bookingNumber,
        message: 'Booking request submitted successfully and is pending admin confirmation',
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
