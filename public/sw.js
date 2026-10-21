/* 1verce Service Worker
 * - App shell (index.html): network-first, falls back to cache when offline
 * - Hashed build assets (/assets/*): cache-first (immutable)
 * - Artist photos & YouTube thumbnails: stale-while-revalidate with size cap
 * - Supabase API / YouTube player: never cached (always live)
 */
const VERSION = 'v1';
const SHELL_CACHE = `1verce-shell-${VERSION}`;
const ASSET_CACHE = `1verce-assets-${VERSION}`;
const IMAGE_CACHE = `1verce-images-${VERSION}`;
const IMAGE_CACHE_LIMIT = 400;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]);
      for (const key of await caches.keys()) {
        if (!keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

// The page asks the waiting worker to take over when the user taps "更新"
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App navigation: network-first so new deploys show immediately; offline -> cached shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/', res.clone());
          return res;
        } catch {
          return (await caches.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // Immutable hashed bundles
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) (await caches.open(ASSET_CACHE)).put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Artist portraits and YouTube thumbnails
  const isArtist = url.origin === self.location.origin && url.pathname.startsWith('/artists/');
  const isThumb = url.hostname === 'i.ytimg.com';
  if (isArtist || isThumb) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              cache.put(req, res.clone()).then(() => trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
    return;
  }

  // Other same-origin files (manifest, icons): network, falling back to precache when offline
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(req).catch(async () => (await caches.match(req)) || Response.error()));
  }
  // Everything else (Supabase, YouTube embeds, fonts) goes straight to the network
});
