---
name: Metro stale resolution after codegen
description: Why Expo/Metro throws "Unable to resolve ./generated/api" after orval codegen, and how to actually clear it.
---

When orval codegen runs (`pnpm --filter @workspace/api-spec run codegen`), it logs
"Cleaning output folder" — it DELETES and recreates the generated dirs in
`lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`. If the
Expo/Metro dev server is running during this, its module-resolution cache holds a
stale "file not found" for those paths, and the bundle fails with
`Unable to resolve "./generated/api" from "lib/api-client-react/src/index.ts"`
even though the files clearly exist and `tsc` resolves them fine.

**Why:** Metro persists its haste/file map and transform cache outside the
workspace, and a plain `restart_workflow` does NOT clear it. A single restart, or
clearing only `node_modules/.cache`, is not enough — the symptom is an *identical*
"Web Bundled <same ms>" line on every restart, proving Metro is serving a cached
bundle rather than re-bundling.

**How to apply:** After any codegen that regenerates files an Expo app imports,
clear ALL of these before restarting the `mobile` workflow:
`/tmp/metro-cache`, `/tmp/metro-file-map-*`, `/tmp/haste-map-*`, root
`node_modules/.cache`, `artifacts/mobile/node_modules/.cache`,
`artifacts/mobile/.expo`, `/home/runner/.expo`. (Note the haste/file-map is named
`/tmp/metro-file-map-*` and the `.expo` dirs PERSIST across restarts — a `metro-*`-only
glob misses them.) Then restart and verify with an app_preview screenshot.

**The "artifact crashed" banner can outlive the fix.** Once this resolution error
is logged ONCE as a browser-console `unhandlederror`, Replit's crash detector keeps
re-surfacing the templated "The HUDDLE artifact crashed with a runtime error"
message on subsequent turns even after the app is fully clean. Do NOT interpret a
repeat of that message as the fix having failed. Verify ground truth instead:
(1) latest `/tmp/logs/artifactsmobile_expo_*.log` shows `Web Bundled` with no
"Unable to resolve", (2) `rg unhandlederror /tmp/logs/browser_console_*.log` returns
nothing, (3) app_preview screenshot renders. If all three pass, the app is healthy
and the banner is stale — the user must hard-refresh/dismiss the preview to clear it.
Endless cache-clear/restart loops are NOT the answer once those three checks pass.
