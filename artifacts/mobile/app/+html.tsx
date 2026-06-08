import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Web-only root HTML document. Runs in Node during static rendering and shapes
 * the index shell for the SPA. We lock the viewport to a native-feeling mobile
 * layout: device width, no user zoom/scaling, and safe-area aware.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: nativeFeelStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const nativeFeelStyle = `
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #FFFFFF;
}
body {
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
* {
  -webkit-user-select: none;
  user-select: none;
}
input, textarea, [contenteditable="true"] {
  -webkit-user-select: text;
  user-select: text;
}
`;
