/* Noon PWA service worker.
 *
 * Responsibilities:
 *   1. App-shell install with smart runtime caching.
 *   2. Per-asset strategies for pages, assets, fonts and images.
 *   3. Web Push notifications (receive + click handling).
 *   4. Update lifecycle with SKIP_WAITING message support.
 *
 * Cache versioning: bump CACHE_VERSION to invalidate old caches.
 */

const CACHE_VERSION = 'v1.0.2';
const PRECACHE = `noon-precache-${CACHE_VERSION}`;
const RUNTIME_PAGES = `noon-pages-${CACHE_VERSION}`;
const RUNTIME_ASSETS = `noon-assets-${CACHE_VERSION}`;
const RUNTIME_IMAGES = `noon-images-${CACHE_VERSION}`;
const RUNTIME_FONTS = `noon-fonts-${CACHE_VERSION}`;
const KNOWN_CACHES = new Set([
  PRECACHE,
  RUNTIME_PAGES,
  RUNTIME_ASSETS,
  RUNTIME_IMAGES,
  RUNTIME_FONTS,
]);

const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/images/logo-noon.png',
];

// Never store responses with these status codes.
const CACHEABLE_RESPONSE = (response) =>
  response && response.status === 200 && response.type !== 'opaqueredirect';

// Heuristics for request classification.
const isNavigationRequest = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));

const isImageRequest = (request) =>
  request.destination === 'image' ||
  /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(new URL(request.url).pathname);

const isFontRequest = (request) =>
  request.destination === 'font' ||
  /\.(?:woff2?|ttf|otf|eot)$/i.test(new URL(request.url).pathname);

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  /\.(?:css|js|mjs)$/i.test(url.pathname);

const shouldBypass = (request, url) => {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  // Never cache dynamic API traffic.
  if (url.pathname.startsWith('/api/')) return true;
  // Skip Next.js data fetches and HMR in dev.
  if (url.pathname.startsWith('/_next/data/')) return true;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return true;
  // Skip server-sent events.
  if (request.headers.get('accept')?.includes('text/event-stream')) return true;
  return false;
};

// ─────────────────────────── Lifecycle ───────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Use individual adds so one missing asset doesn't abort install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('noon-') && !KNOWN_CACHES.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─────────────────────────── Fetch ───────────────────────────

self.addEventListener('fetch', (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  if (shouldBypass(request, url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_ASSETS));
    return;
  }

  if (isFontRequest(request)) {
    event.respondWith(cacheFirst(request, RUNTIME_FONTS));
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_IMAGES));
    return;
  }

  // Default: network with cache fallback.
  event.respondWith(networkWithCacheFallback(request, RUNTIME_ASSETS));
});

async function networkFirstNavigation(event) {
  const cache = await caches.open(RUNTIME_PAGES);
  try {
    const response = await fetch(event.request);
    if (CACHEABLE_RESPONSE(response)) {
      cache.put(event.request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch (_) {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (CACHEABLE_RESPONSE(response)) {
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (CACHEABLE_RESPONSE(response)) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

async function networkWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (CACHEABLE_RESPONSE(response)) {
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

// ─────────────────────────── Push ───────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Noon', body: event.data ? event.data.text() : '' };
  }

  const title = (data && data.title) || 'Noon';
  const options = {
    body: (data && data.body) || '',
    icon: (data && data.icon) || '/icon-192x192.png',
    badge: (data && data.badge) || '/icon-192x192.png',
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
