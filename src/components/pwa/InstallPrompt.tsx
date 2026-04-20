"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "noon:pwa-install:dismissed-at";
const DISMISS_TTL_DAYS = 14;

/**
 * Shows a polished "Add to Home Screen" prompt:
 *   • Android/Chrome: hooks `beforeinstallprompt` and triggers native flow.
 *   • iOS Safari: shows an instructional tooltip (Safari doesn't fire the event).
 *   • Respects user dismissal for 14 days via localStorage.
 *   • Hides when already installed (display-mode: standalone / navigator.standalone).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [isAr, setIsAr] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsAr(document.documentElement.lang === "ar");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed? Never show the prompt.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Respect recent dismissal.
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (
        dismissedAt &&
        Date.now() - dismissedAt < DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000
      ) {
        return;
      }
    } catch {
      // ignore storage errors
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setIosVisible(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS detection (Safari only, not Chrome iOS which uses "CriOS").
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (isIOS) {
      // Show iOS hint after a short delay to avoid fighting first paint.
      const timer = window.setTimeout(() => setIosVisible(true), 4500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
        window.clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") dismiss();
      setDeferred(null);
    } catch {
      setDeferred(null);
    }
  };

  if (hidden) return null;
  const showNative = Boolean(deferred);
  const showIOS = !deferred && iosVisible;
  if (!showNative && !showIOS) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isAr ? "تثبيت تطبيق نون" : "Install Noon"}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 sm:bottom-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xl ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192x192.png"
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-md"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {isAr ? "ثبّت تطبيق نون" : "Install Noon"}
          </p>
          {showNative ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {isAr
                ? "أضف نون إلى الشاشة الرئيسية للوصول السريع وعمل دون اتصال."
                : "Add Noon to your home screen for faster access and offline support."}
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {isAr ? (
                <>
                  اضغط زر <span className="font-semibold text-zinc-800 dark:text-zinc-200">المشاركة</span>
                  {" "}ثم اختر{" "}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    «إضافة إلى الشاشة الرئيسية»
                  </span>
                  .
                </>
              ) : (
                <>
                  Tap the <span className="font-semibold text-zinc-800 dark:text-zinc-200">Share</span>{" "}
                  button, then choose{" "}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Add to Home Screen</span>.
                </>
              )}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            {showNative && (
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-coral-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
              >
                {isAr ? "تثبيت" : "Install"}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              {isAr ? "ليس الآن" : "Not now"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
