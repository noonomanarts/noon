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
  dndEnabled: boolean;
  dndStartHour: number;
  dndEndHour: number;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  newOrderSoundEnabled: true,
  importantSoundEnabled: true,
  vibrateEnabled: true,
  badgeEnabled: true,
  pollingIntervalSeconds: 20,
  dndEnabled: false,
  dndStartHour: 23,
  dndEndHour: 8,
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
  const [filter, setFilter] = useState<'all' | 'newOrder' | 'important'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '24h' | '7d'>('all');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [prefsReady, setPrefsReady] = useState(false);
  const [undoState, setUndoState] = useState<{ ids: string[]; count: number } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedOnceRef = useRef(false);

  const t = useMemo(() => ({
    title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
    markAllRead: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
    settings: locale === 'ar' ? 'الإعدادات' : 'Settings',
    filterAll: locale === 'ar' ? 'الكل' : 'All',
    filterNewOrders: locale === 'ar' ? 'طلبات جديدة' : 'New orders',
    filterImportant: locale === 'ar' ? 'مهم' : 'Important',
    timeAll: locale === 'ar' ? 'كل الأوقات' : 'All time',
    timeToday: locale === 'ar' ? 'اليوم' : 'Today',
    time24h: locale === 'ar' ? 'آخر 24 ساعة' : 'Last 24h',
    time7d: locale === 'ar' ? 'آخر 7 أيام' : 'Last 7d',
    unreadOnly: locale === 'ar' ? 'غير مقروء فقط' : 'Unread only',
    markFilterRead: locale === 'ar' ? 'قراءة الفلتر' : 'Mark filter read',
    undo: locale === 'ar' ? 'تراجع' : 'Undo',
    undoMessage: locale === 'ar' ? 'تم تحديد الإشعارات كمقروءة' : 'Notifications marked as read',
    sound: locale === 'ar' ? 'صوت التنبيه' : 'Notification sound',
    soundNewOrder: locale === 'ar' ? 'صوت الطلبات الجديدة' : 'New order sound',
    soundImportant: locale === 'ar' ? 'صوت التنبيهات المهمة' : 'Important alerts sound',
    vibrate: locale === 'ar' ? 'اهتزاز على الجوال' : 'Mobile vibration',
    dnd: locale === 'ar' ? 'عدم الإزعاج' : 'Do not disturb',
    dndFrom: locale === 'ar' ? 'من الساعة' : 'From hour',
    dndTo: locale === 'ar' ? 'إلى الساعة' : 'To hour',
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

  const isInsideDndWindow = () => {
    if (!preferences.dndEnabled) return false;
    const nowHour = new Date().getHours();
    const start = preferences.dndStartHour;
    const end = preferences.dndEndHour;

    if (start === end) return true;
    if (start < end) {
      return nowHour >= start && nowHour < end;
    }

    return nowHour >= start || nowHour < end;
  };

  const shouldAlertNow = () => !isInsideDndWindow();

  const filterMatches = (item: NotificationItem) => {
    if (filter === 'all') return true;
    if (filter === 'newOrder') return getNotificationLevel(item) === 'newOrder';
    return getNotificationLevel(item) === 'important';
  };

  const timeFilterMatches = (item: NotificationItem) => {
    if (timeFilter === 'all') return true;
    const createdAt = new Date(item.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;

    const now = new Date();
    if (timeFilter === 'today') {
      return (
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate()
      );
    }

    const diffMs = now.getTime() - createdAt.getTime();
    if (timeFilter === '24h') {
      return diffMs <= 24 * 60 * 60 * 1000;
    }

    return diffMs <= 7 * 24 * 60 * 60 * 1000;
  };

  const [unreadOnly, setUnreadOnly] = useState(false);

  const filteredNotifications = notifications.filter((item) => filterMatches(item) && timeFilterMatches(item));
  const visibleNotifications = unreadOnly
    ? filteredNotifications.filter((item) => !item.is_read)
    : filteredNotifications;

  const allCount = notifications.length;
  const newOrderCount = notifications.filter((item) => getNotificationLevel(item) === 'newOrder').length;
  const importantCount = notifications.filter((item) => getNotificationLevel(item) === 'important').length;
  const unreadInFilterCount = filteredNotifications.filter((item) => !item.is_read).length;

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

        if (highestLevel && preferences.soundEnabled && shouldAlertNow()) {
          if (highestLevel === 'newOrder' && preferences.newOrderSoundEnabled) {
            playNotificationSound('newOrder');
          } else if (highestLevel === 'important' && preferences.importantSoundEnabled) {
            playNotificationSound('important');
          }
        }

        if (highestLevel && preferences.vibrateEnabled && shouldAlertNow()) {
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
          dndEnabled: data.dndEnabled ?? false,
          dndStartHour:
            Number.isFinite(Number(data.dndStartHour)) && Number(data.dndStartHour) >= 0 && Number(data.dndStartHour) <= 23
              ? Number(data.dndStartHour)
              : 23,
          dndEndHour:
            Number.isFinite(Number(data.dndEndHour)) && Number(data.dndEndHour) >= 0 && Number(data.dndEndHour) <= 23
              ? Number(data.dndEndHour)
              : 8,
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
          if (preferences.soundEnabled && !incomingNotification.is_read && shouldAlertNow()) {
            if (level === 'newOrder' && preferences.newOrderSoundEnabled) {
              playNotificationSound('newOrder');
            } else if (level === 'important' && preferences.importantSoundEnabled) {
              playNotificationSound('important');
            }
          }

          if (!incomingNotification.is_read && preferences.vibrateEnabled && shouldAlertNow()) {
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
  }, [preferences.dndEnabled, preferences.dndEndHour, preferences.dndStartHour, preferences.importantSoundEnabled, preferences.newOrderSoundEnabled, preferences.soundEnabled, preferences.vibrateEnabled, userRole]);

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

  const markFilterRead = async () => {
    const targetIds = filteredNotifications.filter((item) => !item.is_read).map((item) => item.id);
    if (targetIds.length === 0) return;

    const results = await Promise.allSettled(
      targetIds.map((notificationId) =>
        fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId }),
        })
      )
    );

    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value.ok
    ).length;

    if (successCount <= 0) return;

    const successIds = new Set(
      results
        .map((result, index) =>
          result.status === 'fulfilled' && result.value.ok ? targetIds[index] : null
        )
        .filter((id): id is string => Boolean(id))
    );
    const successIdList = Array.from(successIds);
    setNotifications((prev) =>
      prev.map((item) =>
        successIds.has(item.id) ? { ...item, is_read: true } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - successCount));

    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
    }
    setUndoState({ ids: successIdList, count: successCount });
    undoTimeoutRef.current = window.setTimeout(() => {
      setUndoState(null);
    }, 9000);
  };

  const undoMarkFilterRead = async () => {
    if (!undoState || undoState.ids.length === 0) return;

    const ids = undoState.ids;
    setUndoState(null);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const results = await Promise.allSettled(
      ids.map((notificationId) =>
        fetch('/api/notifications/read-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId, isRead: false }),
        })
      )
    );

    const restoredIds = new Set(
      results
        .map((result, index) =>
          result.status === 'fulfilled' && result.value.ok ? ids[index] : null
        )
        .filter((id): id is string => Boolean(id))
    );

    const restoredCount = restoredIds.size;
    if (restoredCount <= 0) return;

    setNotifications((prev) =>
      prev.map((item) =>
        restoredIds.has(item.id) ? { ...item, is_read: false } : item
      )
    );
    setUnreadCount((prev) => prev + restoredCount);
  };

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        window.clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

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
          {undoState && (
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              <div className="flex items-center justify-between gap-2">
                <span>{t.undoMessage} ({undoState.count})</span>
                <button
                  type="button"
                  onClick={() => void undoMarkFilterRead()}
                  className="rounded border border-emerald-500/40 px-2 py-0.5 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                >
                  {t.undo}
                </button>
              </div>
            </div>
          )}

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
                  <span>{t.dnd}</span>
                  <input
                    type="checkbox"
                    checked={preferences.dndEnabled}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, dndEnabled: event.target.checked }))}
                  />
                </label>
                {preferences.dndEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-2">
                      <span>{t.dndFrom}</span>
                      <select
                        value={preferences.dndStartHour}
                        onChange={(event) =>
                          setPreferences((prev) => ({ ...prev, dndStartHour: Number(event.target.value) }))
                        }
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                      >
                        {Array.from({ length: 24 }).map((_, hour) => (
                          <option key={`dnd-start-${hour}`} value={hour}>
                            {String(hour).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      <span>{t.dndTo}</span>
                      <select
                        value={preferences.dndEndHour}
                        onChange={(event) =>
                          setPreferences((prev) => ({ ...prev, dndEndHour: Number(event.target.value) }))
                        }
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                      >
                        {Array.from({ length: 24 }).map((_, hour) => (
                          <option key={`dnd-end-${hour}`} value={hour}>
                            {String(hour).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
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
            <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    filter === 'all'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.filterAll} ({allCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('newOrder')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    filter === 'newOrder'
                      ? 'bg-rose-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.filterNewOrders} ({newOrderCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('important')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    filter === 'important'
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.filterImportant} ({importantCount})
                </button>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    timeFilter === 'all'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.timeAll}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    timeFilter === 'today'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.timeToday}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('24h')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    timeFilter === '24h'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.time24h}
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('7d')}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    timeFilter === '7d'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {t.time7d}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(event) => setUnreadOnly(event.target.checked)}
                  />
                  <span>{t.unreadOnly}</span>
                </label>
                <button
                  type="button"
                  onClick={() => void markFilterRead()}
                  disabled={unreadInFilterCount === 0}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t.markFilterRead} ({unreadInFilterCount})
                </button>
              </div>
            </div>
            {loading ? (
              <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">...</div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">{t.empty}</div>
            ) : (
              visibleNotifications.map((item) => (
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
