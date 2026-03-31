'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
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

interface AdminNotificationsPageClientProps {
  locale: Locale;
}

export default function AdminNotificationsPageClient({ locale }: AdminNotificationsPageClientProps) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = useMemo(
    () => ({
      title: locale === 'ar' ? 'كل الإشعارات' : 'All Notifications',
      subtitle:
        locale === 'ar'
          ? 'عرض جميع التنبيهات والتنبيهات المقروءة وغير المقروءة'
          : 'See all read and unread alerts in one place',
      markAllRead: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
      empty: locale === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet',
      unread: locale === 'ar' ? 'غير مقروء' : 'Unread',
      read: locale === 'ar' ? 'مقروء' : 'Read',
    }),
    [locale]
  );

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=200');
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
        if (!incomingNotification) {
          void fetchNotifications();
          return;
        }

        setNotifications((prev) => [incomingNotification, ...prev].slice(0, 200));
        setUnreadCount((prev) => prev + 1);
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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {unreadCount} {t.unread}
          </span>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiCheck className="size-4" />
            {t.markAllRead}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">...</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">{t.empty}</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.is_read) void markOneRead(item.id);
                }}
                className={`w-full px-5 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  item.is_read ? '' : 'bg-indigo-50/60 dark:bg-indigo-900/20'
                }`}
              >
                {(() => {
                  const localized = formatNotificationContent(
                    { type: item.type, title: item.title, message: item.message, data: item.data },
                    locale
                  );

                  return (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{localized.title}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.is_read
                            ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        }`}
                      >
                        {item.is_read ? t.read : t.unread}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{localized.message}</p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(item.created_at).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}
                    </p>
                  </div>
                </div>
                  );
                })()}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
