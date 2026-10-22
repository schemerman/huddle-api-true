/**
 * HUDDLE service worker. Lets the home-screen app open quickly and never to a blank screen.
 *
 * - The start page ("/"): fetched fresh, but if the network takes longer than 4 seconds the saved copy
 *   opens instead (and the fresh one is saved for next time).
 * - The app's code and asset files (/_expo/static/, /assets/): their names change with every update, so a
 *   saved copy is always correct. They're kept, so an older start page can always find its files.
 * - Everything else (data, API, Supabase) goes straight to the network, so nothing live is ever stale.
 */
const CACHE = "huddle-v2";
const SHELL = "/";
const NETWORK_WAIT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(SHELL)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAppFile = (url) =>
  url.origin === self.location.origin && (url.pathname.startsWith("/_expo/static/") || url.pathname.startsWith("/assets/"));

// After a new start page is saved, drop code files only the old versions used.
async function pruneOldCode(shellResponse) {
  try {
    const html = await shellResponse.text();
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys.map((req) => {
        const path = new URL(req.url).pathname;
        return path.startsWith("/_expo/static/") && !html.includes(path) ? cache.delete(req) : null;
      }),
    );
  } catch (e) {}
}

async function saveShell(response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(SHELL, response.clone());
  await pruneOldCode(response.clone());
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isAppFile(url)) {
    event.respondWith(
      caches.match(request).then(
        (saved) =>
          saved ||
          fetch(request).then((response) => {
            // Only keep real files; a missing file must never be saved as something else.
            const type = response.headers.get("content-type") || "";
            if (response.ok && !type.includes("text/html")) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode !== "navigate") return;

  const fresh = fetch(request);
  event.waitUntil(fresh.then(saveShell).catch(() => {}));
  event.respondWith(
    new Promise((resolve) => {
      let done = false;
      const finish = (response) => {
        if (!done && response) {
          done = true;
          resolve(response);
        }
      };
      const useSaved = () => caches.match(SHELL).then((saved) => (saved ? finish(saved) : null));
      // Slow network: open the saved copy after 4 seconds.
      const timer = setTimeout(useSaved, NETWORK_WAIT_MS);
      fresh
        .then((response) => {
          clearTimeout(timer);
          finish(response);
        })
        .catch(() => {
          clearTimeout(timer);
          // Offline: the saved copy, or an honest offline message if there isn't one yet.
          caches.match(SHELL).then((saved) =>
            finish(saved || new Response("You're offline. Connect to the internet and try again.", { status: 503, headers: { "content-type": "text/plain" } })),
          );
        });
    }),
  );
});
