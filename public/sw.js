/**
 * Service Worker for FlavorQuest PWA
 * 
 * Caching Strategy:
 * - App shell: Cache first with network fallback
 * - POI data: Network first with cache fallback
 * - Audio files: Cache first
 * - Images: Cache first
 * - OSM tiles: Cache first
 * 
 * Features:
 * - Offline support
 * - Background sync for analytics
 * - Push notifications (future)
 * 
 * Cache Names:
 * - flavorquest-static-v1: App shell (HTML, CSS, JS)
 * - flavorquest-dynamic-v1: Dynamic content (POI data)
 * - flavorquest-audio-v1: Audio files
 * - flavorquest-images-v1: Images
 * - flavorquest-tiles-v1: Map tiles
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `flavorquest-static-${CACHE_VERSION}`,
  dynamic: `flavorquest-dynamic-${CACHE_VERSION}`,
  audio: `flavorquest-audio-${CACHE_VERSION}`,
  images: `flavorquest-images-${CACHE_VERSION}`,
  tiles: `flavorquest-tiles-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event: Cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Force activation immediately
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old versions
            return (
              name.startsWith('flavorquest-') &&
              !Object.values(CACHE_NAMES).includes(name)
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event: Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Audio files: Cache first
  if (url.pathname.includes('/audio/') || request.destination === 'audio') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.audio));
    return;
  }

  // Images: Cache first
  if (url.pathname.includes('/images/') || request.destination === 'image') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
    return;
  }

  // OSM tiles: Cache first
  if (url.hostname.includes('openstreetmap.org') || url.pathname.includes('.tile.')) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.tiles));
    return;
  }

  // Supabase API: Network first (always get fresh data if online)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request, CACHE_NAMES.dynamic));
    return;
  }

  // App shell: Cache first
  event.respondWith(cacheFirst(request, CACHE_NAMES.static));
});

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return offline fallback if available
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Network fetch failed, trying cache:', error);

    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline fallback
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Background Sync: Sync analytics when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

/**
 * Sync queued analytics events
 */
async function syncAnalytics() {
  try {
    // In future, implement actual sync logic
    // For now, just log
    console.log('[SW] Syncing analytics...');
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

// Message event: Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
