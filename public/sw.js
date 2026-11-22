/* eslint-disable */
// PassVault service worker — an app-shell offline cache.
//
// - Static assets are cached on first use (they have fingerprinted names).
// - Navigations fall back to the cached shell when offline.
// - Never caches the Supabase API responses (cross-origin).

const CACHE_NAME = 'passvault-shell-v2';

const SHELL_ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(SHELL_ASSETS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only our own origin — Supabase calls are always fresh.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
        .then((response) => response || caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      // Cache hit → serve from cache; miss → go to network (then cache).
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()).catch(() => {}))
            .catch(() => {});
        }
        return response;
      });
    }),
  );
});
