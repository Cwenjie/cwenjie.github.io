importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

// Detailed logging is very useful during development
// workbox.setConfig({debug: true});

// Updating SW lifecycle to update the app after user triggered refresh
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// set cache name
workbox.core.setCacheNameDetails({
    prefix: 'purple_mystic',
    suffix: 'v1',
    precache: 'precache',
    runtime: 'runtime'
});

const pre_cache_name = 'purple_mystic-precache-v1';

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installed.");
    self.skipWaiting();
});

self.addEventListener("activate", async (event) => {
    console.log("[Service Worker] Activated.");
    const cacheKeys = await caches.keys();
    cacheKeys.forEach(cacheKey => {
        if (cacheKey !== pre_cache_name) {
            caches.delete(cacheKey);
        }
    });
    return self.clients.claim();
});

self.addEventListener('fetch', function (event) {

    // Fix the following error:
    // Uncaught (in promise) TypeError: Failed to execute 'fetch' on 'WorkerGlobalScope': 'only-if-cached' can be set only with 'same-origin' mode
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        console.log('Fetching operation throws a exception: ', event);
        return;
    }

    if (event.request.method !== 'GET') {
        /* If we don't block the event as shown below, then the request will go to
           the network as usual.
        */
        console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
        return;
    }

    // if range, to handle partial content, whose status code is 206
    if (event.request.headers.get('range')) {
        let pos =
            Number(/^bytes=(\d+)-$/g.exec(event.request.headers.get('range'))[1]);

        console.log('Range request for', event.request.url,
            ', starting position:', pos);

        event.respondWith(
            caches.open(pre_cache_name)
                .then(cache => {
                    return cache.match(event.request.url);
                }).then(async res => {
                if (!res) {
                    const res_1 = await fetch(event.request);
                    return res_1.arrayBuffer();
                }
                return res.arrayBuffer();
            }).then((ab) => {
                return new Response(
                    ab.slice(pos),
                    {
                        status: 206,
                        statusText: 'Partial Content',
                        headers: [
                            // ['Content-Type', 'video/webm'],
                            ['Content-Range', 'bytes ' + pos + '-' +
                            (ab.byteLength - 1) + '/' + ab.byteLength]]
                    });
            }));
    } else {
        // console.log('Non-range request for', event.request.url);
        event.respondWith(
            // caches.match() will look for a cache entry in all of the caches available to the service worker.
            // It's an alternative to first opening a specific named cache and then matching on that.
            caches.match(event.request).then(response => {
                // event.request will always have the proper mode set ('cors, 'no-cors', etc.) so we don't
                // have to hardcode 'no-cors' like we do when fetch()ing in the install handler.
                return response || fetch(event.request).then(response => {
                    return caches.open(pre_cache_name).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                }).catch(error => {
                    // This catch() will handle exceptions thrown from the fetch() operation.
                    // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
                    // It will return a normal response object that has the appropriate error code set.
                    console.error('Fetching failed:', error);
                    throw error;
                });
            })
        );
    }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox.precaching.precacheAndRoute([
  {
    "url": "404.html",
    "revision": "653b6c73a95a0c326c514f38abad1334"
  },
  {
    "url": "app.js",
    "revision": "ca8d3419954c12129d126ae400f23115"
  },
  {
    "url": "index.css",
    "revision": "6077ac896abf46ddc7b63e38a313d939"
  },
  {
    "url": "index.html",
    "revision": "47b86dd31d739f2feba5ee526434bfef"
  }
]);

workbox.routing.registerRoute(
    // Match common image extensions.
    new RegExp(".+\\.(?:png|gif|jpg|jpeg|ico|svg)"),
    // Use a cache-first strategy with the following config:
    new workbox.strategies.CacheFirst({
        // You need to provide a cache name when using expiration.
        cacheName: "images",
        plugins: [
            new workbox.expiration.Plugin({
                // Keep at most 50 entries.
                maxEntries: 50,
                // Don't keep any entries for more than 30 days.
                maxAgeSeconds: 30 * 24 * 60 * 60,
                // Automatically cleanup if quota is exceeded.
                purgeOnQuotaError: true,
            })
        ]
    })
);

workbox.routing.registerRoute(
    /.+\.(?:js|css)$/,
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'static'
    })
);


