// service-worker.js - UPDATED VERSION
const CACHE_NAME = 'cars-kenya-v4.0'; // Increment version

// Cache ALL critical files
const urlsToCache = [
  '/CK-DASHBOARD/',
  '/CK-DASHBOARD/index.html',
  '/CK-DASHBOARD/manifest.json',
  '/CK-DASHBOARD/offline.html',
  'https://unpkg.com/tailwindcss-jit-cdn',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install event
self.addEventListener('install', event => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching essential files v4.0');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('Cache addAll error:', error);
        });
      })
  );
});

// Activate event - Force cleanup
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up ALL old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - Network first, cache fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For HTML pages - try network first
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Cache the fresh version
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/CK-DASHBOARD/index.html');
            });
        })
    );
    return;
  }

  // For other resources - cache first
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/CK-DASHBOARD/offline.html');
            }
            return new Response('Network error', { 
              status: 408, 
              headers: { 'Content-Type': 'text/plain' } 
            });
          });
      })
  );
});

// Force skip waiting on any message
self.addEventListener('message', event => {
  if (event.data) {
    self.skipWaiting();
    self.clients.claim();
  }
});
