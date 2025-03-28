importScripts('questDB.js');

// The version of the cache.
const VERSION = "2.0.18";

// The name of the cache
const CACHE_NAME = `treasure-quest-${VERSION}`;

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  "/PWA/TreasureQuest/",
  "/PWA/TreasureQuest/index.html",
  "/PWA/TreasureQuest/app.js",
  "/PWA/TreasureQuest/questDB.js",
  "/PWA/TreasureQuest/style.css",
  "/PWA/TreasureQuest/icons/icon.svg",
  "/PWA/TreasureQuest/quests/test.json",
  "/PWA/TreasureQuest/assets/Roy/map-sketch.png",  
  "/PWA/TreasureQuest/bootstrap/bootstrap.min.css",
  "/PWA/TreasureQuest/bootstrap/bootstrap.min.css.map",
  "/PWA/TreasureQuest/bootstrap/bootstrap.bundle.min.js",
  "/PWA/TreasureQuest/bootstrap/bootstrap.bundle.min.js.map",
  "/PWA/TreasureQuest/assets/Roy/ransom.png"
];

const APP_MEDIA = [
  "/PWA/TreasureQuest/assets/failure.mp3",
  "/PWA/TreasureQuest/assets/success.mp3",  
  "/PWA/TreasureQuest/assets/Roy/helo-audio.mp3",
  "/PWA/TreasureQuest/assets/Roy/video1.mp4"
];

// Connect to indexDB
const questDB = new QuestDB();
questDB.connect()
.then((message) => {
  console.log(message);
})
.catch((error) => {
  console.error(error);
});


// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES);
    })(),
  );

  //Add media to indexDB
  questDB.waitConnected()
  .then(() => {
    checkMedia();
  }).catch(() => {
    console.log('no db');
  });
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

  //Add media to indexDB
  questDB.waitConnected()
  .then(() => {
    checkMedia();
  }).catch(() => {
    console.log('no db');
  });  
});


// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
  const fullUrl = e.request.url;
  const domain = new URL(fullUrl).origin;
  const relativePath = fullUrl.replace(domain, '');
  let cache;

  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(fullUrl.startsWith('http:') || fullUrl.startsWith('https:'))) {
      return; 
  }

  e.respondWith((async () => {
    if(fullUrl.endsWith('.mp3') || fullUrl.endsWith('.mp4')) {
      questDB.waitConnected()
      .then(() => {
        questDB.getMedia(relativePath)
        .then((media) => {
          if(media.blob) {
            console.log(`[Service Worker] Fetching from questDB: ${relativePath}`);
            //testVideoSource.src = window.URL.createObjectURL(media.blob);
            return media.blob;
          }
        })
        .catch((error) => {
          //console.error(error);
        });
      }).catch(() => {
        console.log('no db');
      });   
    } else {
      cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(e.request);

      console.log(`[Service Worker] Fetching from cache: ${relativePath}`);

      // Return the cached response if it's available.
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    //No cache => try to fetch from network
    console.log(`[Service Worker] Fetching from network: ${fullUrl}`);
    const response = await fetch(e.request);

    if (response) {
      if(fullUrl.endsWith('.mp3') || fullUrl.endsWith('.mp4')) {
        questDB.waitConnected()
        .then(() => {
          questDB.addMedia(relativePath)
          .then((media) => {
            //Media added
          })
          .catch((error) => {
            //console.error(error);
          });
        }).catch(() => {
          console.log('no db');
        });
      } else {
        cache.put(fullUrl, response.clone());
      }
    }

    return response;      
  })());
});


function checkMedia() {
  APP_MEDIA.forEach(mediaPath => {
    questDB.checkMediaExists(mediaPath)
    .then((exists) => {
      if(exists) {
        console.log(mediaPath + ' exists');
      } else {
        questDB.addMedia(mediaPath)
        .then((message) => {
          console.log(message);
        });
      }
    })
    .catch((error) => {
      console.error(error);
    });
  });  
}