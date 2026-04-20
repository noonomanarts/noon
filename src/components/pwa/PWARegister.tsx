"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Registers the Noon service worker and handles the update lifecycle.
 *
 * Flow:
 *   1. Register `/sw.js` on window load (idle-safe).
 *   2. Watch for an installing worker; when it becomes `installed` while a
 *      controller exists, surface an "Update available" toast.
 *   3. User clicks "Update" → post SKIP_WAITING → reload once the new SW
 *      takes control (controllerchange).
 *
 * In development, this component is a no-op to avoid stale caches while editing.
 */
export default function PWARegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isAr, setIsAr] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsAr(document.documentElement.lang === "ar");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        // Already-waiting worker (user opened a new tab while update was pending).
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingRef.current = registration.waiting;
          setUpdateAvailable(true);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              waitingRef.current = installing;
              setUpdateAvailable(true);
            }
          });
        });

        // Reload exactly once when the new worker takes control.
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloadedRef.current) return;
          reloadedRef.current = true;
          window.location.reload();
        });

        // Proactive update check when tab regains focus (hourly safety net).
        const checkForUpdate = () => {
          registration.update().catch(() => undefined);
        };
        window.addEventListener("focus", checkForUpdate);
        const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);

        return () => {
          window.removeEventListener("focus", checkForUpdate);
          window.clearInterval(interval);
        };
      } catch {
        // Silent failure — PWA is an enhancement.
      }
    };

    const onReady = () => {
      void register();
    };

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onReady);
    };
  }, []);

  const applyUpdate = () => {
    const worker = waitingRef.current;
    if (!worker) {
      window.location.reload();
      return;
    }
    try {
      worker.postMessage({ type: "SKIP_WAITING" });
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 sm:bottom-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 pl-4 shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/5 sm:p-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {isAr ? "تحديث جديد متاح" : "Update available"}
          </p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {isAr
              ? "أعد التحميل للحصول على أحدث إصدار."
              : "Reload to get the latest version."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          className="hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 sm:inline-flex"
        >
          {isAr ? "لاحقاً" : "Later"}
        </button>
        <button
          type="button"
          onClick={applyUpdate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-coral-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
        >
          {isAr ? "تحديث" : "Update"}
        </button>
      </div>
    </div>
  );
}
