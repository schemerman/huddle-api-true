/**
 * Production build for the HUDDLE web app.
 *
 * Produces a static, installable PWA via Expo's web export (`expo export
 * --platform web`). The output (`dist/`) is a single-page app — index.html plus
 * hashed JS/asset bundles, with everything under `public/` (manifest.json,
 * sw.js, icons) copied to the root. It is served in production by
 * `server/serve.js`.
 *
 * The API base URL is baked into the bundle at build time via
 * `EXPO_PUBLIC_DOMAIN` (read in `app/_layout.tsx`), pointed at the deployment
 * domain so the app reaches the `/api` service through the shared proxy.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

function getDeploymentDomain() {
  const candidate =
    process.env.REPLIT_INTERNAL_APP_DOMAIN ||
    process.env.REPLIT_DEV_DOMAIN ||
    process.env.EXPO_PUBLIC_DOMAIN;

  if (!candidate) {
    console.error(
      "ERROR: No deployment domain found. Set REPLIT_INTERNAL_APP_DOMAIN, REPLIT_DEV_DOMAIN, or EXPO_PUBLIC_DOMAIN",
    );
    process.exit(1);
  }
  return stripProtocol(candidate);
}

/**
 * In SPA (`output: "single"`) mode Expo generates its own index.html and does
 * NOT apply app/+html.tsx, so the static shell ships without the PWA install
 * metadata. Patch it in directly so the manifest, theme color, apple touch
 * icon, and a locked mobile viewport are present in the initial HTML — before
 * any JS runs — which is what mobile browsers use to offer "Add to Home Screen".
 */
function patchIndexHtml() {
  const indexPath = path.join(distDir, "index.html");
  let html = fs.readFileSync(indexPath, "utf-8");

  const lockedViewport =
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" />';
  html = html.replace(
    /<meta name="viewport"[^>]*\/?>/i,
    lockedViewport,
  );

  const headTags = [
    '<link rel="manifest" href="/manifest.json" />',
    '<meta name="theme-color" content="#FFFFFF" />',
    '<link rel="apple-touch-icon" href="/icon-192.png" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="HUDDLE" />',
  ];

  const toInsert = headTags
    .filter((tag) => {
      const marker = tag.match(/(rel|name)="([^"]+)"/);
      return marker ? !html.includes(`${marker[1]}="${marker[2]}"`) : true;
    })
    .join("\n    ");

  if (toInsert) {
    html = html.replace("</head>", `  ${toInsert}\n  </head>`);
  }

  fs.writeFileSync(indexPath, html);
  console.log("Patched dist/index.html with PWA install metadata.");
}

function main() {
  const domain = getDeploymentDomain();
  console.log(`Building HUDDLE web export for https://${domain}`);

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "expo",
      "export",
      "--platform",
      "web",
      "--output-dir",
      "dist",
      "--clear",
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_PUBLIC_DOMAIN: domain,
        EXPO_PUBLIC_REPL_ID: process.env.REPL_ID || "",
      },
    },
  );

  if (result.status !== 0) {
    console.error("Web export failed.");
    process.exit(result.status || 1);
  }

  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    console.error("Web export did not produce dist/index.html.");
    process.exit(1);
  }

  patchIndexHtml();

  console.log("Build complete! Web export written to dist/");
}

main();
