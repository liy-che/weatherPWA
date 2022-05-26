let cacheName = "weatherPWA";
let dataCacheName = "weatherData";
let filesToCache = [
    '/',
    '/index.html',
    '/scripts/app.js',
    '/scripts/localforage.js',
    '/styles/ud811.css',
    '/images/ic_refresh_white_24px.svg',
    '/images/ic_add_white_24px.svg',
    '/images/01d@2x.png',
    '/images/01n@2x.png',
    '/images/02d@2x.png',
    '/images/02n@2x.png',
    '/images/03d@2x.png',
    '/images/03n@2x.png',
    '/images/04d@2x.png',
    '/images/04n@2x.png',
    '/images/09d@2x.png',
    '/images/09n@2x.png',
    '/images/10d@2x.png',
    '/images/10n@2x.png',
    '/images/11d@2x.png',
    '/images/11n@2x.png',
    '/images/13d@2x.png',
    '/images/13n@2x.png',
    '/images/50d@2x.png',
    '/images/50n@2x.png'
];
let weatherAPIUrlBase = 'https://api.openweathermap.org/data/2.5/';

// Updates caches on the installation of the service worker
self.addEventListener("install", function(e) {
    console.log("[ServiceWorker] Install");
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log("[ServiceWorker] Caching app shell");
            return cache.addAll(filesToCache);
        })
    );
});

// Updates app shell resources on cache by deleting old cache
self.addEventListener("activate", function(e) {
    console.log("[ServiceWorker] Activate");
    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                if (key !== cacheName && key !== dataCacheName) {
                    console.log("[ServiceWorker] Removing old cache", key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Gets app shell from cache
self.addEventListener("fetch", function(e) {
    console.log("[ServiceWorker] Fetch", e.request.url);
    if (e.request.url.startsWith(weatherAPIUrlBase)) {
        e.respondWith(
            fetch(e.request)
            .then(function(response) {
                return caches.open(dataCacheName).then(function(cache) {
                    cache.put(e.request.url, response.clone());
                    console.log("[ServiceWorker] Fetched & Cached data", e.request.url);
                    return response;
                });
            })
        );
    } else {
        e.respondWith(
            caches.match(e.request).then(function(response) {
                return response || fetch(e.request);
            })
        );
    }
});