'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

interface AccountNotificationsPageClientProps {
  locale: Locale;
}

type NotificationFilter = 'all' | 'wallet' | 'withdrawals' | 'transfers';

const NOTIFICATION_FILTERS: NotificationFilter[] = ['all', 'wallet', 'withdrawals', 'transfers'];

function isNotificationFilter(value: string | null): value is NotificationFilter {
  return value !== null && NOTIFICATION_FILTERS.includes(value as NotificationFilter);
}

function getNotificationFilter(type: string): NotificationFilter {
  if (type.startsWith('withdrawal_request_')) return 'withdrawals';
  if (type === 'transfer_sent' || type === 'transfer_received') return 'transfers';
  if (type.includes('wallet') || type === 'deposit_success' || type === 'admin_credit' || type === 'admin_deduct') {
    return 'wallet';
  }
  return 'all';
}

export function AccountNotificationsPageClient({ locale }: AccountNotificationsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>(() => {
    const filterFromQuery = searchParams.get('filter');
    return isNotificationFilter(filterFromQuery) ? filterFromQuery : 'all';
  });

  const t = useMemo(
    () => ({
      title: locale === 'ar' ? 'إشعاراتي' : 'My Notifications',
      subtitle:
        locale === 'ar'
          ? 'جميع إشعارات الحساب والمحفظة، بما فيها قبول أو رفض طلبات السحب.'
          : 'All account and wallet notifications, including withdrawal approvals and rejections.',
      markAllRead: locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
      empty: locale === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet',
      emptyFiltered: locale === 'ar' ? 'لا توجد إشعارات ضمن هذا التصنيف' : 'No notifications in this category',
      unread: locale === 'ar' ? 'غير مقروء' : 'Unread',
      unreadShort: locale === 'ar' ? 'جديد' : 'new',
      read: locale === 'ar' ? 'مقروء' : 'Read',
      filters: {
        all: locale === 'ar' ? 'الكل' : 'All',
        wallet: locale === 'ar' ? 'المحفظة' : 'Wallet',
        withdrawals: locale === 'ar' ? 'طلبات السحب' : 'Withdrawals',
        transfers: locale === 'ar' ? 'التحويلات' : 'Transfers',
      },
    }),
    [locale]
  );

  const filterCounts = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      all: notifications.length,
      wallet: 0,
      withdrawals: 0,
      transfers: 0,
    };

    notifications.forEach((item) => {
      const category = getNotificationFilter(item.type);
      if (category !== 'all') {
        counts[category] += 1;
      }
    });

    return counts;
  }, [notifications]);

  const filterUnreadCounts = useMemo(() => {
    const counts: Record<NotificationFilter, number> = {
      all: notifications.filter((item) => !item.is_read).length,
      wallet: 0,
      withdrawals: 0,
      transfers: 0,
    };

    notifications.forEach((item) => {
      if (item.is_read) return;
      const category = getNotificationFilter(item.type);
      if (category !== 'all') {
        counts[category] += 1;
      }
    });

    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((item) => getNotificationFilter(item.type) === activeFilter);
  }, [activeFilter, notifications]);

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
    const filterFromQuery = searchParams.get('filter');
    const nextFilter = isNotificationFilter(filterFromQuery) ? filterFromQuery : 'all';
    if (nextFilter !== activeFilter) {
      setActiveFilter(nextFilter);
    }
  }, [activeFilter, searchParams]);

  useEffect(() => {
    const source = new EventSource('/api/stream');

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

  const setFilter = (filter: NotificationFilter) => {
    setActiveFilter(filter);

    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.title}</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full noon-soft-purple px-3 py-1 text-xs font-semibold text-[color:var(--noon-purple)] dark:text-purple-200">
            {unreadCount} {t.unread}
          </span>
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--muted)] hover:text-[color:var(--text)]"
          >
            <FiCheck className="size-4" />
            {t.markAllRead}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <div className="flex flex-wrap gap-2 border-b border-[color:var(--border)] p-4">
          {NOTIFICATION_FILTERS.map((filterKey) => {
            const isActive = activeFilter === filterKey;
            return (
              <button
                key={filterKey}
                onClick={() => setFilter(filterKey)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[color:var(--noon-purple)] text-white'
                    : 'bg-[color:var(--muted)] text-[color:var(--text-muted)] hover:bg-[color:var(--border)]'
                }`}
              >
                {t.filters[filterKey]} ({filterCounts[filterKey]})
                {filterUnreadCounts[filterKey] > 0 ? ` • ${filterUnreadCounts[filterKey]} ${t.unreadShort}` : ''}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-[color:var(--text-subtle)]">...</div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--text-subtle)]">{t.empty}</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[color:var(--text-subtle)]">{t.emptyFiltered}</div>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {filteredNotifications.map((item) => {
              const localized = formatNotificationContent(
                { type: item.type, title: item.title, message: item.message, data: item.data },
                locale
              );

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) void markOneRead(item.id);
                  }}
                  className={`w-full px-5 py-4 text-left transition-colors hover:bg-[color:var(--muted)] ${
                    item.is_read ? '' : 'noon-soft-purple'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[color:var(--text)]">{localized.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.is_read
                              ? 'bg-[color:var(--muted)] text-[color:var(--text-muted)]'
                              : 'bg-[color:var(--noon-purple)]/15 text-[color:var(--noon-purple)] dark:bg-[color:var(--noon-purple)]/30 dark:text-purple-200'
                          }`}
                        >
                          {item.is_read ? t.read : t.unread}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--text-muted)]">{localized.message}</p>
                      <p className="mt-2 text-xs text-[color:var(--text-subtle)]">
                        {new Date(item.created_at).toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
