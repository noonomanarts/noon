import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import {
  createCalendarEvent,
  findUniqueEventBooking,
  updateCalendarEvent,
  updateEventBooking,
} from '@/lib/db/events';
import { query } from '@/lib/db/pool';
import {
  addMinutes,
  buildEventCalendarTitle,
  eventBookingToCalendarType,
  findCalendarOccupancy,
  isEventSlotAvailable,
  shouldCreateCleaningBlock,
} from '@/lib/calendar';
import { sanitizeInvoiceTemplateSettings, type InvoiceTemplateSettings } from '@/lib/adminSettings';
import { prepareAmwalPayment } from '@/lib/amwal';
import { getEventBookingPreferredLanguage } from '@/lib/eventBookingWorkflow';
import { getUploadRootDir } from '@/lib/uploadStorage';

type Params = {
  params: Promise<{ token: string }>;
};

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

function getInvoiceSettingsPayload(settings: InvoiceTemplateSettings) {
  return {
    bankName: settings.bankName,
    bankAccount: settings.bankAccount,
    bankIban: settings.bankIban,
    companyName: settings.companyName,
    companyNameAr: settings.companyNameAr,
    companyEmail: settings.companyEmail,
    companyPhone: settings.companyPhone,
  };
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1' || value === 'on';
}

function formatMuscatDate(value: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return year && month && day ? `${year}-${month}-${day}` : '';
}

function formatMuscatTime(value: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Muscat',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(value);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  return hour && minute ? `${hour}:${minute}` : '';
}

function normalizeSelectedDate(value: unknown, fallbackDateTime?: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized) {
      return normalized.slice(0, 10);
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatMuscatDate(value);
  }

  const fallback = fallbackDateTime instanceof Date
    ? fallbackDateTime
    : typeof fallbackDateTime === 'string'
      ? new Date(fallbackDateTime)
      : null;
  if (fallback && !Number.isNaN(fallback.getTime())) {
    return formatMuscatDate(fallback);
  }

  return '';
}

function normalizeSelectedTime(value: unknown, fallbackDateTime?: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized) {
      return normalized;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatMuscatTime(value);
  }

  const fallback = fallbackDateTime instanceof Date
    ? fallbackDateTime
    : typeof fallbackDateTime === 'string'
      ? new Date(fallbackDateTime)
      : null;
  if (fallback && !Number.isNaN(fallback.getTime())) {
    return formatMuscatTime(fallback);
  }

  return '';
}

function buildCompletionPayload(event: Record<string, unknown>, invoiceSettings: InvoiceTemplateSettings) {
  const tokenExpiresAt = event.confirmationTokenExpiresAt instanceof Date
    ? event.confirmationTokenExpiresAt.toISOString()
    : typeof event.confirmationTokenExpiresAt === 'string'
      ? event.confirmationTokenExpiresAt
      : null;

  return {
    booking: {
      id: String(event.id || ''),
      bookingNumber: typeof event.bookingNumber === 'string' ? event.bookingNumber : '',
      eventType: typeof event.eventType === 'string' ? event.eventType : '',
      status: typeof event.status === 'string' ? event.status : '',
      selectedDate: event.selectedDate ?? null,
      selectedTime: event.selectedTime ?? null,
      packageType: event.packageType ?? null,
      numberOfParticipants: typeof event.numberOfParticipants === 'number' ? event.numberOfParticipants : null,
      numberOfGroups: typeof event.numberOfGroups === 'number' ? event.numberOfGroups : null,
      fullName: typeof event.fullName === 'string' ? event.fullName : '',
      email: typeof event.email === 'string' ? event.email : '',
      phoneNumber: typeof event.phoneNumber === 'string' ? event.phoneNumber : '',
      companyOrGroupName: typeof event.companyOrGroupName === 'string' ? event.companyOrGroupName : '',
      preferredDish: typeof event.preferredDish === 'string' ? event.preferredDish : '',
      specialRequests: typeof event.specialRequests === 'string' ? event.specialRequests : '',
      totalAmount: typeof event.totalAmount === 'number' ? event.totalAmount : null,
      currency: typeof event.currency === 'string' ? event.currency : 'OMR',
      paymentMethod: typeof event.paymentMethod === 'string' ? event.paymentMethod : null,
      paymentStatus: typeof event.paymentStatus === 'string' ? event.paymentStatus : 'PENDING',
      paymentProof: typeof event.paymentProof === 'string' ? event.paymentProof : null,
      agreementAccepted: Boolean(event.agreementAccepted),
      clientConfirmed: Boolean(event.clientConfirmed),
      tokenExpiresAt,
      tokenExpired: tokenExpiresAt ? new Date(tokenExpiresAt).getTime() < Date.now() : false,
    },
    bankDetails: getInvoiceSettingsPayload(invoiceSettings),
  };
}

