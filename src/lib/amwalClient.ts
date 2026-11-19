export type AmwalClientCheckout = {
  scriptUrl: string;
  config: Record<string, unknown>;
};

export type AmwalCheckoutErrorDetails = {
  message: string;
  code?: string;
};

export type AmwalCheckoutErrorPayload = {
  message: string;
  code?: string;
  source: 'smartbox-error-callback' | 'client-error';
  data?: Record<string, unknown>;
};

type AmwalErrorUiMessageOptions = {
  locale: 'en' | 'ar';
  context?: 'wallet-topup' | 'checkout-topup';
  reason?: string | null;
  code?: string | null;
  detail?: string | null;
  environment?: string | null;
};

type StartAmwalCheckoutOptions = {
  checkout: AmwalClientCheckout;
  onComplete?: (payload: Record<string, unknown>) => void | Promise<void>;
  /**
   * Called when the gateway reported completion but recording it on our side
   * failed (network drop, server error). The customer may already have been
   * charged, so this must never be reported to the server as a failed payment.
   */
  onConfirmError?: (error: Error) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onError?: (payload: Record<string, unknown> | Error) => void | Promise<void>;
};

type SmartBoxCheckoutApi = {
  configure: Record<string, unknown>;
  showSmartBox: () => void;
};

declare global {
  interface Window {
    SmartBox?: {
      Checkout?: SmartBoxCheckoutApi;
    };
  }
}

let smartBoxLoader: Promise<void> | null = null;
let loadedScriptUrl: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(source: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getRecord(source: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function getErrorListMessage(source: Record<string, unknown>): string | undefined {
  const value = source.errorList;
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parts = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function getAmwalCheckoutErrorDetails(payload: Record<string, unknown> | Error): AmwalCheckoutErrorDetails {
  if (payload instanceof Error) {
    return { message: payload.message || 'Amwal checkout failed' };
  }

  const levelOne = getRecord(payload, 'data') || payload;
  const levelTwo = getRecord(levelOne, 'data') || levelOne;

  const message = getString(
    levelTwo,
    'Message',
    'message',
    'error',
    'errorMessage',
    'ErrorMessage',
    'details'
  ) || getErrorListMessage(levelTwo) || getString(levelOne, 'message', 'Message') || 'Amwal checkout failed';
  const code = getString(levelTwo, 'ResponseCode', 'responseCode', 'code', 'errorCode', 'ErrorCode');

  return { message, code };
}

export function getAmwalCheckoutErrorPayload(payload: Record<string, unknown> | Error): AmwalCheckoutErrorPayload {
  const details = getAmwalCheckoutErrorDetails(payload);

  return {
    message: details.message,
    code: details.code,
    source: payload instanceof Error ? 'client-error' : 'smartbox-error-callback',
    data: payload instanceof Error ? undefined : payload,
  };
}

export function isGenericAmwalCheckoutFailure(reason: string | null | undefined): boolean {
  if (!reason) {
    return true;
  }

  const normalized = reason.trim().toLowerCase();
  return normalized === 'amwal checkout failed' || normalized === 'security error.' || normalized === 'security error';
}

export function buildAmwalErrorUiMessage({
  locale,
  context = 'wallet-topup',
  reason,
  code,
  detail,
  environment,
}: AmwalErrorUiMessageOptions): string {
  const fallbackMessage = locale === 'ar'
    ? 'فشلت عملية شحن المحفظة.'
    : context === 'checkout-topup'
      ? 'Wallet top-up payment failed during checkout.'
      : 'Wallet top-up payment failed.';

  const detailText = [code, reason, detail]
    .filter((value, index, array): value is string => typeof value === 'string' && value.trim().length > 0 && array.indexOf(value) === index)
    .join(' ');

  const normalizedCombined = `${reason || ''} ${detail || ''}`.toLowerCase();
  if (normalizedCombined.includes('there is no merchant related to this terminal')) {
    const environmentLabel = environment && environment.trim().length > 0 ? environment.trim() : 'the current environment';
    return locale === 'ar'
      ? `${fallbackMessage} رفضت أمـوال باي الطلب لأن رقم التاجر ورقم الجهاز غير مرتبطين ببعضهما في البيئة ${environmentLabel}. Security Error. There is no Merchant Related to This Terminal.`
      : `${fallbackMessage} Amwal rejected the request because the configured Merchant ID is not linked to the configured Terminal ID in ${environmentLabel}. Security Error. There is no Merchant Related to This Terminal.`;
  }

  if (!detailText) {
    return fallbackMessage;
  }

  return `${fallbackMessage} ${detailText}`;
}

async function loadSmartBoxScript(scriptUrl: string): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Amwal SmartBox can only run in the browser');
  }

  if (window.SmartBox?.Checkout && loadedScriptUrl === scriptUrl) {
    return;
  }

  if (!smartBoxLoader || loadedScriptUrl !== scriptUrl) {
    loadedScriptUrl = scriptUrl;
    smartBoxLoader = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[data-amwal-smartbox="${scriptUrl}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Amwal SmartBox script')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.dataset.amwalSmartbox = scriptUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Amwal SmartBox script'));
      document.body.appendChild(script);
    });
  }

  await smartBoxLoader;

  if (!window.SmartBox?.Checkout) {
    throw new Error('Amwal SmartBox is not available after script load');
  }
}

