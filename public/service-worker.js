/* AsaanDoc Service Worker */
const CACHE_NAME = "asaandoc-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/logo.png",
  "/dr-javaid.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // Network first for API calls
  if (event.request.url.includes("firebase") || event.request.url.includes("firestore")) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

