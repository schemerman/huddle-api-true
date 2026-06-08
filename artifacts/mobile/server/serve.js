/**
 * Production static server for the HUDDLE web app (PWA).
 *
 * Serves the Expo web export (`dist/`) as a single-page app:
 * - Real files (hashed JS/CSS/assets, manifest.json, sw.js, icons) are served
 *   directly with appropriate cache headers.
 * - Any other path falls back to `index.html` so client-side routing works on
 *   deep links and refreshes.
 * - `/status` returns 200 for the platform reachability check.
 *
 * The service worker and HTML shell are served no-cache so PWA updates roll out
 * immediately; content-hashed bundles are cached aggressively.
 *
 * Zero external dependencies — Node.js built-ins only (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_ROOT = path.resolve(__dirname, "..", "dist");
const INDEX_HTML = path.join(DIST_ROOT, "index.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const port = parseInt(process.env.PORT || "3000", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

// Files that must never be cached so PWA / shell updates take effect at once.
const NO_CACHE_FILES = new Set(["sw.js", "manifest.json", "index.html"]);

function cacheControlFor(relPath) {
  const base = path.basename(relPath);
  if (NO_CACHE_FILES.has(base)) {
    return "no-cache, no-store, must-revalidate";
  }
  // Content-hashed bundles/assets are safe to cache for a long time.
  if (relPath.includes("/_expo/") || relPath.includes("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function sendFile(res, filePath, relPath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": cacheControlFor(relPath),
  });
  res.end(content);
}

function sendIndex(res) {
  if (!fs.existsSync(INDEX_HTML)) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Build missing: dist/index.html not found.");
    return;
  }
  const content = fs.readFileSync(INDEX_HTML);
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache, no-store, must-revalidate",
  });
  res.end(content);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url || "/", `http://${req.headers.host}`).pathname,
    );
  } catch {
    pathname = "/";
  }

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/status") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  const relPath = pathname.replace(/^\/+/, "");
  const candidate = path.normalize(path.join(DIST_ROOT, relPath));

  // Prevent path traversal outside the export directory.
  if (
    candidate !== DIST_ROOT &&
    !candidate.startsWith(DIST_ROOT + path.sep)
  ) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  if (
    relPath &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    sendFile(res, candidate, pathname);
    return;
  }

  // SPA fallback — let client-side routing handle the path.
  sendIndex(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving HUDDLE web app (PWA) on port ${port}`);
});
