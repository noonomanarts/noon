import { createHmac } from 'crypto';

type BillingContact = {
  fullName: string;
  email: string;
  phoneNumber: string;
};

type AmwalEnvironment = 'UAT' | 'SIT' | 'PRODUCTION';

type AmwalOrderItem = {
  Name: string;
  DescriptionOne: string;
  DescriptionTwo: string;
  Price: string;
};

export type AmwalSmartBoxConfig = {
  MID: string;
  TID: string;
  CurrencyId: number;
  AmountTrxn: string;
  MerchantReference: string;
  LanguageId: 'en' | 'ar';
  PaymentViewType: 1 | 2;
  TrxDateTime: string;
  SessionToken: string;
  ContactInfoType: 1 | 2 | 3 | 4;
  OrderItems: AmwalOrderItem[];
  SecureHash: string;
};

export type AmwalPreparedPayment = {
  gateway: 'AMWAL';
  merchantReference: string;
  scriptUrl: string;
  config: AmwalSmartBoxConfig;
  metadata: {
    amwal: {
      merchantReference: string;
      trxDateTime: string;
      amount: number;
      currency: string;
      environment: AmwalEnvironment;
    };
  };
};

export type AmwalTransactionSnapshot = {
  merchantReference: string | null;
  systemReference: string | null;
  responseCode: string | null;
  statusText: string | null;
  message: string | null;
  secureHash: string | null;
  authorizationDateTime: string | null;
  dateTimeLocalTrxn: string | null;
  amount: number | null;
  currencyId: number | null;
  paidThrough: string | null;
  raw: Record<string, unknown>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getAmwalEnvironment(): AmwalEnvironment {
  const value = (process.env.AMWAL_ENV || 'UAT').trim().toUpperCase();
  if (value === 'SIT' || value === 'PRODUCTION' || value === 'UAT') {
    return value;
  }

  throw new Error('AMWAL_ENV must be one of UAT, SIT, or PRODUCTION');
}

export function getAmwalSmartBoxScriptUrl(): string {
  const override = getOptionalEnv('AMWAL_SMARTBOX_SCRIPT_URL');
  if (override) {
    return override;
  }

  switch (getAmwalEnvironment()) {
    case 'PRODUCTION':
      return 'https://checkout.amwalpg.com/js/SmartBox.js?v=1.1';
    case 'SIT':
      return 'https://test.amwalpg.com:19443/js/SmartBox.js?v=1.1';
    case 'UAT':
    default:
      return 'https://test.amwalpg.com:7443/js/SmartBox.js?v=1.1';
  }
}

function getLanguageId(locale: string): 'en' | 'ar' {
  return locale === 'ar' ? 'ar' : 'en';
}

function getPaymentViewType(): 1 | 2 {
  return String(process.env.AMWAL_PAYMENT_VIEW_TYPE || '1').trim() === '2' ? 2 : 1;
}

function getContactInfoType(): 1 | 2 | 3 | 4 {
  const value = Number(process.env.AMWAL_CONTACT_INFO_TYPE || '1');
  return value === 2 || value === 3 || value === 4 ? value : 1;
}

function formatOmrAmount(amount: number): string {
  return amount.toFixed(3);
}

function formatOmrPrice(amount: number): string {
  return `OMR ${formatOmrAmount(amount)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatAmwalTransactionDate(value = new Date()): string {
  const format = (process.env.AMWAL_REQUEST_DATETIME_FORMAT || 'iso').trim().toLowerCase();

  if (format === 'iso') {
    return value.toISOString();
  }

  if (format === 'legacy') {
    return [
      value.getFullYear(),
      '-',
      pad(value.getMonth() + 1),
      '-',
      pad(value.getDate()),
      ' ',
      pad(value.getHours()),
      ':',
      pad(value.getMinutes()),
      ':',
      pad(value.getSeconds()),
    ].join('');
  }

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds()),
  ].join('');
}

function normalizeHash(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

function buildRequestHashPayload(config: Omit<AmwalSmartBoxConfig, 'SecureHash'>): Record<string, string> {
  return {
    Amount: config.AmountTrxn,
    CurrencyId: String(config.CurrencyId),
    MerchantId: config.MID,
    MerchantReference: config.MerchantReference,
    RequestDateTime: config.TrxDateTime,
    SessionToken: config.SessionToken,
    TerminalId: config.TID,
  };
}

function buildSortedHashDataString(payload: Record<string, string>): string {
  return Object.keys(payload)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key}=${payload[key] ?? ''}`)
    .join('&');
}

