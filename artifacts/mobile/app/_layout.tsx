import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { API_BASE_URL } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AddToHomeScreenBanner } from "@/components/AddToHomeScreenBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";

setBaseUrl(API_BASE_URL);
// Every API request carries the signed-in user's token; the server checks it matches the account being changed.
setAuthTokenGetter(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);

// The API server sleeps when idle and takes up to a minute to wake. Nudge it as soon as the app
// opens, so it is awake by the time someone places a pick or joins a huddle.
fetch(`${API_BASE_URL}/api/healthz`).catch(() => {});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Lock the web page to a native-feeling mobile layout: device-width viewport
 * with zoom/scaling disabled, no overscroll bounce, and no accidental text
 * selection. Runs at runtime so it applies in both the SPA dev server and
 * production export (where `+html.tsx` covers static rendering).
 */
function lockMobileViewport(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content =
    "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover";

  if (!document.getElementById("huddle-native-feel")) {
    const style = document.createElement("style");
    style.id = "huddle-native-feel";
    style.innerHTML = `
      html, body, #root { height: 100%; margin: 0; padding: 0; background-color: #FFFFFF; }
      body {
        overflow: hidden;
        overscroll-behavior: none;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      * { -webkit-user-select: none; user-select: none; }
      input, textarea, [contenteditable="true"] { -webkit-user-select: text; user-select: text; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Wire up the Progressive Web App on web: link the manifest, set the theme
 * color and apple-touch-icon, and register the shell service worker so mobile
 * browsers treat the site as installable. No-ops on native and is resilient to
 * sandboxed contexts (registration failures are swallowed).
 */
function setupPwa(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const head = document.head;
  const ensure = <T extends HTMLElement>(
    selector: string,
    create: () => T,
  ): T => {
    const found = head.querySelector<T>(selector);
    if (found) return found;
    const el = create();
    head.appendChild(el);
    return el;
  };

  const manifest = ensure<HTMLLinkElement>('link[rel="manifest"]', () => {
    const l = document.createElement("link");
    l.rel = "manifest";
    return l;
  });
  manifest.href = "/manifest.json";

  const themeColor = ensure<HTMLMetaElement>('meta[name="theme-color"]', () => {
    const m = document.createElement("meta");
    m.name = "theme-color";
    return m;
  });
  themeColor.content = "#FFFFFF";

  const appleIcon = ensure<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]',
    () => {
      const l = document.createElement("link");
      l.rel = "apple-touch-icon";
      return l;
    },
  );
  appleIcon.href = "/icon-192.png";

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="league/[id]" />
      <Stack.Screen name="post/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      // Website: hide the HUDDLE loading screen from public/index.html now the app is drawing itself.
      // It's hidden, not removed, so public/index.html can bring it back with a reload button if the screen
      // then stays empty (a crash) instead of leaving a blank white page.
      if (typeof document !== "undefined") {
        const splash = document.getElementById("boot-splash");
        if (splash) splash.style.display = "none";
        (window as any).__huddleStarted = Date.now();
      }
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    lockMobileViewport();
    setupPwa();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DataProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
                <AddToHomeScreenBanner />
              </GestureHandlerRootView>
            </DataProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
