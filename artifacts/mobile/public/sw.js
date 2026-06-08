/**
 * HUDDLE service worker — caches the app shell so mobile browsers recognize
 * the site as an installable PWA and it can open offline.
 *
 * Strategy: only the navigation (app shell) request is intercepted —
 * network-first, caching the shell, and falling back to the cached shell when
 * offline. Asset and API (GET) requests pass straight through to the network so
 * live data (leaderboard, points economy) is never served stale from cache.
 */
const CACHE = "huddle-shell-v1";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle top-level navigations (the app shell). Everything else —
  // static assets and API calls — is left to the browser/network untouched.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put("/", copy))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match("/")),
  );
});