async function getBookingByToken(token: string) {
  const booking = await findUniqueEventBooking({ confirmationToken: token });
  if (!booking) {
    return null;
  }
  return booking;
}

async function syncConfirmedCalendar(eventId: string, event: Record<string, unknown>) {
  const calendarResult = await query(
    `SELECT * FROM calendar_events
     WHERE event_booking_id = $1
     ORDER BY CASE WHEN type = 'CLEANING' THEN 1 ELSE 0 END, start_date_time ASC`,
    [eventId]
  );

  const primaryCalendarEvent = calendarResult.rows.find((row) => row.type !== 'CLEANING') ?? null;
  const cleaningCalendarEvent = calendarResult.rows.find((row) => row.type === 'CLEANING') ?? null;
  const eventType = event.eventType as 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
  const classType = getPrivateClassType(event);
  const selectedDate = normalizeSelectedDate(event.selectedDate, primaryCalendarEvent?.start_date_time);
  const selectedTime = normalizeSelectedTime(event.selectedTime, primaryCalendarEvent?.start_date_time);

  if (!selectedDate || !selectedTime) {
    throw new Error('Event schedule is incomplete.');
  }

  const availability = await isEventSlotAvailable({
    eventType,
    selectedDate,
    selectedTime,
    classType,
    excludeEventBookingId: eventId,
  });

  if (!availability.available) {
    throw new Error('Selected slot conflicts with another confirmed or held booking.');
  }

  const title = buildEventCalendarTitle({
    eventType,
    fullName: String(event.fullName || ''),
    companyOrGroupName: typeof event.companyOrGroupName === 'string' ? event.companyOrGroupName : undefined,
  });

  if (primaryCalendarEvent) {
    await updateCalendarEvent(primaryCalendarEvent.id as string, {
      type: eventBookingToCalendarType(eventType),
      startDateTime: availability.startDateTime,
      endDateTime: availability.endDateTime,
      title,
      description: (event.specialRequests as string) || '',
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
      title,
      description: (event.specialRequests as string) || '',
      eventBookingId: eventId,
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
      excludeEventBookingId: eventId,
    });

    if (cleaningConflicts.length > 0) {
      throw new Error('This event requires a 3-hour cleaning block, but the cleaning window conflicts with the current timetable.');
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
        eventBookingId: eventId,
        color: '#f59e0b',
      });
    }
  }
}

