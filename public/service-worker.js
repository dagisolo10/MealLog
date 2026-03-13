const CACHE_NAME = "meal-log-v2.2";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith("http")) return;
    if (event.request.url.includes("chrome-extension")) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request)
                .then((response) => {
                    const clone = response.clone();

                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));

                    return response;
                })
                .catch(() => caches.match("/"));
        }),
    );
});
