/**
 * Service Worker for FlavorQuest PWA
 * 
 * Caching Strategy:
 * - App shell: Cache first with network fallback
 * - POI data: Network first with cache fallback (stale-while-revalidate)
 * - Audio files: Cache first (offline-first priority)
 * - Images: Cache first with placeholder fallback
 * - OSM tiles: Cache first
 * - Supabase Storage: Cache first for audio/images
 * 
 * Features:
 * - Offline support
 * - Background sync for analytics
 * - Audio preloading
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

// Supabase Storage URL patterns
const SUPABASE_STORAGE_PATTERNS = [
  /supabase\.co.*\/storage\/v1\/object\/public\/audio\//,
  /supabase\.co.*\/storage\/v1\/object\/public\/images\//,
];

// Audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

// Image file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

// IndexedDB database name for analytics queue
const IDB_DATABASE = 'flavorquest-analytics';
const IDB_STORE = 'queue';

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

  // Supabase Storage audio files: Cache first (high priority for offline)
  if (isSupabaseAudioUrl(url.href)) {
    event.respondWith(cacheFirstWithTimeout(request, CACHE_NAMES.audio, 10000));
    return;
  }

  // Supabase Storage image files: Cache first with placeholder fallback
  if (isSupabaseImageUrl(url.href)) {
    event.respondWith(cacheFirstWithImageFallback(request, CACHE_NAMES.images));
    return;
  }

  // Audio files by extension: Cache first
  if (isAudioFile(url.pathname)) {
    event.respondWith(cacheFirstWithTimeout(request, CACHE_NAMES.audio, 10000));
    return;
  }

  // Images by extension: Cache first with placeholder fallback
  if (isImageFile(url.pathname) || request.destination === 'image') {
    event.respondWith(cacheFirstWithImageFallback(request, CACHE_NAMES.images));
    return;
  }

  // OSM tiles: Cache first with long expiry
  if (isOSMTile(url)) {
    event.respondWith(cacheFirstWithTimeout(request, CACHE_NAMES.tiles, 5000));
    return;
  }

  // Supabase API: Stale-while-revalidate for POI data
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic));
    return;
  }

  // App shell: Cache first
  event.respondWith(cacheFirst(request, CACHE_NAMES.static));
});

/**
 * Check if URL is Supabase Storage audio
 */
function isSupabaseAudioUrl(href) {
  return SUPABASE_STORAGE_PATTERNS[0].test(href);
}

/**
 * Check if URL is Supabase Storage image
 */
function isSupabaseImageUrl(href) {
  return SUPABASE_STORAGE_PATTERNS[1].test(href);
}

/**
 * Check if path is an audio file
 */
function isAudioFile(pathname) {
  const lowerPath = pathname.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Check if path is an image file
 */
function isImageFile(pathname) {
  const lowerPath = pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Check if URL is OSM tile
 */
function isOSMTile(url) {
  return url.hostname.includes('openstreetmap.org') || 
         url.hostname.includes('tile.osm.org') ||
         url.pathname.includes('.tile.');
}

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
 * Cache First with Timeout Strategy
 * Try cache first, fallback to network with timeout
 * Better for audio files to ensure offline works
 */
async function cacheFirstWithTimeout(request, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Return cached immediately, optionally update in background
    updateCacheInBackground(request, cache);
    return cached;
  }

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch with timeout failed:', error);

    // Return offline fallback
    return new Response('Audio unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Cache First with Image Fallback Strategy
 * Returns placeholder image if offline and not cached
 */
async function cacheFirstWithImageFallback(request, cacheName) {
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
    console.error('[SW] Image fetch failed:', error);

    // Return placeholder SVG
    const placeholderSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect fill="#1a1a2e" width="200" height="200"/>
        <text x="100" y="90" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="14">
          Hình ảnh
        </text>
        <text x="100" y="110" text-anchor="middle" fill="#6b7280" font-family="sans-serif" font-size="14">
          không khả dụng
        </text>
        <path fill="#6b7280" d="M80 130h40l-8-10-12 15-8-10-12 5z" opacity="0.5"/>
        <circle fill="#6b7280" cx="90" cy="115" r="8" opacity="0.5"/>
      </svg>
    `.trim();

    return new Response(placeholderSVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store',
      },
    });
  }
}

/**
 * Update cache in background without blocking response
 */
function updateCacheInBackground(request, cache) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response);
      }
    })
    .catch(() => {
      // Ignore background update errors
    });
}

/**
 * Stale-While-Revalidate Strategy
 * Return cached immediately, update cache in background
 * Best for API data that can be slightly stale
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start network fetch
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.error('[SW] Network fetch failed:', error);
      return null;
    });

  // Return cached if available, otherwise wait for network
  if (cached) {
    return cached;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // Final fallback
  return new Response(JSON.stringify({ error: 'Offline', data: [] }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' },
  });
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

  if (event.tag === 'sync-all') {
    event.waitUntil(syncAll());
  }
});

/**
 * Sync all pending data
 */
async function syncAll() {
  try {
    await syncAnalytics();
    console.log('[SW] All data synced successfully');
  } catch (error) {
    console.error('[SW] Sync all failed:', error);
    throw error; // Re-throw to retry later
  }
}

/**
 * Sync queued analytics events
 */
async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics...');

    // Open IndexedDB and get queued events
    const db = await openAnalyticsDB();
    const queue = await getAnalyticsQueue(db);

    if (queue.length === 0) {
      console.log('[SW] No analytics to sync');
      return;
    }

    console.log(`[SW] Found ${queue.length} analytics events to sync`);

    // Get Supabase URL from env (injected during build or hardcoded)
    // Note: SW không có access to process.env, cần hardcode hoặc inject
    const response = await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events: queue }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync analytics: ${response.statusText}`);
    }

    // Clear synced events
    await clearAnalyticsQueue(db);
    console.log(`[SW] Successfully synced ${queue.length} analytics events`);

    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'ANALYTICS_SYNCED',
        count: queue.length,
      });
    });
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Open IndexedDB for analytics queue
 */
function openAnalyticsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DATABASE, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all queued analytics events
 */
function getAnalyticsQueue(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, 'readonly');
    const store = transaction.objectStore(IDB_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Clear all queued analytics events
 */
function clearAnalyticsQueue(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite');
    const store = transaction.objectStore(IDB_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Message event: Handle skip waiting and other commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Preload audio files
  if (event.data && event.data.type === 'PRELOAD_AUDIO') {
    event.waitUntil(preloadAudioFiles(event.data.urls));
  }

  // Preload image files
  if (event.data && event.data.type === 'PRELOAD_IMAGES') {
    event.waitUntil(preloadImageFiles(event.data.urls));
  }

  // Clear specific cache
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearSpecificCache(event.data.cacheName));
  }

  // Get cache stats
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    event.waitUntil(getCacheStats().then(stats => {
      event.source.postMessage({
        type: 'CACHE_STATS',
        stats,
      });
    }));
  }
});

/**
 * Preload audio files vào cache
 */
async function preloadAudioFiles(urls) {
  if (!urls || urls.length === 0) return;

  console.log(`[SW] Preloading ${urls.length} audio files...`);

  const cache = await caches.open(CACHE_NAMES.audio);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        // Check if already cached
        const cached = await cache.match(url);
        if (cached) {
          return { url, status: 'already-cached' };
        }

        // Fetch and cache
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return { url, status: 'cached' };
        }
        return { url, status: 'failed', reason: response.statusText };
      } catch (error) {
        return { url, status: 'failed', reason: error.message };
      }
    })
  );

  const cached = results.filter(r => r.status === 'fulfilled' && r.value.status === 'cached').length;
  const alreadyCached = results.filter(r => r.status === 'fulfilled' && r.value.status === 'already-cached').length;
  const failed = results.filter(r => r.status === 'rejected' || r.value?.status === 'failed').length;

  console.log(`[SW] Audio preload complete: ${cached} new, ${alreadyCached} already cached, ${failed} failed`);

  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'PRELOAD_COMPLETE',
      category: 'audio',
      stats: { cached, alreadyCached, failed, total: urls.length },
    });
  });
}

/**
 * Preload image files vào cache
 */
async function preloadImageFiles(urls) {
  if (!urls || urls.length === 0) return;

  console.log(`[SW] Preloading ${urls.length} image files...`);

  const cache = await caches.open(CACHE_NAMES.images);
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const cached = await cache.match(url);
        if (cached) {
          return { url, status: 'already-cached' };
        }

        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return { url, status: 'cached' };
        }
        return { url, status: 'failed', reason: response.statusText };
      } catch (error) {
        return { url, status: 'failed', reason: error.message };
      }
    })
  );

  const cached = results.filter(r => r.status === 'fulfilled' && r.value.status === 'cached').length;
  const alreadyCached = results.filter(r => r.status === 'fulfilled' && r.value.status === 'already-cached').length;
  const failed = results.filter(r => r.status === 'rejected' || r.value?.status === 'failed').length;

  console.log(`[SW] Image preload complete: ${cached} new, ${alreadyCached} already cached, ${failed} failed`);

  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'PRELOAD_COMPLETE',
      category: 'images',
      stats: { cached, alreadyCached, failed, total: urls.length },
    });
  });
}

/**
 * Clear specific cache
 */
async function clearSpecificCache(cacheName) {
  if (cacheName && CACHE_NAMES[cacheName]) {
    await caches.delete(CACHE_NAMES[cacheName]);
    console.log(`[SW] Cleared cache: ${CACHE_NAMES[cacheName]}`);
  }
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const stats = {};

  for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      stats[name] = {
        name: cacheName,
        count: keys.length,
      };
    } catch (error) {
      stats[name] = { name: cacheName, count: 0, error: error.message };
    }
  }

  return stats;
}