function buildHmacSha256Hex(data: string, hexKey: string): string {
  return createHmac('sha256', Buffer.from(normalizeHash(hexKey), 'hex'))
    .update(data, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function buildOutgoingSecureHash(config: Omit<AmwalSmartBoxConfig, 'SecureHash'>): string {
  const secret = getOptionalEnv('AMWAL_SECURE_HASH_SECRET');
  if (secret) {
    const payload = buildRequestHashPayload(config);
    const raw = buildSortedHashDataString(payload);

    return buildHmacSha256Hex(raw, secret);
  }

  const staticHash = getOptionalEnv('AMWAL_SECURE_HASH');
  if (staticHash) {
    return normalizeHash(staticHash);
  }

  throw new Error('AMWAL_SECURE_HASH_SECRET or AMWAL_SECURE_HASH is not configured');
}

function buildOrderItems(input: {
  amount: number;
  reference: string;
  purpose: 'WALLET_TOPUP' | 'EVENT_BOOKING';
  bookingNumber?: string;
}): AmwalOrderItem[] {
  if (input.purpose === 'WALLET_TOPUP') {
    return [
      {
        Name: 'Wallet Top Up',
        DescriptionOne: `Reference: ${input.reference}`,
        DescriptionTwo: 'Quantity: 1',
        Price: formatOmrPrice(input.amount),
      },
    ];
  }

  return [
    {
      Name: 'Event Booking Payment',
      DescriptionOne: `Booking: ${input.bookingNumber || input.reference}`,
      DescriptionTwo: 'Quantity: 1',
      Price: formatOmrPrice(input.amount),
    },
  ];
}

function getCurrencyId(currency: string): number {
  if (currency.toUpperCase() !== 'OMR') {
    throw new Error('AMWAL only supports OMR for this integration');
  }

  return 512;
}

function sanitizeReference(reference: string): string {
  return reference.trim().slice(0, 120);
}

export function prepareAmwalPayment(input: {
  amount: number;
  currency: string;
  reference: string;
  locale: string;
  purpose: 'WALLET_TOPUP' | 'EVENT_BOOKING';
  contact: BillingContact;
  bookingNumber?: string;
}): AmwalPreparedPayment {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const merchantReference = sanitizeReference(input.reference);
  const configBase: Omit<AmwalSmartBoxConfig, 'SecureHash'> = {
    MID: getRequiredEnv('AMWAL_MERCHANT_ID'),
    TID: getRequiredEnv('AMWAL_TERMINAL_ID'),
    CurrencyId: getCurrencyId(input.currency),
    AmountTrxn: formatOmrAmount(input.amount),
    MerchantReference: merchantReference,
    LanguageId: getLanguageId(input.locale),
    PaymentViewType: getPaymentViewType(),
    TrxDateTime: formatAmwalTransactionDate(),
    SessionToken: '',
    ContactInfoType: getContactInfoType(),
    OrderItems: buildOrderItems({
      amount: input.amount,
      reference: merchantReference,
      purpose: input.purpose,
      bookingNumber: input.bookingNumber,
    }),
  };

  const config: AmwalSmartBoxConfig = {
    ...configBase,
    SecureHash: buildOutgoingSecureHash(configBase),
  };

  return {
    gateway: 'AMWAL',
    merchantReference,
    scriptUrl: getAmwalSmartBoxScriptUrl(),
    config,
    metadata: {
      amwal: {
        merchantReference,
        trxDateTime: config.TrxDateTime,
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        environment: getAmwalEnvironment(),
      },
    },
  };
}

function getString(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getRecord(source: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function getPayloadLevels(payload: Record<string, unknown>): Record<string, unknown>[] {
  const levels: Record<string, unknown>[] = [payload];
  const queue: Record<string, unknown>[] = [payload];
  const seen = new Set<Record<string, unknown>>([payload]);

  while (queue.length > 0 && levels.length < 6) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const key of ['data', 'Data', 'payload', 'Payload', 'result', 'Result']) {
      const nested = getRecord(current, key);
      if (nested && !seen.has(nested)) {
        seen.add(nested);
        levels.push(nested);
        queue.push(nested);
      }
    }
  }

  return levels;
}

function getStringFromLevels(levels: Record<string, unknown>[], ...keys: string[]): string | null {
  for (const level of levels) {
    const value = getString(level, ...keys);
    if (value) {
      return value;
    }
  }

  return null;
}

function getNumberFromLevels(levels: Record<string, unknown>[], ...keys: string[]): number | null {
  for (const level of levels) {
    const value = getNumber(level, ...keys);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getErrorListMessageFromLevels(levels: Record<string, unknown>[]): string | null {
  for (const level of levels) {
    const value = getErrorListMessage(level);
    if (value) {
      return value;
    }
  }

  return null;
}

function getErrorListMessage(source: Record<string, unknown>): string | null {
  const value = source.errorList;
  if (!Array.isArray(value)) {
    return null;
  }

  const parts = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return parts.length > 0 ? parts.join(' ') : null;
}

function getNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function parseAmwalTransactionPayload(payload: Record<string, unknown>): AmwalTransactionSnapshot {
  const levels = getPayloadLevels(payload);

  return {
    merchantReference: getStringFromLevels(levels, 'MerchantReference', 'merchantReference', 'reference'),
    systemReference: getStringFromLevels(levels, 'SystemReference', 'systemReference', 'TransactionId', 'transactionId', 'paymentReference'),
    responseCode: getStringFromLevels(levels, 'ResponseCode', 'responseCode', 'statusCode', 'code', 'ErrorCode', 'errorCode', 'ResultCode'),
    statusText: getStringFromLevels(levels, 'paymentStatus', 'PaymentStatus', 'transactionStatus', 'TransactionStatus', 'status', 'Status', 'result', 'Result'),
    message: getStringFromLevels(levels, 'Message', 'message', 'statusMessage', 'details', 'description', 'statusDescription') || getErrorListMessageFromLevels(levels),
    secureHash: getStringFromLevels(levels, 'SecureHash', 'secureHash', 'secureHashValue'),
    authorizationDateTime: getStringFromLevels(levels, 'AuthorizationDateTime', 'authorizationDateTime', 'paidAt'),
    dateTimeLocalTrxn: getStringFromLevels(levels, 'DateTimeLocalTrxn', 'dateTimeLocalTrxn', 'transactionDateTime'),
    amount: getNumberFromLevels(levels, 'Amount', 'amount'),
    currencyId: getNumberFromLevels(levels, 'CurrencyId', 'currencyId'),
    paidThrough: getStringFromLevels(levels, 'PaidThrough', 'paidThrough', 'paymentMethod'),
    raw: payload,
  };
}

export function mapAmwalTransactionToPaymentStatus(snapshot: AmwalTransactionSnapshot): 'PAID' | 'CANCELLED' | 'FAILED' | 'PENDING' {
  const responseCode = snapshot.responseCode?.toUpperCase() ?? null;
  const statusText = snapshot.statusText?.toLowerCase() ?? '';
  const message = snapshot.message?.toLowerCase() ?? '';
  const combinedText = `${statusText} ${message}`.trim();

  if (responseCode === '00' || responseCode === '0' || responseCode === '000') {
    return 'PAID';
  }

  if (responseCode === 'CANCELLED' || responseCode === 'CANCELED') {
    return 'CANCELLED';
  }

  if (combinedText.includes('cancel')) {
    return 'CANCELLED';
  }

  if (
    combinedText.includes('success') ||
    combinedText.includes('approved') ||
    combinedText.includes('authorised') ||
    combinedText.includes('authorized') ||
    combinedText.includes('paid') ||
    combinedText.includes('completed')
  ) {
    return 'PAID';
  }

  if (
    responseCode === 'PENDING' ||
    responseCode === 'PROCESSING' ||
    responseCode === 'IN_PROGRESS' ||
    combinedText.includes('pending') ||
    combinedText.includes('processing') ||
    combinedText.includes('in progress')
  ) {
    return 'PENDING';
  }

  if (responseCode && responseCode !== '00') {
    return 'FAILED';
  }

  if (
    combinedText.includes('fail') ||
    combinedText.includes('error') ||
    combinedText.includes('unauthor') ||
    combinedText.includes('declin') ||
    combinedText.includes('reject') ||
    combinedText.includes('invalid') ||
    combinedText.includes('denied')
  ) {
    return 'FAILED';
  }

  return 'PENDING';
}

export function isExpectedAmwalMerchant(payload: Record<string, unknown>): boolean {
  const levels = getPayloadLevels(payload);
  const merchantId = getStringFromLevels(levels, 'MerchantId', 'merchantId');
  const terminalId = getStringFromLevels(levels, 'TerminalId', 'terminalId');

  return merchantId === getRequiredEnv('AMWAL_MERCHANT_ID') && terminalId === getRequiredEnv('AMWAL_TERMINAL_ID');
}

export function getAmwalCallbackEmailFallback(): string {
  return getOptionalEnv('AMWAL_FALLBACK_EMAIL') || 'payments@noonomanarts.com';
}
