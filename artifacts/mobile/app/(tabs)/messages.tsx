import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <Feather name="edit" size={20} color={colors.foreground} />
      </View>

      <View style={styles.empty}>
        <Feather name="message-circle" size={40} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Slide into the DMs to start talking trash 1-on-1.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});