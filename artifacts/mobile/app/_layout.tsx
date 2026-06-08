import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

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
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    lockMobileViewport();
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
              </GestureHandlerRootView>
            </DataProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
