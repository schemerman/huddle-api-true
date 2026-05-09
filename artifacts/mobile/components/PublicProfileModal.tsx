import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "./Avatar";

export interface PublicProfileUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
}

interface Props {
  user: PublicProfileUser | null;
  onClose: () => void;
}

export function PublicProfileModal({ user, onClose }: Props) {
  const colors = useColors();

  return (
    <Modal
      visible={!!user}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.avatarWrap}>
            <Avatar
              color={user?.avatarColor ?? "#000"}
              username={user?.username ?? ""}
              size={80}
            />
          </View>

          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {user?.displayName}
          </Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{user?.username}
          </Text>

          <View
            style={[
              styles.statsRow,
              { borderTopColor: colors.border, borderBottomColor: colors.border },
            ]}
          >
            <View
              style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {user?.points.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {user?.winRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Win Rate</Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  avatarWrap: {
    marginBottom: 16,
  },
  displayName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  username: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    width: "100%",
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.8,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  closeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
