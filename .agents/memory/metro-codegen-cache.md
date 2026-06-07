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
`/tmp/metro-cache`, `/tmp/haste-map-*`, root `node_modules/.cache`,
`artifacts/mobile/node_modules/.cache`, `artifacts/mobile/.expo`, `/home/runner/.expo`.
Optionally `touch` the regenerated files to bump mtimes. Then restart and verify
with an app_preview screenshot (not just logs, which can show stale snapshot lines).
