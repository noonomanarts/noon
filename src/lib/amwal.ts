import { createHash } from 'crypto';

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
  RequestSource: string;
  ReturnUrl: string;
  CancelUrl: string;
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
  const format = (process.env.AMWAL_REQUEST_DATETIME_FORMAT || 'compact').trim().toLowerCase();

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

function getSecureHashFieldValue(config: Omit<AmwalSmartBoxConfig, 'SecureHash'>, field: string): string {
  switch (field.trim()) {
    case 'MID':
      return config.MID;
    case 'TID':
      return config.TID;
    case 'Currency':
    case 'CurrencyId':
      return String(config.CurrencyId);
    case 'Amount':
    case 'AmountTrxn':
      return config.AmountTrxn;
    case 'MerchantReference':
      return config.MerchantReference;
    case 'RequestDateTime':
    case 'TrxDateTime':
      return config.TrxDateTime;
    case 'LanguageId':
      return config.LanguageId;
    default:
      return '';
  }
}

function buildOutgoingSecureHash(config: Omit<AmwalSmartBoxConfig, 'SecureHash'>): string {
  const secret = getOptionalEnv('AMWAL_SECURE_HASH_SECRET');
  if (secret) {
    const configuredFields = (process.env.AMWAL_SECURE_HASH_FIELDS || 'MID,TID,Amount,MerchantReference,RequestDateTime,Currency')
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    const raw = [
      ...configuredFields.map((field) => getSecureHashFieldValue(config, field)),
      secret,
    ].join('');

    return createHash('sha256').update(raw, 'utf8').digest('hex').toUpperCase();
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
  returnUrl: string;
  cancelUrl?: string;
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
    RequestSource: (process.env.AMWAL_REQUEST_SOURCE || '1').trim(),
    ReturnUrl: input.returnUrl,
    CancelUrl: input.cancelUrl || input.returnUrl,
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
  return {
    merchantReference: getString(payload, 'MerchantReference', 'merchantReference', 'reference'),
    systemReference: getString(payload, 'SystemReference', 'systemReference', 'TransactionId', 'transactionId'),
    responseCode: getString(payload, 'ResponseCode', 'responseCode', 'statusCode'),
    message: getString(payload, 'Message', 'message', 'statusMessage'),
    secureHash: getString(payload, 'SecureHash', 'secureHash', 'secureHashValue'),
    authorizationDateTime: getString(payload, 'AuthorizationDateTime', 'authorizationDateTime'),
    dateTimeLocalTrxn: getString(payload, 'DateTimeLocalTrxn', 'dateTimeLocalTrxn', 'transactionDateTime'),
    amount: getNumber(payload, 'Amount', 'amount'),
    currencyId: getNumber(payload, 'CurrencyId', 'currencyId'),
    paidThrough: getString(payload, 'PaidThrough', 'paidThrough'),
    raw: payload,
  };
}

export function mapAmwalTransactionToPaymentStatus(snapshot: AmwalTransactionSnapshot): 'PAID' | 'CANCELLED' | 'FAILED' | 'PENDING' {
  const responseCode = snapshot.responseCode?.toUpperCase() ?? null;
  const message = snapshot.message?.toLowerCase() ?? '';

  if (responseCode === '00') {
    return 'PAID';
  }

  if (message.includes('cancel')) {
    return 'CANCELLED';
  }

  if (responseCode && responseCode !== '00') {
    return 'FAILED';
  }

  if (message.includes('success') || message.includes('approved') || message.includes('paid')) {
    return 'PAID';
  }

  return 'PENDING';
}

export function isExpectedAmwalMerchant(payload: Record<string, unknown>): boolean {
  const merchantId = getString(payload, 'MerchantId', 'merchantId');
  const terminalId = getString(payload, 'TerminalId', 'terminalId');

  return merchantId === getRequiredEnv('AMWAL_MERCHANT_ID') && terminalId === getRequiredEnv('AMWAL_TERMINAL_ID');
}

export function getAmwalCallbackEmailFallback(): string {
  return getOptionalEnv('AMWAL_FALLBACK_EMAIL') || 'payments@noonomanarts.com';
}
