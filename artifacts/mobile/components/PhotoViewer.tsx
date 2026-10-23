import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Platform, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full-screen photo, like WhatsApp: black background, the whole photo fitted to the screen, ✕ to close.
// Tapping anywhere or the phone's back button also closes it.
export function PhotoViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {uri ? <StatusBar barStyle="light-content" /> : null}
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close photo" />
        {uri ? (
          <View style={styles.photo} pointerEvents="none">
            <Image source={{ uri }} style={styles.photo} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          style={({ pressed }) => [styles.close, { top: (Platform.OS === "web" ? 16 : insets.top) + 8, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", height: "100%" },
  close: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
