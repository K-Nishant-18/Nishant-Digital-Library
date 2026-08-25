/* My Library service worker — offline support
 * Strategies:
 *  - navigations (HTML):        network-first, cache snapshot, offline -> cached page or '/'
 *  - /_next/static + assets:    cache-first (immutable, content-hashed)
 *  - other same-origin GETs:    stale-while-revalidate
 *  - POST/server actions:       never intercepted (must hit network)
 */
const VERSION = 'v2';
const CACHE_NAME = `my-library-${VERSION}`;
const PRECACHE = ['/', '/manifest.json', '/my-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch {}
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await putInCache(request, response);
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(request, response);
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match('/')) ||
      new Response('Offline', { status: 503, statusText: 'Offline' })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) putInCache(request, response);
      return response;
    })
    .catch(() => undefined);
  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let cross-origin traffic (Google Books API, covers CDN…) go straight to network
  if (url.origin !== self.location.origin) return;

  // Immutable hashed static assets & images: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(css|js|mjs|woff2?|png|jpe?g|gif|svg|webp|avif|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page navigations & RSC payload requests: network-first with offline fallback
  if (
    request.mode === 'navigate' ||
    url.searchParams.has('_rsc') ||
    (request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else same-origin: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});
