'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import type { Locale } from '@/lib/locale';
import type { WhatsAppFloatingButtonSettings } from '@/lib/adminSettings';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'noon:pwa-install:dismissed-at';
const DISMISS_TTL_DAYS = 14;

function sanitizeNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isPublicPath(pathname: string | null): boolean {
  const raw = pathname ?? '';
  const normalized = raw.replace(/^\/(en|ar)(?=\/|$)/, '');
  return !normalized.startsWith('/account');
}

/**
 * Floating install button for the Noon PWA.
 * Positioned just above the WhatsApp floating button on the same side.
 *
 *   • Android/Chrome: triggers the native `beforeinstallprompt` flow.
 *   • iOS Safari: shows a small tooltip with "Share → Add to Home Screen".
 *   • Hides when already installed or when the user recently dismissed.
 */
export default function FloatingInstallButton({
  locale,
  whatsapp,
}: {
  locale: Locale;
  whatsapp: WhatsAppFloatingButtonSettings;
}) {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Detect install state + listen for events.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (
        dismissedAt &&
        Date.now() - dismissedAt < DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000
      ) {
        setHidden(true);
      }
    } catch {
      // ignore
    }

    const ua = navigator.userAgent || '';
    const iOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    setIsIOS(iOS);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
      setTooltipOpen(false);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Close iOS tooltip when clicking outside.
  useEffect(() => {
    if (!tooltipOpen) return;
    const onDocClick = (event: Event) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [tooltipOpen]);

  if (installed || hidden) return null;
  if (!isPublicPath(pathname)) return null;

  // Only show when we either have a deferred prompt (Android/Chrome/Edge)
  // or we detected iOS Safari (where we show manual instructions).
  const canInstall = Boolean(deferred) || isIOS;
  if (!canInstall) return null;

  const showWA = whatsapp.enabled && (whatsapp.showOnMobile || whatsapp.showOnDesktop);
  const waSize = sanitizeNumber(whatsapp.buttonSizePx, 40, 48, 46);
  const waBottom = Math.min(132, sanitizeNumber(whatsapp.bottomOffsetPx, 0, 120, 20) + 24);
  const waSide = sanitizeNumber(whatsapp.sideOffsetPx, 0, 80, 16);
  const waPosition = locale === 'ar' ? 'left' : 'right';

  // Stack above WA button. If WA is disabled, use its side/bottom defaults.
  const gap = 8;
  const bottomPx = showWA ? waBottom + waSize + gap : 60;
  const sidePx = waSide;
  const position = showWA ? waPosition : locale === 'ar' ? 'left' : 'right';

  const visibilityClass =
    whatsapp.showOnMobile && whatsapp.showOnDesktop
      ? 'inline-flex'
      : whatsapp.showOnDesktop
        ? 'hidden sm:inline-flex'
        : whatsapp.showOnMobile
          ? 'inline-flex sm:hidden'
          : 'inline-flex';

  const isAr = locale === 'ar';
  const labelInstall = isAr ? 'ثبّت تطبيق نون' : 'Install Noon app';

  const handleClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'dismissed') {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      } finally {
        setDeferred(null);
      }
      return;
    }
    if (isIOS) {
      setTooltipOpen((open) => !open);
    }
  };

  const tooltipSideClass = position === 'left' ? 'left-0' : 'right-0';
  const tooltipArrowClass =
    position === 'left'
      ? 'left-5 -bottom-1.5 border-l border-b'
      : 'right-5 -bottom-1.5 border-r border-b';

  return (
    <div
      ref={wrapperRef}
      className="fixed z-40"
      style={{
        bottom: bottomPx,
        left: position === 'left' ? sidePx : undefined,
        right: position === 'right' ? sidePx : undefined,
      }}
    >
      {isIOS && tooltipOpen ? (
        <div
          role="tooltip"
          dir={isAr ? 'rtl' : 'ltr'}
          className={`pointer-events-auto absolute ${tooltipSideClass} bottom-[calc(100%+10px)] w-[260px] rounded-none border border-zinc-200 bg-white p-3.5 text-start shadow-xl ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/5`}
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{labelInstall}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {isAr ? (
              <>
                اضغط زر <span className="font-semibold text-zinc-800 dark:text-zinc-200">المشاركة</span>
                {' '}ثم اختر{' '}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">«إضافة إلى الشاشة الرئيسية»</span>.
              </>
            ) : (
              <>
                Tap the <span className="font-semibold text-zinc-800 dark:text-zinc-200">Share</span> button, then
                choose <span className="font-semibold text-zinc-800 dark:text-zinc-200">Add to Home Screen</span>.
              </>
            )}
          </p>
          <span
            aria-hidden
            className={`absolute ${tooltipArrowClass} size-3 rotate-45 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900`}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        aria-label={labelInstall}
        title={labelInstall}
        className={`${visibilityClass} group relative items-center justify-center rounded-none border border-white/35 bg-coral text-white shadow-[0_14px_28px_-16px_rgba(0,0,0,0.75)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral/40`}
        style={{ width: waSize, height: waSize }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-ping rounded-none bg-coral opacity-20"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="relative z-10 drop-shadow-sm"
          style={{ width: waSize * 0.48, height: waSize * 0.48 }}
        >
          {/* Phone outline */}
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <line x1="10" y1="19" x2="14" y2="19" />
          {/* Download arrow inside screen */}
          <path d="M12 7.5v5.5" />
          <path d="m9.5 10.5 2.5 2.5 2.5-2.5" />
        </svg>
      </button>
    </div>
  );
}
