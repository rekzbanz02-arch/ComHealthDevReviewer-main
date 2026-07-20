// ============================================================================
// Service Worker — Community Health and Development Reviewer
// Bumping CACHE_NAME (e.g. "chd-reviewer-v2") forces clients to fetch fresh
// files next time they load, since old caches are deleted on activate.
// ============================================================================
const CACHE_NAME = "chd-reviewer-v1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => (name !== CACHE_NAME ? caches.delete(name) : null))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for the API (Apps Script) so data is always fresh;
// cache-first for the app shell so it loads instantly and works offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isApiCall = url.hostname.includes("script.google.com");

  if (isApiCall) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ status: "error", message: "You are offline. Please reconnect and try again." }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
