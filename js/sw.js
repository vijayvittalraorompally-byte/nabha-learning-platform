const CACHE_NAME = 'nabha-learning-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/student-dashboard.html',
  '/teacher-dashboard.html',
  '/video-player.html',
  '/quiz.html',
  '/upload-video.html',
  '/create-quiz.html',
  '/analytics.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/supabase.js',
  '/js/dashboard.js',
  '/js/video-handler.js',
  '/js/quiz-handler.js',
  '/js/real-time.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching files...');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls for real-time functionality
  if (event.request.url.includes('supabase.co') && 
      (event.request.url.includes('realtime') || 
       event.request.url.includes('rest/v1'))) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Serving from cache:', event.request.url);
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
            
            // Don't cache external API responses except Supabase CDN
            if (event.request.url.startsWith('http') && 
                !event.request.url.includes(self.location.origin) &&
                !event.request.url.includes('unpkg.com')) {
              return response;
            }
            
            // Clone response for caching
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                console.log('Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        ).catch(function(error) {
          console.log('Network failed for:', event.request.url);
          
          // Return appropriate offline fallbacks
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          // For images, you could return a placeholder
          if (event.request.destination === 'image') {
            return new Response('', { status: 204 });
          }
          
          throw error;
        });
      })
    );
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
  
  if (event.tag === 'quiz-sync') {
    event.waitUntil(syncQuizData());
  }
  
  if (event.tag === 'video-progress-sync') {
    event.waitUntil(syncVideoProgress());
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Nabha Learning', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked');
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard.html')
    );
  }
});

// Sync functions
async function syncData() {
  try {
    // Sync offline stored data when connection is back
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      console.log('Syncing offline data:', offlineData.length, 'items');
      
      for (let data of offlineData) {
        try {
          await syncToSupabase(data);
          await removeOfflineData(data.id);
        } catch (error) {
          console.log('Sync failed for item:', data.id, error);
        }
      }
    }
  } catch (error) {
    console.log('Sync data error:', error);
  }
}

async function syncQuizData() {
  try {
    const offlineQuizData = await getOfflineQuizData();
    if (offlineQuizData.length > 0) {
      console.log('Syncing quiz data:', offlineQuizData.length, 'items');
      
      for (let quiz of offlineQuizData) {
        try {
          await syncQuizToSupabase(quiz);
          await removeOfflineQuizData(quiz.id);
        } catch (error) {
          console.log('Quiz sync failed:', quiz.id, error);
        }
      }
    }
  } catch (error) {
    console.log('Quiz sync error:', error);
  }
}

async function syncVideoProgress() {
  try {
    const offlineProgress = await getOfflineVideoProgress();
    if (offlineProgress.length > 0) {
      console.log('Syncing video progress:', offlineProgress.length, 'items');
      
      for (let progress of offlineProgress) {
        try {
          await syncVideoProgressToSupabase(progress);
          await removeOfflineVideoProgress(progress.id);
        } catch (error) {
          console.log('Video progress sync failed:', progress.id, error);
        }
      }
    }
  } catch (error) {
    console.log('Video progress sync error:', error);
  }
}

// Helper functions for offline data management
async function getOfflineData() {
  try {
    const cache = await caches.open('offline-data');
    const keys = await cache.keys();
    const data = [];
    
    for (let key of keys) {
      if (key.url.includes('offline-data')) {
        const response = await cache.match(key);
        const jsonData = await response.json();
        data.push(jsonData);
      }
    }
    
    return data;
  } catch (error) {
    console.log('Get offline data error:', error);
    return [];
  }
}

async function getOfflineQuizData() {
  // Implementation for getting offline quiz data
  return [];
}

async function getOfflineVideoProgress() {
  // Implementation for getting offline video progress
  return [];
}

async function syncToSupabase(data) {
  // Implementation for syncing general data to Supabase
  console.log('Syncing to Supabase:', data);
}

async function syncQuizToSupabase(quiz) {
  // Implementation for syncing quiz data to Supabase
  console.log('Syncing quiz to Supabase:', quiz);
}

async function syncVideoProgressToSupabase(progress) {
  // Implementation for syncing video progress to Supabase
  console.log('Syncing video progress to Supabase:', progress);
}

async function removeOfflineData(id) {
  // Implementation for removing synced offline data
  console.log('Removing offline data:', id);
}

async function removeOfflineQuizData(id) {
  // Implementation for removing synced quiz data
  console.log('Removing offline quiz data:', id);
}

async function removeOfflineVideoProgress(id) {
  // Implementation for removing synced video progress
  console.log('Removing offline video progress:', id);
}
