const CACHE_NAME = 'cars-kenya-v2.0';
const DYNAMIC_CACHE = 'cars-kenya-dynamic-v1.0';

// Define which domains should open in the app
const APP_DOMAINS = [
  'starksgalaxykenya.github.io',
  'carskenya.co.ke',
  'fortifyai.international'
];

const urlsToCache = [
  '/CK-DASHBOARD/',
  '/CK-DASHBOARD/index.html',
  '/CK-DASHBOARD/manifest.json',
  // Add paths to your other systems if they're on same domain
  '/CK-MANAGER/',
  '/finance-system-ck/',
  '/CK-FLEET-MANAGER/',
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Helper function to check if URL should be handled by app
function shouldOpenInApp(url) {
  try {
    const urlObj = new URL(url);
    // Check if it's one of our app domains
    return APP_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

// Fetch event with link handling
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // For same-origin requests or our app domains
  if (url.origin === self.location.origin || shouldOpenInApp(request.url)) {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch from network
          return fetch(request)
            .then(networkResponse => {
              // Don't cache if not a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }
              
              // Clone the response
              const responseToCache = networkResponse.clone();
              
              // Cache the new resource
              caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
                
              return networkResponse;
            })
            .catch(() => {
              // If fetch fails, try to get a fallback
              if (request.destination === 'document') {
                return caches.match('/CK-DASHBOARD/index.html');
              }
              return new Response('Network error', { status: 408 });
            });
        })
    );
  }
  // For external URLs (not our domains), let browser handle them
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