type ConfirmPaymentResult<T> = { ok: boolean; status: number; payload: T };

const CONFIRM_RETRY_DELAYS_MS = [0, 1200, 3000, 6000];

/**
 * Reports a finished gateway payment to our server, retrying on network errors
 * and 5xx responses. Mobile browsers often drop the first request right after
 * returning from the bank's 3-D Secure page; without a retry the customer is
 * charged but the payment is never recorded.
 */
export async function confirmAmwalPayment<T extends Record<string, unknown>>(
  url: string,
  body: Record<string, unknown>
): Promise<ConfirmPaymentResult<T>> {
  let lastError: unknown = null;

  for (const delay of CONFIRM_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        keepalive: true,
      });

      if (response.status >= 500) {
        lastError = new Error(`Server error ${response.status}`);
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as T;
      return { ok: response.ok, status: response.status, payload };
    } catch (error) {
      lastError = error;
    }
  }

  stashUnconfirmedPayment(url, body);
  throw lastError instanceof Error ? lastError : new Error('Failed to confirm payment');
}

const UNCONFIRMED_STORAGE_KEY = 'noon_unconfirmed_payments';
const UNCONFIRMED_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

type UnconfirmedPayment = { url: string; body: Record<string, unknown>; savedAt: number };

function readUnconfirmedPayments(): UnconfirmedPayment[] {
  try {
    const raw = window.localStorage.getItem(UNCONFIRMED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is UnconfirmedPayment =>
        isRecord(item) && typeof item.url === 'string' && isRecord(item.body) && typeof item.savedAt === 'number'
    );
  } catch {
    return [];
  }
}

function writeUnconfirmedPayments(items: UnconfirmedPayment[]): void {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(UNCONFIRMED_STORAGE_KEY);
    } else {
      window.localStorage.setItem(UNCONFIRMED_STORAGE_KEY, JSON.stringify(items.slice(-10)));
    }
  } catch {
    // storage unavailable (private mode): nothing else we can do here
  }
}

function stashUnconfirmedPayment(url: string, body: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const reference = typeof body.reference === 'string' ? body.reference : '';
  const others = readUnconfirmedPayments().filter(
    (item) => !(item.url === url && item.body.reference === reference)
  );
  writeUnconfirmedPayments([...others, { url, body, savedAt: Date.now() }]);
}

/**
 * Re-sends gateway results that could not be delivered earlier (see
 * confirmAmwalPayment). Returns how many were recorded as paid.
 */
export async function retryUnconfirmedAmwalPayments(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const pending = readUnconfirmedPayments().filter((item) => Date.now() - item.savedAt < UNCONFIRMED_MAX_AGE_MS);
  if (pending.length === 0) {
    writeUnconfirmedPayments([]);
    return 0;
  }

  const remaining: UnconfirmedPayment[] = [];
  let recovered = 0;

  for (const item of pending) {
    // Only ever post back to our own payment callbacks.
    if (!item.url.startsWith('/api/')) continue;

    try {
      const response = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
        cache: 'no-store',
      });

      if (response.status >= 500) {
        remaining.push(item);
        continue;
      }

      // Any definitive answer (recorded, already recorded, rejected, not found)
      // means there is nothing left to retry.
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (payload.topupStatus === 'PAID' || payload.paymentStatus === 'PAID') {
        recovered += 1;
      }
    } catch {
      remaining.push(item);
    }
  }

  writeUnconfirmedPayments(remaining);
  return recovered;
}

export async function startAmwalCheckout({
  checkout,
  onComplete,
  onConfirmError,
  onCancel,
  onError,
}: StartAmwalCheckoutOptions): Promise<void> {
  await loadSmartBoxScript(checkout.scriptUrl);

  const smartBoxCheckout = window.SmartBox?.Checkout;
  if (!smartBoxCheckout) {
    throw new Error('Amwal SmartBox checkout API is unavailable');
  }

  smartBoxCheckout.configure = {
    ...checkout.config,
    completeCallback: (payload: unknown) => {
      // Rejections here used to vanish as unhandled promise rejections, leaving
      // the customer on a page that showed nothing after paying.
      Promise.resolve()
        .then(() => onComplete?.(isRecord(payload) ? payload : {}))
        .catch((error: unknown) => {
          console.error('Failed to record completed Amwal payment:', error);
          const normalized = error instanceof Error ? error : new Error('Failed to confirm payment');
          return onConfirmError?.(normalized);
        })
        .catch((error: unknown) => {
          console.error('Amwal confirm-error handler failed:', error);
        });
    },
    errorCallback: (payload: unknown) => {
      Promise.resolve()
        .then(() => onError?.(isRecord(payload) ? payload : new Error('Amwal checkout failed')))
        .catch((error: unknown) => {
          console.error('Amwal error handler failed:', error);
        });
    },
    cancelCallback: () => {
      Promise.resolve()
        .then(() => onCancel?.())
        .catch((error: unknown) => {
          console.error('Amwal cancel handler failed:', error);
        });
    },
  };

  smartBoxCheckout.showSmartBox();
}
