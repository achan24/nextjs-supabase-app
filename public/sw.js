const CACHE_NAME = 'guardian-angel-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/process-flow',
  '/dashboard/notes',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching assets');
        return cache.addAll(urlsToCache);
      })
  );
  // Activate the new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      console.log('[ServiceWorker] Claiming clients');
      return clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch event for:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Push notification event
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push event:', event);
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    actions: [
      {
        action: 'open',
        title: 'Open Task'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
  console.log('[ServiceWorker] Notification shown:', data.title);
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification click event:', event);
  event.notification.close();

  if (event.action === 'open') {
    // Open the task
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
    console.log('[ServiceWorker] Open action clicked, opening URL:', event.notification.data.url);
  } else {
    console.log('[ServiceWorker] Notification dismissed');
  }
}); 