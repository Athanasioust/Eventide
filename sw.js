const CACHE_NAME = 'eventide-shell-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/data.js',
  './js/time.js',
  './js/images.js',
  './js/categoryColors.js',
  './js/ics.js',
  './js/stars.js',
  './js/text.js',
  './js/ticker.js',
  './js/detail.js',
  './js/tabs/events.js',
  './js/tabs/raids.js',
  './js/tabs/research.js',
  './js/tabs/eggs.js',
  './js/tabs/rocket.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App shell only: stale-while-revalidate for same-origin GETs.
// Cross-origin data/image requests (leak-duck JSON, leekduck/PokeAPI sprites)
// pass straight through — the app itself handles their offline fallback via localStorage.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
