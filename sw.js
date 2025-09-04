const CACHE_NAME = 'nabha-learning-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/course.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/supabase.js',
  '/manifest.json',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        var fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        ).catch(function() {
          // Network failed, return offline page
          return caches.match('/index.html');
        });
      })
    );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  if (event.tag == 'background-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Sync offline stored data when connection is back
  const offlineData = await getOfflineData();
  if (offlineData.length > 0) {
    // Send offline data to server
    for (let data of offlineData) {
      try {
        await syncToSupabase(data);
      } catch (error) {
        console.log('Sync failed:', error);
      }
    }
  }
}
