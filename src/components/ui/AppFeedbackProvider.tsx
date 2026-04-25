'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

type ToastTone = 'success' | 'error' | 'info';
type ConfirmTone = 'default' | 'danger';

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ToastRecord = ToastInput & {
  id: number;
  tone: ToastTone;
  durationMs: number;
};

type ConfirmState = ConfirmOptions & {
  isOpen: boolean;
};

type AppFeedbackContextValue = {
  toast: (input: ToastInput | string) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | null>(null);

const DEFAULT_CONFIRM: Omit<ConfirmOptions, 'message'> = {
  title: 'Please confirm',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'default',
};

const DEFAULT_TOAST_DURATION = 3600;

function normalizeToast(input: ToastInput | string): ToastRecord {
  if (typeof input === 'string') {
    return {
      id: Date.now() + Math.random(),
      message: input,
      tone: 'info',
      durationMs: DEFAULT_TOAST_DURATION,
    };
  }

  return {
    id: Date.now() + Math.random(),
    title: input.title,
    message: input.message,
    tone: input.tone ?? 'info',
    durationMs: input.durationMs ?? DEFAULT_TOAST_DURATION,
  };
}

function normalizeConfirm(input: ConfirmOptions | string): ConfirmOptions {
  if (typeof input === 'string') {
    return { ...DEFAULT_CONFIRM, message: input };
  }

  return {
    ...DEFAULT_CONFIRM,
    ...input,
  };
}

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput | string) => {
    const nextToast = normalizeToast(input);
    setToasts((current) => [...current, nextToast]);
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmState(null);
    resolver?.(result);
  }, []);

  const confirm = useCallback((input: ConfirmOptions | string) => {
    const options = normalizeConfirm(input);
    setConfirmState({ ...options, isOpen: true });
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toastItem) =>
      window.setTimeout(() => {
        dismissToast(toastItem.id);
      }, toastItem.durationMs)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  useEffect(() => {
    if (!confirmState?.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeConfirm, confirmState]);

  const contextValue = useMemo<AppFeedbackContextValue>(
    () => ({ toast, confirm }),
    [confirm, toast]
  );

  return (
    <AppFeedbackContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[220] flex justify-end p-4 sm:p-6">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toastItem) => {
            const toneClasses =
              toastItem.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-100'
                : toastItem.tone === 'error'
                  ? 'border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-100'
                  : 'border-zinc-200 bg-white/95 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100';

            return (
              <div
                key={toastItem.id}
                className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur ${toneClasses}`}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <div className="mt-0.5 shrink-0">
                    {toastItem.tone === 'success' ? (
                      <FiCheckCircle className="size-5" />
                    ) : toastItem.tone === 'error' ? (
                      <FiAlertTriangle className="size-5" />
                    ) : (
                      <FiInfo className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {toastItem.title ? <p className="text-sm font-semibold">{toastItem.title}</p> : null}
                    <p className="text-sm leading-6 opacity-90">{toastItem.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toastItem.id)}
                    className="rounded-full p-1 text-current/70 transition hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
                    aria-label="Dismiss notification"
                  >
                    <FiX className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmState?.isOpen ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{confirmState.title}</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">{confirmState.message}</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                  confirmState.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) {
    throw new Error('useAppFeedback must be used inside AppFeedbackProvider');
  }
  return context;
}