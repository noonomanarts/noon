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

const DEFAULT_SITE_URL = 'https://noonomanarts.com';

function isUsablePublicOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (!host) return false;
    if (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1' || host === '::1') {
      return false;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (!host.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

export function getPublicSiteBaseUrl(requestOrigin?: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && isUsablePublicOrigin(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }
  if (isUsablePublicOrigin(requestOrigin)) {
    return (requestOrigin as string).replace(/\/$/, '');
  }
  return DEFAULT_SITE_URL;
}

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
  const base = getPublicSiteBaseUrl(args.origin);
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

function resolveFullName(event: EventNotificationBooking): string {
  return typeof event.fullName === 'string' && event.fullName.trim()
    ? event.fullName.trim()
    : 'Customer';
}

function resolveBookingNumber(event: EventNotificationBooking): string {
  return typeof event.bookingNumber === 'string' ? event.bookingNumber : '';
}

async function deliverEventNotification(input: {
  event: EventNotificationBooking;
  subject: string;
  text: string;
  html: string;
  logLabel: string;
}): Promise<void> {
  const email = typeof input.event.email === 'string' ? input.event.email.trim() : '';
  const phoneNumber = typeof input.event.phoneNumber === 'string' ? input.event.phoneNumber.trim() : '';

  if (email) {
    const result = await sendEmail({
      to: email,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (!result.ok) {
      console.error(`Failed to send ${input.logLabel} email:`, result.error);
    }
  }

  if (phoneNumber) {
    const result = await sendWhatsAppText({
      phoneNumber,
      text: input.text,
    });
    if (!result.ok) {
      console.error(`Failed to send ${input.logLabel} WhatsApp message:`, result.body);
    }
  }
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
  const fullName = resolveFullName(input.event);
  const bookingNumber = resolveBookingNumber(input.event);
  const isArabic = locale === 'ar';
  const ref = bookingNumber ? ` (${bookingNumber})` : '';

  const subject = isArabic
    ? `أكملي حجزك${ref}`
    : `Complete your booking${ref}`;

  const text = isArabic
    ? `مرحباً ${fullName}،
طلب الفعالية${ref} جاهز للإكمال.
راجعي الاتفاقية واختاري طريقة الدفع:
${completionUrl}

فريق نون`
    : `Hi ${fullName},
Your event request${ref} is ready to complete.
Review the agreement and pick a payment method:
${completionUrl}

Noon Team`;

  const html = await getEmailLayout({
    isArabic,
    title: subject,
    content: isArabic
      ? `<p>مرحباً ${escapeHtml(fullName)}،</p><p>طلب الفعالية${bookingNumber ? ` <strong>${escapeHtml(bookingNumber)}</strong>` : ''} جاهز للإكمال.</p><p>راجعي الاتفاقية واختاري طريقة الدفع عبر الرابط الآمن:</p><p><a href="${completionUrl}">${escapeHtml(completionUrl)}</a></p><p>— فريق نون</p>`
      : `<p>Hi ${escapeHtml(fullName)},</p><p>Your event request${bookingNumber ? ` <strong>${escapeHtml(bookingNumber)}</strong>` : ''} is ready to complete.</p><p>Review the agreement and pick a payment method using the secure link below:</p><p><a href="${completionUrl}">${escapeHtml(completionUrl)}</a></p><p>— Noon Team</p>`,
  });

  await deliverEventNotification({
    event: input.event,
    subject,
    text,
    html,
    logLabel: 'event completion',
  });

  return { locale, completionUrl };
}

export type EventPaymentNotificationKind = 'PAID' | 'FAILED' | 'REFUNDED';

export async function sendEventBookingPaymentStatusNotification(input: {
  event: EventNotificationBooking;
  kind: EventPaymentNotificationKind;
}): Promise<void> {
  const locale = getEventBookingPreferredLanguage(input.event);
  const isArabic = locale === 'ar';
  const fullName = resolveFullName(input.event);
  const bookingNumber = resolveBookingNumber(input.event);
  const ref = bookingNumber ? ` (${bookingNumber})` : '';
  const strongRef = bookingNumber ? ` <strong>${escapeHtml(bookingNumber)}</strong>` : '';

  let subject: string;
  let text: string;
  let contentHtml: string;

  if (input.kind === 'PAID') {
    subject = isArabic ? `تم استلام الدفع${ref}` : `Payment received${ref}`;
    text = isArabic
      ? `مرحباً ${fullName}،
تم استلام دفعتك لطلب الفعالية${ref}. حجزك مؤكد الآن وسنتواصل معك بأي تحديثات.

فريق نون`
      : `Hi ${fullName},
We've received your payment for event${ref}. Your booking is now confirmed and we'll be in touch with any updates.

Noon Team`;
    contentHtml = isArabic
      ? `<p>مرحباً ${escapeHtml(fullName)}،</p><p>تم استلام دفعتك لطلب الفعالية${strongRef}. حجزك مؤكد الآن.</p><p>— فريق نون</p>`
      : `<p>Hi ${escapeHtml(fullName)},</p><p>We've received your payment for event${strongRef}. Your booking is now confirmed.</p><p>— Noon Team</p>`;
  } else if (input.kind === 'FAILED') {
    subject = isArabic ? `تعذّر إتمام الدفع${ref}` : `Payment unsuccessful${ref}`;
    text = isArabic
      ? `مرحباً ${fullName}،
لم نتمكن من تأكيد دفعتك لطلب الفعالية${ref}. يرجى المحاولة مرة أخرى أو التواصل معنا لأي مساعدة.

فريق نون`
      : `Hi ${fullName},
We couldn't confirm your payment for event${ref}. Please try again or reply if you need help.

Noon Team`;
    contentHtml = isArabic
      ? `<p>مرحباً ${escapeHtml(fullName)}،</p><p>لم نتمكن من تأكيد دفعتك لطلب الفعالية${strongRef}. يرجى المحاولة مرة أخرى أو التواصل معنا.</p><p>— فريق نون</p>`
      : `<p>Hi ${escapeHtml(fullName)},</p><p>We couldn't confirm your payment for event${strongRef}. Please try again or reply if you need help.</p><p>— Noon Team</p>`;
  } else {
    subject = isArabic ? `تم استرداد المبلغ${ref}` : `Refund processed${ref}`;
    text = isArabic
      ? `مرحباً ${fullName}،
تمت معالجة الاسترداد الخاص بطلب الفعالية${ref} وأُضيف الرصيد إلى محفظتك.

فريق نون`
      : `Hi ${fullName},
Your refund for event${ref} has been processed and credited to your wallet.

Noon Team`;
    contentHtml = isArabic
      ? `<p>مرحباً ${escapeHtml(fullName)}،</p><p>تمت معالجة الاسترداد لطلب الفعالية${strongRef} وأُضيف الرصيد إلى محفظتك.</p><p>— فريق نون</p>`
      : `<p>Hi ${escapeHtml(fullName)},</p><p>Your refund for event${strongRef} has been processed and credited to your wallet.</p><p>— Noon Team</p>`;
  }

  const html = await getEmailLayout({ isArabic, title: subject, content: contentHtml });
  await deliverEventNotification({
    event: input.event,
    subject,
    text,
    html,
    logLabel: `event payment ${input.kind.toLowerCase()}`,
  });
}