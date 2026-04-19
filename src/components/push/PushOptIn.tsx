'use client';

/**
 * Web push opt-in toggle.
 *
 * Handles the full browser-side flow: registers the service worker, asks
 * permission, subscribes with the server VAPID public key, and posts the
 * subscription to `/api/push/subscribe`. Unsubscribing removes both the
 * browser subscription and the server record.
 *
 * The UI text is strictly English / Arabic per the project language rules.
 */

import { useCallback, useEffect, useState } from 'react';

type Language = 'en' | 'ar';

type Status = 'idle' | 'unsupported' | 'denied' | 'unsubscribed' | 'subscribed' | 'working';

interface PushOptInProps {
  locale?: Language;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(raw);
  const buffer = new ArrayBuffer(bin.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return arr;
}

function subscriptionToJson(sub: PushSubscription) {
  const raw = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: raw.keys?.p256dh,
      auth: raw.keys?.auth,
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

export default function PushOptIn({ locale = 'en' }: PushOptInProps) {
  const [status, setStatus] = useState<Status>('idle');
  const isArabic = locale === 'ar';

  const detect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        setStatus('unsubscribed');
        return;
      }
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? 'subscribed' : 'unsubscribed');
    } catch {
      setStatus('unsubscribed');
    }
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const enable = async () => {
    if (status === 'working') return;
    setStatus('working');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
        return;
      }
      const response = await fetch('/api/push/vapid-public-key');
      if (!response.ok) {
        console.error('[push] vapid key fetch failed', response.status);
        setStatus('unsubscribed');
        return;
      }
      const { publicKey } = (await response.json()) as { publicKey: string };
      if (!publicKey) {
        setStatus('unsubscribed');
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const saved = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionToJson(subscription)),
      });
      if (!saved.ok) {
        await subscription.unsubscribe().catch(() => undefined);
        setStatus('unsubscribed');
        return;
      }
      setStatus('subscribed');
    } catch (error) {
      console.error('[push] enable failed', error);
      setStatus('unsubscribed');
    }
  };

  const disable = async () => {
    if (status === 'working') return;
    setStatus('working');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        setStatus('unsubscribed');
        return;
      }
      const sub = await registration.pushManager.getSubscription();
      if (!sub) {
        setStatus('unsubscribed');
        return;
      }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      setStatus('unsubscribed');
    } catch (error) {
      console.error('[push] disable failed', error);
      setStatus('subscribed');
    }
  };

  const label = (key: 'enable' | 'disable' | 'unsupported' | 'denied' | 'working' | 'title' | 'description'): string => {
    const dictionary = {
      en: {
        title: 'Push notifications',
        description: 'Get instant alerts on this device for bookings, reminders and updates.',
        enable: 'Enable push notifications',
        disable: 'Disable push notifications',
        unsupported: 'Push notifications are not supported in this browser.',
        denied: 'Permission is blocked. Allow notifications in your browser settings to enable.',
        working: 'Please wait…',
      },
      ar: {
        title: 'إشعارات الدفع',
        description: 'احصل على تنبيهات فورية على هذا الجهاز للحجوزات والتذكيرات والتحديثات.',
        enable: 'تفعيل إشعارات الدفع',
        disable: 'إيقاف إشعارات الدفع',
        unsupported: 'إشعارات الدفع غير مدعومة في هذا المتصفح.',
        denied: 'تم حظر الإذن. يرجى السماح بالإشعارات من إعدادات المتصفح للتفعيل.',
        working: 'يرجى الانتظار…',
      },
    } as const;
    return dictionary[isArabic ? 'ar' : 'en'][key];
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <h3 className="text-base font-semibold text-slate-900">{label('title')}</h3>
      <p className="mt-1 text-sm text-slate-600">{label('description')}</p>

      <div className="mt-4">
        {status === 'unsupported' ? (
          <p className="text-sm text-rose-600">{label('unsupported')}</p>
        ) : status === 'denied' ? (
          <p className="text-sm text-amber-600">{label('denied')}</p>
        ) : status === 'subscribed' ? (
          <button
            type="button"
            onClick={disable}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {label('disable')}
          </button>
        ) : status === 'working' ? (
          <span className="text-sm text-slate-500">{label('working')}</span>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={status === 'idle'}
            className="inline-flex items-center rounded-lg bg-[color:var(--noon-teal,#14b8a6)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {label('enable')}
          </button>
        )}
      </div>
    </div>
  );
}
