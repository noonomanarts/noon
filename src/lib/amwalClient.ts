export type AmwalClientCheckout = {
  scriptUrl: string;
  config: Record<string, unknown>;
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
