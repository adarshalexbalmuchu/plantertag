const CACHE_NAME = 'ptr-tree-tracker-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/logo.png',
  '/manifest.json',
  '/file.svg',
  '/globe.svg',
  '/window.svg'
];

// Install Event - Pre-cache Static App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache-First for static assets, Network-Only for Supabase API requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass cache completely for Supabase DB requests, Storage endpoints, and local API functions
  if (
    requestUrl.hostname.includes('supabase.co') || 
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/_next/data/')
  ) {
    // Network-only
    return;
  }

  // Cache-first strategy for static assets & pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched static assets
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          (event.request.destination === 'script' || 
           event.request.destination === 'style' || 
           event.request.destination === 'image' || 
           event.request.destination === 'font')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match('/');
      });
    })
  );
});
