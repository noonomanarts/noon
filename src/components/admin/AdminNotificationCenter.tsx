'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiBell, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import type { Locale } from '@/lib/locale';
import { formatNotificationContent } from '@/lib/notifications/formatNotification';

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
}

export default function AdminNotificationCenter({ locale }: AdminNotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = useMemo(() => ({
    title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
    markAllRead: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
    empty: locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications',
    viewAll: locale === 'ar' ? 'عرض الكل' : 'View all',
  }), [locale]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const source = new EventSource('/api/admin/stream');

    const onNotification = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { notification?: NotificationItem };
        const incomingNotification = payload.notification;
        if (incomingNotification) {
          setNotifications((prev) => [incomingNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } else {
          void fetchNotifications();
        }
      } catch {
        void fetchNotifications();
      }
    };

    source.addEventListener('notification_created', onNotification as EventListener);

    return () => {
      source.removeEventListener('notification_created', onNotification as EventListener);
      source.close();
    };
  }, []);

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
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" aria-label={`${unreadCount}`} />
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
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <FiCheck className="size-4" />
                {t.markAllRead}
              </button>
              <Link
                href={`/${locale}/admin/notifications`}
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-600 hover:underline dark:text-zinc-300"
              >
                {t.viewAll}
              </Link>
            </div>
          </div>

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
                  className={`w-full border-b border-zinc-100 px-4 py-3 text-start transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${item.is_read ? '' : 'bg-indigo-50/70 dark:bg-indigo-900/20'}`}
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
