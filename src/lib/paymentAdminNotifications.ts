import { getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { enqueueNotification } from '@/lib/notifications/outbox';
import { notifyUser } from '@/lib/notificationService';
import {
  defaultPaymentAlertSettings,
  sanitizePaymentAlertSettings,
  type PaymentAlertChannelKey,
  type PaymentAlertSettings,
  type PaymentAlertSourceKey,
} from '@/lib/paymentAlertSettings';

type PaymentAdminNotificationInput = {
  source: PaymentAlertSourceKey;
  entityId: string;
  reference: string;
  amount: number;
  currency: string;
  customerName?: string | null;
  paymentMethod?: string | null;
  adminPath?: string | null;
};

type PaymentAlertMessage = {
  title: string;
  body: string;
  html: string;
  url: string;
  tag: string;
};

const SETTINGS_KEY = 'payment-alerts';

const sourceLabels: Record<PaymentAlertSourceKey, string> = {
  classBooking: 'Class booking',
  eventBooking: 'Event booking',
  shopOrder: 'Shop order',
  walletTopup: 'Wallet top-up',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatAmount(amount: number): string {
  return Number(amount || 0).toFixed(3);
}

function buildMessage(input: PaymentAdminNotificationInput): PaymentAlertMessage {
  const sourceLabel = sourceLabels[input.source];
  const amountText = `${formatAmount(input.amount)} ${input.currency}`;
  const customerName = input.customerName?.trim() || 'A customer';
  const methodText = input.paymentMethod?.trim() ? ` via ${input.paymentMethod.trim()}` : '';
  const referenceText = `${sourceLabel} ${input.reference}`;
  const url = input.adminPath?.trim() || '/admin/payments';
  const title = `Payment received: ${referenceText}`;
  const body = `${customerName} paid ${amountText} for ${referenceText}${methodText}.`;
  const html = `<p><strong>Payment received</strong></p><p>${escapeHtml(customerName)} paid <strong>${escapeHtml(amountText)}</strong> for ${escapeHtml(referenceText)}${methodText ? ` via ${escapeHtml(input.paymentMethod ?? '')}` : ''}.</p><p>Open in dashboard: ${escapeHtml(url)}</p>`;

  return {
    title,
    body,
    html,
    url,
    tag: `payment-alert:${input.source}:${input.entityId}`,
  };
}

async function getSettings(): Promise<PaymentAlertSettings> {
  const saved = await getAdminSettingsByKey<PaymentAlertSettings>(SETTINGS_KEY);
  return sanitizePaymentAlertSettings(saved ?? defaultPaymentAlertSettings);
}

async function sendChannelNotification(input: {
  channel: PaymentAlertChannelKey;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  message: PaymentAlertMessage;
  dedupeKey: string;
}) {
  if (input.channel === 'inApp') {
    await notifyUser(input.userId, {
      type: 'payment_alert',
      title: input.message.title,
      message: input.message.body,
      data: { link: input.message.url },
    });
    return;
  }

  if (input.channel === 'email') {
    await enqueueNotification({
      channel: 'EMAIL',
      userId: input.userId,
      title: input.message.title,
      body: input.message.html,
      data: {
        to: input.email,
        subject: input.message.title,
        html: input.message.html,
        text: input.message.body,
      },
      dedupeKey: input.dedupeKey,
    });
    return;
  }

  if (input.channel === 'whatsapp') {
    await enqueueNotification({
      channel: 'WHATSAPP',
      userId: input.userId,
      title: input.message.title,
      body: input.message.body,
      data: {
        phoneNumber: input.phoneNumber,
        text: input.message.body,
      },
      dedupeKey: input.dedupeKey,
    });
    return;
  }

  await enqueueNotification({
    channel: 'PUSH',
    userId: input.userId,
    title: input.message.title,
    body: input.message.body,
    data: {
      url: input.message.url,
      tag: input.message.tag,
    },
    dedupeKey: input.dedupeKey,
  });
}

export async function sendPaymentAdminNotifications(input: PaymentAdminNotificationInput): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled || !settings.sources[input.source] || settings.recipients.length === 0) {
    return;
  }

  const message = buildMessage(input);

  await Promise.all(
    settings.recipients.map(async (recipient) => {
      const user = await getUserById(recipient.userId);
      if (!user) return;

      const channels = Object.entries(recipient.channels).filter(([, enabled]) => enabled) as Array<
        [PaymentAlertChannelKey, boolean]
      >;

      await Promise.all(
        channels.map(([channel]) =>
          sendChannelNotification({
            channel,
            userId: recipient.userId,
            email: user.email ?? null,
            phoneNumber: user.phoneNumber ?? null,
            message,
            dedupeKey: `payment-alert:${input.source}:${input.entityId}:${recipient.userId}:${channel}`,
          })
        )
      );
    })
  );
}