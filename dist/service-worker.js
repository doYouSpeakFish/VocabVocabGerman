const CACHE_NAME = 'vocabvocab-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css'
];

// Dynamic resources that shouldn't be cached
const NETWORK_ONLY = [
  './js/app.js',
  './vocab.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  
  // Force activation of the new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      // Ensure the new service worker takes control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Check if this is a request for a dynamic resource that shouldn't be cached
  const shouldSkipCache = NETWORK_ONLY.some(path => url.pathname.endsWith(path));
  
  if (shouldSkipCache) {
    console.log('Network only for:', url.pathname);
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error('Network fetch failed for:', url.pathname, error);
          // Try to get from cache as fallback
          return caches.match(event.request);
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request - request can only be used once
        const fetchRequest = event.request.clone();
        
        // Make network request
        return fetch(fetchRequest).then(response => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response - response can only be used once
          const responseToCache = response.clone();
          
          // Cache the network response
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        // You could return a custom offline page here
      })
  );
}); 