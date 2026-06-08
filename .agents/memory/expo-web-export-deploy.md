---
name: Expo web export deployment (HUDDLE mobile artifact)
description: How the Expo "mobile" artifact is deployed as a static web SPA/PWA instead of native Expo Go, and the non-obvious gotchas.
---

# Expo mobile artifact deployed as a web SPA/PWA

The `artifacts/mobile` (HUDDLE) artifact serves a **pure web export** in production, not native Expo Go.

**Why:** the product is a web-first PWA MVP; the live URL must serve the web UI directly and offer "Add to Home Screen". Native wrappers were dropped.

**How it works (no artifact.toml schema change needed):**
- Production deploy in this monorepo is driven by each artifact's `[services.production]` build/run in `.replit-artifact/artifact.toml` under `.replit` `router="application"` + `deploymentTarget="autoscale"`. This is NOT Expo Launch (iOS App Store) — that only applies to standalone native Expo repls. So a `kind="mobile"` / `router="expo-domain"` artifact can serve a static web build in prod as long as traffic routes to its `serve` process. Leaving kind/router as-is is fine; changing them is optional cleanup.
- `scripts/build.js` runs `expo export --platform web --output-dir dist --clear`. Requires `web.bundler="metro"` + `web.output="single"` (SPA) in `app.json`.
- `server/serve.js` is a zero-dep static file server for `dist/` with SPA fallback to `index.html`, `/status`→200 for reachability, BASE_PATH stripping, path-traversal guard, and cache headers (no-cache for `index.html`/`sw.js`/`manifest.json`; immutable long-cache for `/_expo` + `/assets`).
- Dev is unchanged — still `expo start` (Metro web dev server).

**Gotchas (non-obvious):**
- `output: "single"` makes Expo generate its OWN `index.html` and **ignore `app/+html.tsx`**. So any PWA install metadata (manifest link, theme-color, apple-touch-icon, locked viewport) must be **patched into `dist/index.html` as a post-export step** in build.js — `+html.tsx` only applies to `output: "static"`.
- `public/` contents (manifest.json, sw.js, icon-192/512.png) ARE auto-copied to `dist/` root by `expo export`.
- API base URL: `app/_layout.tsx` calls `setBaseUrl(https://${EXPO_PUBLIC_DOMAIN})`; build.js bakes `EXPO_PUBLIC_DOMAIN` = deployment domain (REPLIT_INTERNAL_APP_DOMAIN > REPLIT_DEV_DOMAIN > EXPO_PUBLIC_DOMAIN) so prod calls resolve same-origin to `/api` via the shared proxy.