export async function GET(request: NextRequest, props: Params) {
  const params = await props.params;

  try {
    const booking = await getBookingByToken(params.token);
    if (!booking) {
      return NextResponse.json({ error: 'Booking confirmation link is invalid.' }, { status: 404 });
    }

    const invoiceSettings = sanitizeInvoiceTemplateSettings(
      await getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template')
    );

    return NextResponse.json(buildCompletionPayload(booking, invoiceSettings));
  } catch (error) {
    console.error('Error loading event booking confirmation:', error);
    return NextResponse.json({ error: 'Failed to load booking confirmation.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, props: Params) {
  const params = await props.params;

  try {
    const booking = await getBookingByToken(params.token);
    if (!booking) {
      return NextResponse.json({ error: 'Booking confirmation link is invalid.' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'This booking can no longer be updated.' }, { status: 409 });
    }

    const expiresAt = booking.confirmationTokenExpiresAt instanceof Date
      ? booking.confirmationTokenExpiresAt.getTime()
      : typeof booking.confirmationTokenExpiresAt === 'string'
        ? new Date(booking.confirmationTokenExpiresAt).getTime()
        : NaN;
    if (!booking.clientConfirmed && Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      return NextResponse.json({ error: 'This confirmation link has expired. Please contact Noon to resend it.' }, { status: 410 });
    }

    const formData = await request.formData();
    const agreementAccepted = parseBoolean(formData.get('agreementAccepted'));
    const digitalSignature = String(formData.get('digitalSignature') || '').trim().slice(0, 255);
    const paymentMethod = String(formData.get('paymentMethod') || '').trim().toUpperCase();
    const locale = getEventBookingPreferredLanguage(booking);

    if (!agreementAccepted) {
      return NextResponse.json({ error: 'You must accept the agreement before continuing.' }, { status: 400 });
    }

    if (!digitalSignature) {
      return NextResponse.json({ error: 'Digital signature is required.' }, { status: 400 });
    }

    if (paymentMethod !== 'ONLINE' && paymentMethod !== 'BANK_TRANSFER') {
      return NextResponse.json({ error: 'Please choose a payment method.' }, { status: 400 });
    }

    let paymentProof = typeof booking.paymentProof === 'string' ? booking.paymentProof : null;
    const paymentProofFile = formData.get('paymentProof');
    if (paymentMethod === 'BANK_TRANSFER' && paymentProofFile && typeof paymentProofFile !== 'string' && paymentProofFile.size > 0) {
      const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
      if (!allowedTypes.has(paymentProofFile.type)) {
        return NextResponse.json({ error: 'Payment proof must be a PDF or image file.' }, { status: 400 });
      }
      if (paymentProofFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Payment proof must be 10MB or less.' }, { status: 400 });
      }

      const ext = path.extname(paymentProofFile.name) || (paymentProofFile.type === 'application/pdf' ? '.pdf' : '.jpg');
      const dir = path.join(getUploadRootDir(), 'event-payment-proofs');
      await mkdir(dir, { recursive: true });
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      await writeFile(path.join(dir, fileName), Buffer.from(await paymentProofFile.arrayBuffer()));
      paymentProof = `/uploads/event-payment-proofs/${fileName}`;
    }

    const baseUpdate = {
      agreementAccepted: true,
      digitalSignature,
      clientConfirmed: true,
      clientConfirmedAt: booking.clientConfirmedAt instanceof Date
        ? booking.clientConfirmedAt
        : new Date(),
      status: 'CLIENT_CONFIRMED' as const,
      paymentMethod,
      paymentStatus: paymentMethod === 'BANK_TRANSFER' ? 'PENDING' as const : 'PENDING' as const,
      paymentProof,
    };

    if (paymentMethod === 'BANK_TRANSFER') {
      const updatedBooking = await updateEventBooking(String(booking.id), baseUpdate);
      if (!updatedBooking) {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }

      await syncConfirmedCalendar(String(booking.id), updatedBooking);

      return NextResponse.json({
        success: true,
        booking: {
          status: updatedBooking.status,
          paymentStatus: updatedBooking.paymentStatus,
          paymentMethod: updatedBooking.paymentMethod,
          paymentProof: updatedBooking.paymentProof,
        },
      });
    }

    const totalAmount = typeof booking.totalAmount === 'number' ? booking.totalAmount : NaN;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Final payment amount is not available for this booking yet.' }, { status: 409 });
    }

    const paymentReference = `EVENT-${String(booking.id)}-${Date.now()}`;
    const amwalPayment = prepareAmwalPayment({
      amount: totalAmount,
      currency: typeof booking.currency === 'string' ? booking.currency : 'OMR',
      reference: paymentReference,
      locale,
      purpose: 'EVENT_BOOKING',
      contact: {
        fullName: typeof booking.fullName === 'string' ? booking.fullName : 'Noon Customer',
        email: typeof booking.email === 'string' ? booking.email : 'payments@noonomanarts.com',
        phoneNumber: typeof booking.phoneNumber === 'string' ? booking.phoneNumber : '',
      },
      bookingNumber: typeof booking.bookingNumber === 'string' ? booking.bookingNumber : String(booking.id),
    });

    const updatedBooking = await updateEventBooking(String(booking.id), {
      ...baseUpdate,
      paymentGateway: 'AMWAL',
      paymentReference,
      paymentGatewayOrderId: null,
    });
    if (!updatedBooking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    await syncConfirmedCalendar(String(booking.id), updatedBooking);

    return NextResponse.json({
      success: true,
      checkout: {
        scriptUrl: amwalPayment.scriptUrl,
        config: amwalPayment.config,
        reference: paymentReference,
      },
    });
  } catch (error) {
    console.error('Error completing event booking:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete booking.' },
      { status: 500 }
    );
  }
}