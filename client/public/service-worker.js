// Service Worker for BlogHub PWA

const CACHE_NAME = 'moodblog-cache-v1';
const STATIC_CACHE_NAME = 'moodblog-static-v1';
const API_CACHE_NAME = 'moodblog-api-v1';

// Assets to cache immediately during installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.ico'
];

// Install a service worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  // Skip waiting to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate the service worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  // Claim clients to take control immediately
  event.waitUntil(clients.claim());

  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          ) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Helper function to determine if a request is for an API
const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/');
};

// Helper function to determine if a request is for a static asset
const isStaticAsset = (url) => {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  );
};

// Cache and return requests with different strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip browser extension requests
  if (!(url.protocol === 'http:' || url.protocol === 'https:')) return;

  // Handle API requests - Network first, then cache
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();

          // Only cache successful responses
          if (response.ok) {
            caches.open(API_CACHE_NAME)
              .then(cache => {
                // Set a 5-minute expiration
                const headers = new Headers(responseToCache.headers);
                headers.append('sw-fetched-on', new Date().getTime().toString());

                // Create a new response with the updated headers
                const responseWithHeaders = new Response(
                  responseToCache.body,
                  {
                    status: responseToCache.status,
                    statusText: responseToCache.statusText,
                    headers: headers
                  }
                );

                cache.put(event.request, responseWithHeaders);
              });
          }

          return response;
        })
        .catch(() => {
          // If network fails, try to return from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                // Check if the cached response is expired (older than 5 minutes)
                const fetchedOn = cachedResponse.headers.get('sw-fetched-on');
                if (fetchedOn) {
                  const fetchedOnTime = parseInt(fetchedOn);
                  const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

                  if (new Date().getTime() - fetchedOnTime < expirationTime) {
                    return cachedResponse;
                  }
                }

                // Return cached response even if expired when offline
                return cachedResponse;
              }

              // If no cached response, return a custom offline response for API
              return new Response(
                JSON.stringify({ error: 'You are offline' }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle static assets - Cache first, then network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return the cached version
            return cachedResponse;
          }

          // If not in cache, fetch from network
          return fetch(event.request)
            .then(response => {
              // Clone the response
              const responseToCache = response.clone();

              // Cache the fetched response
              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            });
        })
    );
    return;
  }

  // For HTML navigation requests - Network first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();

          // Cache the latest HTML
          caches.open(STATIC_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          // If network fails, try to return from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }

              // If not in cache, try to return the root index.html
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Default strategy for everything else - Cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response.ok) return response;

            // Clone the response
            const responseToCache = response.clone();

            caches.open(STATIC_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});
