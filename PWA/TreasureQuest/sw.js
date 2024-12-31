// The version of the cache.
const VERSION = "1.1";

// The name of the cache
const CACHE_NAME = `treasure-quest-${VERSION}`;

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  "/PWA/TreasureQuest/",
  "/PWA/TreasureQuest/index.html",
  "/PWA/TreasureQuest/app.js",
  "/PWA/TreasureQuest/style.css",
  "/PWA/TreasureQuest/icons/wheel.svg",
  "/PWA/TreasureQuest/quests/test.json",
];

// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES);
    })(),
  );
});

// delete old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        }),
      );
      await clients.claim();
    })(),
  );
});


// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return; 
    }

    e.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(e.request.url);

        console.log(`[Service Worker] Fetching resource: ${e.request.url}`);

        // Return the cached response if it's available.
        if (cachedResponse) return cachedResponse;

        //No cache => try to fetch from network
        console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
        const response = await fetch(e.request);
        cache.put(e.request.url, response.clone());

        return response;
    })());
});