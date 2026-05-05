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

export async function startAmwalCheckout({
  checkout,
  onComplete,
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
      void onComplete?.(isRecord(payload) ? payload : {});
    },
    errorCallback: (payload: unknown) => {
      void onError?.(isRecord(payload) ? payload : new Error('Amwal checkout failed'));
    },
    cancelCallback: () => {
      void onCancel?.();
    },
  };

  smartBoxCheckout.showSmartBox();
}
