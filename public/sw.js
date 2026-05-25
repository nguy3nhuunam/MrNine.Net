// MrNine service worker — offline shell only.
// Cache strategy:
//   - Pre-cache the home shell so first paint works offline.
//   - Network-first for HTML routes, fall back to cached shell.
//   - Cache-first for /_next/static/* assets keyed by URL.
//   - Pass through /api/* (never cache personal data).

const CACHE_VERSION = "mrnine-v1";
const SHELL_URL = "/";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(SHELL_URL).catch(() => null)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API calls, auth, or websockets.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/voice-studio-runtime/") ||
    url.pathname.startsWith("/inkos-studio/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/api/v1/")
  ) {
    return;
  }

  // Cache-first for static next assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      }),
    );
    return;
  }

  // Network-first for HTML / page routes.
  if (request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, response.clone()).catch(() => null);
          return response;
        } catch {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const shell = await cache.match(SHELL_URL);
          return shell || Response.error();
        }
      })(),
    );
  }
});
