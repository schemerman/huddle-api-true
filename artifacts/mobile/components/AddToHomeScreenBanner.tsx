import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DISMISS_KEY = "huddle_a2hs_dismissed";

/**
 * Whether the install hint is relevant: web only, on a mobile browser, and not
 * already running as an installed standalone PWA.
 */
function canShowBanner(): boolean {
  if (Platform.OS !== "web") return false;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const standalone =
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    // iOS Safari exposes navigator.standalone when launched from home screen
    (navigator as { standalone?: boolean }).standalone === true;
  return isMobile && !standalone;
}

export function AddToHomeScreenBanner() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    let active = true;
    if (!canShowBanner()) return;
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => {
        if (active && v !== "true") setVisible(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(translateY, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const dismiss = () => {
    AsyncStorage.setItem(DISMISS_KEY, "true").catch(() => {});
    Animated.timing(translateY, {
      toValue: 200,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 12,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        <Feather name="share" size={20} color="#000000" style={styles.shareIcon} />
        <Text style={styles.text}>
          For the best experience, tap the Share icon and select &apos;Add to Home
          Screen&apos;.
        </Text>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Feather name="x" size={18} color="#000000" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  shareIcon: { marginTop: 1 },
  text: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: "#000000",
  },
  close: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
