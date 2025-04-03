// The version of the cache.
const VERSION = "2.1.1";

// The name of the cache
const CACHE_NAME = `treasure-quest-${VERSION}`;

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  "/PWA/TreasureQuest/",
  "/PWA/TreasureQuest/app.js",
  "/PWA/TreasureQuest/index.html",
  "/PWA/TreasureQuest/quest.js",
  "/PWA/TreasureQuest/questDB.js",
  "/PWA/TreasureQuest/quests.json",
  "/PWA/TreasureQuest/style.css",
  "/PWA/TreasureQuest/icons/icon.svg",
  "/PWA/TreasureQuest/assets/failure.mp3",
  "/PWA/TreasureQuest/assets/success.mp3",  
  "/PWA/TreasureQuest/bootstrap/bootstrap.min.css",
  "/PWA/TreasureQuest/bootstrap/bootstrap.min.css.map",
  "/PWA/TreasureQuest/bootstrap/bootstrap.bundle.min.js",
  "/PWA/TreasureQuest/bootstrap/bootstrap.bundle.min.js.map"
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
  const fullUrl = e.request.url;
  const domain = new URL(fullUrl).origin;
  const relativePath = fullUrl.replace(domain, '');
  
  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(fullUrl.startsWith('http:') || fullUrl.startsWith('https:'))) {
      return; 
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(e.request);

    console.log(`[Service Worker] Fetching from cache: ${relativePath}`);

    // Return the cached response if it's available.
    if (cachedResponse) {
      return cachedResponse;
    }

    //No cache => try to fetch from network
    console.log(`[Service Worker] Fetching from network: ${fullUrl}`);
    const response = await fetch(e.request);

    if (response) {
        cache.put(fullUrl, response.clone());
    }

    return response;      
  })());
});