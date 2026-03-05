// sw.js — The Void service worker
// Cache-first strategy for full offline support.
// Scope: /the-void/ (GitHub Pages project path)

const CACHE_NAME = 'void-v1';
const ASSETS = [
  '/the-void/',
  '/the-void/index.html',
  '/the-void/manifest.json',
  '/the-void/icon-192.png',
  '/the-void/icon-512.png',
];

// Install — pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — purge stale caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
