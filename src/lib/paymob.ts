import type { UserPublic } from '@/lib/db/types';
import { normalizePhoneDigits } from '@/lib/db/users';

type PaymobAuthResponse = {
  token: string;
};

type PaymobIntegration = {
  id: number;
  currency: string;
  integration_type: string;
  is_live: boolean;
};

type PaymobCreateIntentionResponse = {
  client_secret: string;
  id: string;
  intention_order_id: number;
  special_reference: string;
  payment_methods?: Array<{
    integration_id: number;
    currency: string;
    method_type: string;
    live: boolean;
  }>;
  payment_keys?: Array<{
    integration: number;
    order_id: number;
    redirection_url: string | null;
  }>;
};

type PaymobOrderResponse = {
  id: number;
  merchant_order_id: string | null;
  amount_cents: number;
  paid_amount_cents: number;
  currency: string;
  payment_status: string;
  is_canceled?: boolean;
  is_cancelled?: boolean;
};

const PAYMOB_BASE_URLS: Record<string, string> = {
  egy: 'https://accept.paymob.com/',
  uae: 'https://uae.paymob.com/',
  pak: 'https://pakistan.paymob.com/',
  ksa: 'https://ksa.paymob.com/',
  omn: 'https://oman.paymob.com/',
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function inferRegionCode(secretKey: string): string {
  const prefix = secretKey.slice(0, 3).toLowerCase();
  if (!(prefix in PAYMOB_BASE_URLS)) {
    throw new Error('Unsupported Paymob region');
  }
  return prefix;
}

function getPaymobBaseUrl(): string {
  const secretKey = getRequiredEnv('PAYMOB_SECRET_KEY');
  return PAYMOB_BASE_URLS[inferRegionCode(secretKey)];
}

function getAmountMultiplier(currency: string): number {
  return currency.toUpperCase() === 'OMR' ? 1000 : 100;
}

function amountToMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * getAmountMultiplier(currency));
}

function parseNumberList(value: string | undefined): number[] {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

async function paymobFetch<T>(path: string, init: RequestInit, authMode: 'secret' | 'bearer' | 'none' = 'secret'): Promise<T> {
  const baseUrl = getPaymobBaseUrl();
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    if (authMode === 'secret') {
      headers.set('Authorization', `Token ${getRequiredEnv('PAYMOB_SECRET_KEY')}`);
    } else if (authMode === 'bearer') {
      throw new Error('Authorization header is required for bearer Paymob requests');
    }
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    detail?: string;
    message?: string;
  };

  if (!response.ok) {
    const detail =
      typeof payload.detail === 'string'
        ? payload.detail
        : typeof payload.message === 'string'
          ? payload.message
          : `Paymob request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return payload;
}

async function authenticateMerchant(): Promise<string> {
  const response = await paymobFetch<PaymobAuthResponse>(
    'api/auth/tokens',
    {
      method: 'POST',
      body: JSON.stringify({
        api_key: getRequiredEnv('PAYMOB_API_KEY'),
      }),
    },
    'none'
  );

  if (!response.token) {
    throw new Error('Paymob merchant token is missing');
  }

  return response.token;
}

export async function getPaymobPaymentMethodIds(currency: string): Promise<number[]> {
  const directIds = parseNumberList(process.env.PAYMOB_PAYMENT_METHODS);
  if (directIds.length > 0) {
    return directIds;
  }

  const singleId = Number(process.env.PAYMOB_INTEGRATION_ID);
  if (Number.isInteger(singleId) && singleId > 0) {
    return [singleId];
  }

  const merchantToken = await authenticateMerchant();
  const response = await paymobFetch<{
    results?: PaymobIntegration[];
  }>(
    'api/ecommerce/integrations',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
      },
    },
    'bearer'
  );

  const ids = (response.results ?? [])
    .filter((integration) => integration.integration_type === 'online')
    .filter((integration) => integration.currency.toUpperCase() === currency.toUpperCase())
    .map((integration) => integration.id);

  if (ids.length === 0) {
    throw new Error(`No Paymob online integration found for ${currency}`);
  }

  return ids;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Noon',
    lastName: parts.slice(1).join(' ') || 'Customer',
  };
}

function buildBillingData(user: UserPublic) {
  const { firstName, lastName } = splitName(user.fullName || '');
  const normalizedPhone = normalizePhoneDigits(user.phoneNumber || '');

  return {
    apartment: '',
    floor: '',
    first_name: firstName,
    last_name: lastName,
    street: 'Noon Oman Arts',
    building: '',
    phone_number: normalizedPhone ? `+${normalizedPhone}` : '+96800000000',
    shipping_method: 'NA',
    city: 'Muscat',
    country: 'OMN',
    state: 'Muscat',
    email: user.email || 'paymob@noonomanarts.com',
    postal_code: '',
  };
}

export async function createPaymobWalletTopupIntention(input: {
  amount: number;
  currency: string;
  reference: string;
  user: UserPublic;
  returnUrl: string;
  locale: string;
}) {
  const paymentMethodIds = await getPaymobPaymentMethodIds(input.currency);
  const publicKey = getRequiredEnv('PAYMOB_PUBLIC_KEY');
  const response = await paymobFetch<PaymobCreateIntentionResponse>('v1/intention/', {
    method: 'POST',
    body: JSON.stringify({
      amount: amountToMinorUnits(input.amount, input.currency),
      currency: input.currency.toUpperCase(),
      payment_methods: paymentMethodIds,
      billing_data: buildBillingData(input.user),
      extras: {
        merchant_intention_id: input.reference,
        wallet_topup_reference: input.reference,
        return_url: input.returnUrl,
        locale: input.locale,
      },
      special_reference: input.reference,
    }),
  });

  if (!response.client_secret) {
    throw new Error('Paymob client secret is missing');
  }

  const checkoutUrl = new URL('unifiedcheckout/', getPaymobBaseUrl());
  checkoutUrl.searchParams.set('publicKey', publicKey);
  checkoutUrl.searchParams.set('clientSecret', response.client_secret);

  return {
    intentionId: response.id,
    orderId: response.intention_order_id,
    clientSecret: response.client_secret,
    paymentMethodIds,
    paymentUrl: checkoutUrl.toString(),
    raw: response,
  };
}

export async function getPaymobOrder(orderId: number): Promise<PaymobOrderResponse> {
  const merchantToken = await authenticateMerchant();

  return paymobFetch<PaymobOrderResponse>(
    `api/ecommerce/orders/${orderId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${merchantToken}`,
      },
    },
    'bearer'
  );
}

export function mapPaymobOrderToWalletStatus(order: PaymobOrderResponse): 'PAID' | 'CANCELLED' | 'PENDING' {
  if (String(order.payment_status).toUpperCase() === 'PAID' || Number(order.paid_amount_cents ?? 0) > 0) {
    return 'PAID';
  }

  if (order.is_canceled || order.is_cancelled) {
    return 'CANCELLED';
  }

  return 'PENDING';
}
