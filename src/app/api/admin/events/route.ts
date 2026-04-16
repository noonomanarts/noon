import { NextRequest, NextResponse } from 'next/server';
import { findManyEventBookings, createEventBooking } from '@/lib/db/events';
import { getUserByEmail, getUserById } from '@/lib/db/users';
import { isValidEmail, isValidPhone } from '@/lib/forms/eventBooking';
import { resolveEventGiftSelections } from '@/lib/eventGiftAddOns';
import {
  getBirthdayPartyTotal,
  getPremiumCompetitionTotal,
  getPrivateArtsCraftsClassTotal,
  getPrivateCookingClassTotal,
  getStandardCompetitionTotal,
} from '@/lib/competitionPricing';

const EVENT_TYPES = new Set(['COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY']);
const EVENT_STATUSES = new Set([
  'NEW',
  'IN_PROGRESS',
  'PENDING_CLIENT_CONFIRMATION',
  'CLIENT_CONFIRMED',
  'PENDING_PAYMENT',
  'COMPLETED',
  'CANCELLED',
]);
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

function toMoney(value: number): number {
  return Number(value.toFixed(3));
}

// GET: List all event bookings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const parsedPage = parseInt(searchParams.get('page') || '1', 10);
    const parsedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const skip = (page - 1) * limit;

    if (eventType && !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type filter' }, { status: 400 });
    }

    if (status && !EVENT_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const where: Record<string, string> = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    if (search && search.trim()) where.search = search.trim().slice(0, 120);

    const { events, total } = await findManyEventBookings({
      where: where as {
        eventType?: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
        status?: 'NEW' | 'IN_PROGRESS' | 'PENDING_CLIENT_CONFIRMATION' | 'CLIENT_CONFIRMED' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
        search?: string;
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const row = body as Record<string, unknown>;

    const userId = parseSafeString(row.userId, 120);
    const eventType = parseSafeString(row.eventType, 80);
    const selectedDateRaw = parseSafeString(row.selectedDate, 20);
    const selectedTime = parseSafeString(row.selectedTime, 10);
    const packageTypeRaw = parseSafeString(row.packageType, 40);
    const classTypeRaw = parseSafeString(row.classType, 40);
    const fullName = parseSafeString(row.fullName, 255);
    const email = parseSafeString(row.email, 255).toLowerCase();
    const phoneNumber = parseSafeString(row.phoneNumber, 50);
    const companyOrGroupName = parseSafeString(row.companyOrGroupName, 255) || undefined;
    const preferredDish = parseSafeString(row.preferredDish, 255) || undefined;
    const specialRequests = parseSafeString(row.specialRequests, 3000) || undefined;
    const numberOfParticipants = parseParticipantCount(row.numberOfParticipants);
    const numberOfGroupsRaw = parseParticipantCount(row.numberOfGroups);
    const childAge = parseParticipantCount(row.childAge);
    const discountAmountRaw = row.discountAmount;

    if (!eventType || !selectedDateRaw || !selectedTime || !fullName || !email || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    if (!TIME_PATTERN.test(selectedTime)) {
      return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
    }

    const selectedDate = new Date(`${selectedDateRaw}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
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
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 });
    }

    if (eventType === 'PRIVATE_CLASS' && classTypeRaw && !PRIVATE_CLASS_TYPES.has(classTypeRaw)) {
      return NextResponse.json({ error: 'Invalid private class type' }, { status: 400 });
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

    const gifts = await resolveEventGiftSelections({
      value: row.gifts,
      eventType: eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
      participantCount: numberOfParticipants,
    });

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!isValidPhone(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const numberOfGroups = Number.isInteger(numberOfGroupsRaw) && numberOfGroupsRaw > 0
      ? numberOfGroupsRaw
      : undefined;
    if (numberOfGroups && numberOfGroups > 40) {
      return NextResponse.json({ error: 'Invalid number of groups' }, { status: 400 });
    }

    const discountAmount =
      discountAmountRaw === undefined || discountAmountRaw === null || discountAmountRaw === ''
        ? 0
        : Number(discountAmountRaw);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return NextResponse.json({ error: 'Invalid discount amount' }, { status: 400 });
    }

    let resolvedUserId: string | undefined;
    if (userId) {
      const user = (await getUserById(userId)) ?? (userId.includes('@') ? await getUserByEmail(userId) : null);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      resolvedUserId = user.id;
    } else {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        resolvedUserId = existingUser.id;
      }
    }

    const giftsTotal = gifts.estimatedTotal;
    let calculatedBaseAmount: number | undefined;
    if (eventType === 'COOKING_COMPETITION') {
      calculatedBaseAmount = packageType === 'PREMIUM'
        ? getPremiumCompetitionTotal(numberOfParticipants) ?? undefined
        : getStandardCompetitionTotal(numberOfParticipants) ?? undefined;
    } else if (eventType === 'PRIVATE_CLASS' && classTypeRaw === 'arts-crafts') {
      calculatedBaseAmount = getPrivateArtsCraftsClassTotal(numberOfParticipants) ?? undefined;
    } else if (eventType === 'PRIVATE_CLASS') {
      calculatedBaseAmount = getPrivateCookingClassTotal(numberOfParticipants) ?? undefined;
    } else if (eventType === 'BIRTHDAY_PARTY') {
      calculatedBaseAmount = getBirthdayPartyTotal(numberOfParticipants) ?? undefined;
    }

    const subtotalAmount = toMoney((calculatedBaseAmount ?? 0) + giftsTotal);
    const totalAmount = toMoney(Math.max(0, subtotalAmount - discountAmount));

    const metadataParts: string[] = [];
    if (eventType === 'PRIVATE_CLASS' && PRIVATE_CLASS_TYPES.has(classTypeRaw)) {
      metadataParts.push(`Private class type: ${classTypeRaw}`);
      if (classTypeRaw === 'arts-crafts' && numberOfParticipants > 12) {
        metadataParts.push('External venue may be required; rental cost may be added later');
      }
    }
    if (eventType === 'BIRTHDAY_PARTY') {
      metadataParts.push(`Child age: ${childAge}`);
    }
    if (discountAmount > 0) {
      metadataParts.push(`Discount amount: ${toMoney(discountAmount)}`);
      metadataParts.push(`Subtotal before discount: ${subtotalAmount}`);
    }
    const mergedSpecialRequests = [specialRequests, metadataParts.join(' | ')]
      .filter(Boolean)
      .join(specialRequests ? '\n' : '') || undefined;

    const eventBooking = await createEventBooking({
      userId: resolvedUserId,
      eventType: eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY',
      selectedDate,
      selectedTime,
      packageType,
      numberOfParticipants,
      numberOfGroups,
      gifts:
        gifts.items.length > 0
          ? {
              items: gifts.items,
              estimatedTotal: gifts.estimatedTotal,
              deferredCount: gifts.deferredCount,
            }
          : undefined,
      fullName,
      email,
      phoneNumber,
      companyOrGroupName,
      preferredDish: eventType === 'PRIVATE_CLASS' && classTypeRaw === 'cooking' ? preferredDish : undefined,
      specialRequests: mergedSpecialRequests,
      discountAmount: discountAmount > 0 ? toMoney(discountAmount) : 0,
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
