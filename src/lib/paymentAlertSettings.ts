export type PaymentAlertSourceKey = 'classBooking' | 'eventBooking' | 'shopOrder' | 'walletTopup';

export type PaymentAlertChannelKey = 'email' | 'whatsapp' | 'push' | 'inApp';

export type PaymentAlertRecipientChannels = Record<PaymentAlertChannelKey, boolean>;

export type PaymentAlertRecipient = {
  userId: string;
  channels: PaymentAlertRecipientChannels;
};

export type PaymentAlertSettings = {
  enabled: boolean;
  sources: Record<PaymentAlertSourceKey, boolean>;
  recipients: PaymentAlertRecipient[];
};

export const defaultPaymentAlertRecipientChannels: PaymentAlertRecipientChannels = {
  email: true,
  whatsapp: false,
  push: false,
  inApp: true,
};

export const defaultPaymentAlertSettings: PaymentAlertSettings = {
  enabled: true,
  sources: {
    classBooking: true,
    eventBooking: true,
    shopOrder: true,
    walletTopup: true,
  },
  recipients: [],
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeUserId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 100) : null;
}

export function sanitizePaymentAlertSettings(
  input: Partial<PaymentAlertSettings> | null | undefined
): PaymentAlertSettings {
  const source = input ?? {};
  const rawSources: Partial<Record<PaymentAlertSourceKey, unknown>> = source.sources ?? {};
  const rawRecipients = Array.isArray(source.recipients) ? source.recipients : [];

  const recipients = rawRecipients
    .map((recipient) => {
      const userId = sanitizeUserId(recipient?.userId);
      if (!userId) return null;

      const rawChannels: Partial<Record<PaymentAlertChannelKey, unknown>> = recipient?.channels ?? {};
      const channels: PaymentAlertRecipientChannels = {
        email: asBoolean(rawChannels.email, defaultPaymentAlertRecipientChannels.email),
        whatsapp: asBoolean(rawChannels.whatsapp, defaultPaymentAlertRecipientChannels.whatsapp),
        push: asBoolean(rawChannels.push, defaultPaymentAlertRecipientChannels.push),
        inApp: asBoolean(rawChannels.inApp, defaultPaymentAlertRecipientChannels.inApp),
      };

      if (!Object.values(channels).some(Boolean)) {
        return null;
      }

      return { userId, channels };
    })
    .filter((recipient): recipient is PaymentAlertRecipient => Boolean(recipient));

  const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.userId, recipient])).values());

  return {
    enabled: asBoolean(source.enabled, defaultPaymentAlertSettings.enabled),
    sources: {
      classBooking: asBoolean(rawSources.classBooking, defaultPaymentAlertSettings.sources.classBooking),
      eventBooking: asBoolean(rawSources.eventBooking, defaultPaymentAlertSettings.sources.eventBooking),
      shopOrder: asBoolean(rawSources.shopOrder, defaultPaymentAlertSettings.sources.shopOrder),
      walletTopup: asBoolean(rawSources.walletTopup, defaultPaymentAlertSettings.sources.walletTopup),
    },
    recipients: uniqueRecipients,
  };
}