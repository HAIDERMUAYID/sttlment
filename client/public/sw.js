const CACHE_NAME = 'sttlment-v2'; // Updated version to force cache refresh
const urlsToCache = [
  '/',
  '/dashboard',
  '/tasks',
  '/merchants', // Added merchants route
  '/static/css/main.css',
  '/static/js/main.js',
];

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Don't fail if some URLs can't be cached
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err)))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // In development, always fetch from network first
  if (event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  } else {
    // In production, use cache first
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
