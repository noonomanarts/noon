'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiBell, FiCheck, FiSettings } from 'react-icons/fi';
import Link from 'next/link';
import type { Locale } from '@/lib/locale';
import { formatNotificationContent } from '@/lib/notifications/formatNotification';
import type { UserRole } from '@/lib/db/types';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
};

interface AdminNotificationCenterProps {
  locale: Locale;
  userRole?: UserRole;
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

type NotificationPreferences = {
  soundEnabled: boolean;
  newOrderSoundEnabled: boolean;
  importantSoundEnabled: boolean;
  vibrateEnabled: boolean;
  badgeEnabled: boolean;
  pollingIntervalSeconds: number;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  newOrderSoundEnabled: true,
  importantSoundEnabled: true,
  vibrateEnabled: true,
  badgeEnabled: true,
  pollingIntervalSeconds: 20,
};

const NOTIFICATION_PREFS_API = '/api/notifications/preferences';

function isImportantNotification(item: NotificationItem): boolean {
  const haystack = `${item.type} ${item.title} ${item.message}`.toUpperCase();
  return /ORDER|BOOKING|PAYMENT|ALERT|URGENT|CANCEL|PENDING|RESTOCK|WALLET/.test(haystack);
}

function isNewOrderNotification(item: NotificationItem): boolean {
  const haystack = `${item.type} ${item.title} ${item.message}`.toUpperCase();
  return /NEW_ORDER|SHOP_ORDER|ORDER_CREATED|ORDER\s*#|WEBSITE ORDER/.test(haystack);
}

function getNotificationLevel(item: NotificationItem): 'newOrder' | 'important' | 'normal' {
  if (isNewOrderNotification(item)) return 'newOrder';
  if (isImportantNotification(item)) return 'important';
  return 'normal';
}

function playNotificationSound(kind: 'newOrder' | 'important' | 'normal' = 'normal') {
  try {
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = kind === 'newOrder' ? 'triangle' : 'sine';
    const frequency = kind === 'newOrder' ? 1140 : kind === 'important' ? 940 : 840;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(kind === 'newOrder' ? 0.11 : 0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'newOrder' ? 0.32 : 0.22));

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
    void context.resume().catch(() => undefined);
  } catch {
    // Browsers can block autoplay audio; ignore failures.
  }
}

function vibrateForNotification(kind: 'newOrder' | 'important' | 'normal') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (kind === 'newOrder') {
    navigator.vibrate([120, 50, 120]);
    return;
  }
  if (kind === 'important') {
    navigator.vibrate(120);
  }
}

