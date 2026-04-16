import crypto from 'crypto';
import { getEmailLayout } from '@/lib/email/emailLayout';
import { sendEmail } from '@/lib/email/emailClient';
import { sendWhatsAppText } from '@/lib/whatsappClient';

type EventNotificationBooking = {
  bookingNumber?: unknown;
  fullName?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  specialRequests?: unknown;
};

export const EVENT_BOOKING_CONFIRMATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function generateEventBookingConfirmationToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function getEventBookingPreferredLanguage(event: EventNotificationBooking): 'en' | 'ar' {
  const specialRequests = typeof event.specialRequests === 'string' ? event.specialRequests : '';
  return /Preferred language:\s*ar/i.test(specialRequests) ? 'ar' : 'en';
}

export function buildEventBookingCompletionUrl(args: {
  origin: string;
  locale: 'en' | 'ar';
  token: string;
}): string {
  const base = args.origin.replace(/\/$/, '');
  return `${base}/${args.locale}/group-booking-events/complete/${args.token}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEventBookingCompletionRequest(input: {
  event: EventNotificationBooking;
  token: string;
  origin: string;
}): Promise<{ locale: 'en' | 'ar'; completionUrl: string }> {
  const locale = getEventBookingPreferredLanguage(input.event);
  const completionUrl = buildEventBookingCompletionUrl({
    origin: input.origin,
    locale,
    token: input.token,
  });
  const fullName = typeof input.event.fullName === 'string' && input.event.fullName.trim()
    ? input.event.fullName.trim()
    : 'Customer';
  const bookingNumber = typeof input.event.bookingNumber === 'string' ? input.event.bookingNumber : '';
  const email = typeof input.event.email === 'string' ? input.event.email.trim() : '';
  const phoneNumber = typeof input.event.phoneNumber === 'string' ? input.event.phoneNumber.trim() : '';
  const isArabic = locale === 'ar';

  const subject = isArabic ? 'أكملي حجز فعاليتك مع نون' : 'Complete your Noon event booking';
  const textBody = isArabic
    ? `مرحباً ${fullName}\n\nتمت مراجعة طلب الفعالية ${bookingNumber ? `(${bookingNumber}) ` : ''}وهو جاهز لإكمال الحجز. يرجى مراجعة الاتفاقية واختيار طريقة الدفع من خلال الرابط التالي:\n${completionUrl}\n\nإذا احتجتِ أي مساعدة، تواصلي معنا.`
    : `Hello ${fullName},\n\nYour event request ${bookingNumber ? `(${bookingNumber}) ` : ''}is ready for completion. Please review the agreement and choose your payment method using the secure link below:\n${completionUrl}\n\nIf you need any help, reply to this message.`;
  const html = await getEmailLayout({
    isArabic,
    title: subject,
    content: isArabic
      ? `<p>مرحباً ${escapeHtml(fullName)}</p><p>تمت مراجعة طلب الفعالية${bookingNumber ? ` <strong>${escapeHtml(bookingNumber)}</strong>` : ''} وهو جاهز لإكمال الحجز.</p><p>يرجى مراجعة الاتفاقية واختيار طريقة الدفع من خلال الرابط الآمن التالي:</p><p><a href="${completionUrl}">${escapeHtml(completionUrl)}</a></p><p>إذا احتجتِ أي مساعدة، تواصلي معنا.</p>`
      : `<p>Hello ${escapeHtml(fullName)},</p><p>Your event request${bookingNumber ? ` <strong>${escapeHtml(bookingNumber)}</strong>` : ''} is ready for completion.</p><p>Please review the agreement and choose your payment method using the secure link below:</p><p><a href="${completionUrl}">${escapeHtml(completionUrl)}</a></p><p>If you need any help, reply to this message.</p>`,
  });

  if (email) {
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text: textBody,
    });
    if (!result.ok) {
      console.error('Failed to send event completion email:', result.error);
    }
  }

  if (phoneNumber) {
    const result = await sendWhatsAppText({
      phoneNumber,
      text: textBody,
    });
    if (!result.ok) {
      console.error('Failed to send event completion WhatsApp message:', result.body);
    }
  }

  return { locale, completionUrl };
}