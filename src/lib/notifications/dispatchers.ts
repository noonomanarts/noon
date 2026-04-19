/**
 * Outbox dispatchers: one `OutboxSender` per channel.
 *
 * Each sender reads the needed destination data from the outbox row's
 * `data` JSON column (set by the caller when enqueuing) and invokes the
 * low-level client. Failures are classified as retryable or permanent so
 * the outbox can either re-schedule or mark the row FAILED.
 */

import { sendEmail } from '@/lib/email/emailClient';
import { sendWhatsAppText } from '@/lib/whatsappClient';
import { createNotification } from '@/lib/db/notifications';
import { sendPushToUser } from '@/lib/push/pushClient';
import { registerDispatchers, type OutboxRow, type OutboxSender } from './outbox';
import type { NotificationChannel } from '@/lib/db/types';

function dataOf(row: OutboxRow): Record<string, unknown> {
  const data = row.data;
  return data && typeof data === 'object' ? data : {};
}

function stringField(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export const emailSender: OutboxSender = async (row) => {
  const data = dataOf(row);
  const to = stringField(data, 'to');
  if (!to) {
    return { ok: true, skip: true, reason: 'missing recipient email' };
  }
  const html = stringField(data, 'html') ?? row.body ?? '';
  const replyTo = stringField(data, 'replyTo') ?? undefined;
  const subject = row.title ?? stringField(data, 'subject') ?? '(no subject)';

  const result = await sendEmail({
    to,
    subject,
    html,
    text: stringField(data, 'text') ?? undefined,
    replyTo,
  });
  if (result.ok) {
    return { ok: true, providerMessageId: result.messageId ?? null };
  }
  return { ok: false, error: result.error ?? 'unknown email error', retry: true };
};

export const whatsappSender: OutboxSender = async (row) => {
  const data = dataOf(row);
  const phoneNumber = stringField(data, 'phoneNumber');
  if (!phoneNumber) {
    return { ok: true, skip: true, reason: 'missing phone number' };
  }
  const text = row.body ?? stringField(data, 'text') ?? '';
  if (!text) {
    return { ok: false, error: 'empty body', retry: false };
  }

  const result = await sendWhatsAppText({
    phoneNumber,
    text,
    session: stringField(data, 'session') ?? undefined,
  });
  if (result.ok) {
    return { ok: true };
  }

  // 408/409/429 → session needs restart or rate limited → retry.
  // Other 4xx → permanent (bad phone, etc).
  const retry =
    result.status === 0 ||
    result.status >= 500 ||
    result.status === 408 ||
    result.status === 409 ||
    result.status === 429;
  return { ok: false, error: `whatsapp ${result.status}: ${result.body}`.slice(0, 400), retry };
};

export const pushSender: OutboxSender = async (row) => {
  if (!row.user_id) {
    return { ok: true, skip: true, reason: 'no user_id' };
  }
  const data = dataOf(row);
  const result = await sendPushToUser(row.user_id, {
    title: row.title ?? 'Noon',
    body: row.body ?? '',
    url: stringField(data, 'url') ?? undefined,
    icon: stringField(data, 'icon') ?? undefined,
    tag: stringField(data, 'tag') ?? undefined,
  });

  if (result.subscriptions === 0) {
    return { ok: true, skip: true, reason: 'no push subscriptions' };
  }
  if (result.delivered === 0) {
    return { ok: false, error: 'all push endpoints failed', retry: true };
  }
  return { ok: true };
};

export const inAppSender: OutboxSender = async (row) => {
  if (!row.user_id) {
    return { ok: true, skip: true, reason: 'no user_id' };
  }
  const data = dataOf(row);
  const notifData = ((): Record<string, unknown> | undefined => {
    const raw = data['notificationData'];
    if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
    return undefined;
  })();

  await createNotification({
    recipientUserId: row.user_id,
    type: row.template_key ?? 'GENERIC',
    title: row.title ?? 'Noon',
    message: row.body ?? '',
    data: notifData,
  });
  return { ok: true };
};

export function getSenderForChannel(channel: NotificationChannel): OutboxSender {
  switch (channel) {
    case 'EMAIL':
      return emailSender;
    case 'WHATSAPP':
      return whatsappSender;
    case 'PUSH':
      return pushSender;
    case 'IN_APP':
      return inAppSender;
    default: {
      const exhaustive: never = channel;
      throw new Error(`Unknown channel: ${String(exhaustive)}`);
    }
  }
}

// Register all dispatchers with the outbox so `scheduleOutboxDrain()` can
// resolve them without a circular import.
registerDispatchers({
  EMAIL: emailSender,
  WHATSAPP: whatsappSender,
  PUSH: pushSender,
  IN_APP: inAppSender,
});