export default function AdminNotificationCenter({ locale, userRole }: AdminNotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [prefsReady, setPrefsReady] = useState(false);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnceRef = useRef(false);

  const t = useMemo(() => ({
    title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
    markAllRead: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
    settings: locale === 'ar' ? 'الإعدادات' : 'Settings',
    sound: locale === 'ar' ? 'صوت التنبيه' : 'Notification sound',
    soundNewOrder: locale === 'ar' ? 'صوت الطلبات الجديدة' : 'New order sound',
    soundImportant: locale === 'ar' ? 'صوت التنبيهات المهمة' : 'Important alerts sound',
    vibrate: locale === 'ar' ? 'اهتزاز على الجوال' : 'Mobile vibration',
    badge: locale === 'ar' ? 'شارة الإشعارات' : 'Notification badge',
    polling: locale === 'ar' ? 'التحديث التلقائي' : 'Auto refresh',
    testSound: locale === 'ar' ? 'اختبار الصوت' : 'Test sound',
    sec10: locale === 'ar' ? 'كل 10 ثوان' : 'Every 10 sec',
    sec20: locale === 'ar' ? 'كل 20 ثانية' : 'Every 20 sec',
    sec30: locale === 'ar' ? 'كل 30 ثانية' : 'Every 30 sec',
    sec60: locale === 'ar' ? 'كل 60 ثانية' : 'Every 60 sec',
    sec120: locale === 'ar' ? 'كل 120 ثانية' : 'Every 120 sec',
    empty: locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications',
    viewAll: locale === 'ar' ? 'عرض الكل' : 'View all',
  }), [locale]);

  const viewAllHref =
    userRole === 'ADMIN' || userRole === 'SOCIAL_MEDIA_ADMIN'
      ? `/${locale}/admin/notifications`
      : `/${locale}/account/notifications`;

  const fetchNotifications = async (opts?: { alertOnNew?: boolean }) => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const data = await response.json();
      const nextNotifications = (data.notifications ?? []) as NotificationItem[];
      const nextUnreadCount = Number(data.unreadCount ?? 0);

      if (opts?.alertOnNew && hasFetchedOnceRef.current) {
        const newItems = nextNotifications.filter((item) => !knownNotificationIdsRef.current.has(item.id));
        const highestLevel = newItems.some((item) => getNotificationLevel(item) === 'newOrder')
          ? 'newOrder'
          : newItems.some((item) => getNotificationLevel(item) === 'important')
            ? 'important'
            : null;

        if (highestLevel && preferences.soundEnabled) {
          if (highestLevel === 'newOrder' && preferences.newOrderSoundEnabled) {
            playNotificationSound('newOrder');
          } else if (highestLevel === 'important' && preferences.importantSoundEnabled) {
            playNotificationSound('important');
          }
        }

        if (highestLevel && preferences.vibrateEnabled) {
          vibrateForNotification(highestLevel);
        }
      }

      knownNotificationIdsRef.current = new Set(nextNotifications.map((item) => item.id));
      hasFetchedOnceRef.current = true;
      setNotifications(nextNotifications);
      setUnreadCount(nextUnreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const response = await fetch(NOTIFICATION_PREFS_API, { method: 'GET', cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as Partial<NotificationPreferences>;
        if (cancelled) return;
        setPreferences({
          soundEnabled: data.soundEnabled ?? true,
          newOrderSoundEnabled: data.newOrderSoundEnabled ?? true,
          importantSoundEnabled: data.importantSoundEnabled ?? true,
          vibrateEnabled: data.vibrateEnabled ?? true,
          badgeEnabled: data.badgeEnabled ?? true,
          pollingIntervalSeconds: [10, 20, 30, 60, 120].includes(Number(data.pollingIntervalSeconds))
            ? Number(data.pollingIntervalSeconds)
            : 20,
        });
      } finally {
        if (!cancelled) setPrefsReady(true);
      }
    };

    void loadPreferences();
    void fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsReady) return;

    const timeoutId = window.setTimeout(() => {
      void fetch(NOTIFICATION_PREFS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      }).catch(() => {
        // Keep current runtime settings when save fails.
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [preferences, prefsReady]);

  useEffect(() => {
    const streamPath = userRole === 'ADMIN' ? '/api/admin/stream' : '/api/stream';
    const source = new EventSource(streamPath);

    const onNotification = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { notification?: NotificationItem };
        const incomingNotification = payload.notification;
        if (incomingNotification) {
          const level = getNotificationLevel(incomingNotification);
          if (preferences.soundEnabled && !incomingNotification.is_read) {
            if (level === 'newOrder' && preferences.newOrderSoundEnabled) {
              playNotificationSound('newOrder');
            } else if (level === 'important' && preferences.importantSoundEnabled) {
              playNotificationSound('important');
            }
          }

          if (!incomingNotification.is_read && preferences.vibrateEnabled) {
            vibrateForNotification(level);
          }

          knownNotificationIdsRef.current.add(incomingNotification.id);
          setNotifications((prev) => [incomingNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } else {
          void fetchNotifications({ alertOnNew: true });
        }
      } catch {
        void fetchNotifications({ alertOnNew: true });
      }
    };

    const onError = () => {
      // Keep the feed reliable when SSE disconnects, especially on mobile background/resume.
      void fetchNotifications({ alertOnNew: true });
    };

    source.addEventListener('notification_created', onNotification as EventListener);
    source.addEventListener('error', onError as EventListener);

    return () => {
      source.removeEventListener('notification_created', onNotification as EventListener);
      source.removeEventListener('error', onError as EventListener);
      source.close();
    };
  }, [preferences.importantSoundEnabled, preferences.newOrderSoundEnabled, preferences.soundEnabled, preferences.vibrateEnabled, userRole]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchNotifications({ alertOnNew: true });
    }, preferences.pollingIntervalSeconds * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [preferences.pollingIntervalSeconds]);

  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    if (preferences.badgeEnabled && (typeof nav.setAppBadge === 'function' || typeof nav.clearAppBadge === 'function')) {
      if (unreadCount > 0) {
        void nav.setAppBadge?.(Math.min(unreadCount, 99));
      } else {
        void nav.clearAppBadge?.();
      }
    } else if (typeof nav.clearAppBadge === 'function') {
      void nav.clearAppBadge?.();
    }

    const baseTitle = locale === 'ar' ? 'نون' : 'Noon';
    document.title = preferences.badgeEnabled && unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [locale, preferences.badgeEnabled, unreadCount]);

  const markOneRead = async (notificationId: string) => {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    });

    if (!response.ok) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    const response = await fetch('/api/notifications/read-all', { method: 'POST' });
    if (!response.ok) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label={t.title}
      >
        <FiBell className="size-5" />
        {preferences.badgeEnabled && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-5 text-white" aria-label={`${unreadCount}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-11 ${locale === 'ar' ? 'left-0' : 'right-0'} z-[170] w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 px-4 py-3 dark:border-zinc-700/60">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.title}</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowSettings((value) => !value)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:underline dark:text-zinc-300"
              >
                <FiSettings className="size-4" />
                {t.settings}
              </button>
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <FiCheck className="size-4" />
                {t.markAllRead}
              </button>
              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-600 hover:underline dark:text-zinc-300"
              >
                {t.viewAll}
              </Link>
            </div>
          </div>

          {showSettings && (
            <div className="border-b border-zinc-200/70 px-4 py-3 text-xs text-zinc-700 dark:border-zinc-700/60 dark:text-zinc-200">
              <div className="grid gap-3">
                <label className="flex items-center justify-between gap-3">
                  <span>{t.sound}</span>
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, soundEnabled: event.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>{t.soundNewOrder}</span>
                  <input
                    type="checkbox"
                    checked={preferences.newOrderSoundEnabled}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, newOrderSoundEnabled: event.target.checked }))
                    }
                    disabled={!preferences.soundEnabled}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>{t.soundImportant}</span>
                  <input
                    type="checkbox"
                    checked={preferences.importantSoundEnabled}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, importantSoundEnabled: event.target.checked }))
                    }
                    disabled={!preferences.soundEnabled}
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <span>{t.testSound}</span>
                  <button
                    type="button"
                    onClick={() => playNotificationSound('newOrder')}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {t.testSound}
                  </button>
                </div>
                <label className="flex items-center justify-between gap-3">
                  <span>{t.vibrate}</span>
                  <input
                    type="checkbox"
                    checked={preferences.vibrateEnabled}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, vibrateEnabled: event.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>{t.badge}</span>
                  <input
                    type="checkbox"
                    checked={preferences.badgeEnabled}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, badgeEnabled: event.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>{t.polling}</span>
                  <select
                    value={preferences.pollingIntervalSeconds}
                    onChange={(event) =>
                      setPreferences((prev) => ({ ...prev, pollingIntervalSeconds: Number(event.target.value) }))
                    }
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                  >
                    <option value={10}>{t.sec10}</option>
                    <option value={20}>{t.sec20}</option>
                    <option value={30}>{t.sec30}</option>
                    <option value={60}>{t.sec60}</option>
                    <option value={120}>{t.sec120}</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">{t.empty}</div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) void markOneRead(item.id);
                  }}
                  className={`w-full border-b border-zinc-100 px-4 py-3 text-start transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                    !item.is_read && getNotificationLevel(item) === 'newOrder'
                      ? 'bg-rose-50/80 dark:bg-rose-900/25'
                      : !item.is_read && getNotificationLevel(item) === 'important'
                        ? 'bg-amber-50/80 dark:bg-amber-900/25'
                        : item.is_read
                          ? ''
                          : 'bg-indigo-50/70 dark:bg-indigo-900/20'
                  }`}
                >
                  {(() => {
                    const localized = formatNotificationContent(
                      { type: item.type, title: item.title, message: item.message, data: item.data },
                      locale,
                      { compact: true }
                    );

                    return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-6 text-zinc-900 dark:text-white">
                        {localized.title}
                      </p>
                      <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                        {localized.message}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                        {new Date(item.created_at).toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                      </p>
                    </div>
                    {!item.is_read && <span className="mt-1 size-2 rounded-full bg-indigo-500" />}
                  </div>
                    );
                  })()}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
