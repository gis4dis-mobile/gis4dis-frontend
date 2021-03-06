const PRECACHE = 'precache-v6';
const RUNTIME = 'runtime';
const TILES = 'tiles';

PRECACHE_URLS = [
	"index.html",
	"./",
	"templates/account.html",
	"templates/login.html",
	"templates/modalHint.html",
	"templates/observation.html",
	"templates/registration.html",
	"templates/resetPassword.html",
	"js/script.js",
	"node_modules/materialize-css/dist/css/materialize.min.css",
	"node_modules/leaflet/dist/leaflet.css",
	"node_modules/jquery/dist/jquery.min.js",
	"node_modules/materialize-css/dist/js/materialize.min.js",
	"node_modules/leaflet/dist/leaflet.js",
  "node_modules/material-design-icons/iconfont/material-icons.css",
  "node_modules/material-design-icons/iconfont/MaterialIcons-Regular.eot",
  "node_modules/material-design-icons/iconfont/MaterialIcons-Regular.woff2",
  "node_modules/material-design-icons/iconfont/MaterialIcons-Regular.woff",
  "node_modules/material-design-icons/iconfont/MaterialIcons-Regular.ttf",
	"css/style.css",
	"img/launcher-icon-1x.png",
	"img/launcher-icon-2x.png",
	"img/launcher-icon-4x.png",
	"img/ms-icon-144x144.png",
];

self.addEventListener('install', event => {
  event.waitUntil(
     caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME, TILES];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
    .then(() => console.log(`Hello from the new service worker with ${PRECACHE}`))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method === "GET" && (event.request.url.startsWith(self.location.origin) || event.request.url.startsWith("https://zelda.sci.muni.cz"))) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  } else if (/(https:\/\/[a-c](.tile.openstreetmap.org|.osm.rrze.fau.de\/osmhd))/.test(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(TILES).then(cache => {
          return fetch(event.request).then(response => {
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});