/* Noon web push service worker.
 *
 * Minimal, robust handler: receives encrypted push payloads, shows a
 * notification, and on click focuses an existing tab or opens a new one.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'Noon', body: event.data ? event.data.text() : '' };
  }

  const title = (data && data.title) || 'Noon';
  const options = {
    body: (data && data.body) || '',
    icon: (data && data.icon) || '/images/logo-noon.png',
    badge: (data && data.badge) || '/images/logo-noon.png',
    tag: data && data.tag,
    data: {
      url: (data && data.url) || '/',
    },
    dir: 'auto',
    lang: (data && data.lang) || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && 'focus' in client) {
            client.navigate(targetUrl).catch(() => undefined);
            return client.focus();
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
