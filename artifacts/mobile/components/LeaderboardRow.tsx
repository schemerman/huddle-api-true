import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import palette from "@/constants/colors";
import { performanceTitle } from "@/utils/performance";
import { Avatar } from "./Avatar";
import type { LeaderboardEntry } from "@/context/DataContext";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  highlight?: boolean;
  isBankrupt?: boolean;
  onAvatarPress?: () => void;
  onPress?: () => void;
}

export function LeaderboardRow({ entry, isCurrentUser, highlight, isBankrupt, onAvatarPress, onPress }: LeaderboardRowProps) {
  const colors = useColors();

  const rankLabel =
    entry.rank <= 3 ? ["1st", "2nd", "3rd"][entry.rank - 1] : `${entry.rank}th`;
  const title = performanceTitle(entry.winRate);

  return (
    <Pressable
      onPress={onPress ?? onAvatarPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        isCurrentUser && { backgroundColor: colors.muted },
        pressed && onPress ? { opacity: 0.85 } : {},
      ]}
    >
      <Text
        style={[
          styles.rank,
          { color: entry.rank <= 3 ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {rankLabel}
      </Text>
      <Avatar
        color={entry.avatarColor}
        username={entry.username}
        size={36}
        onPress={onAvatarPress}
        highlight={highlight}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {entry.displayName}
            {isCurrentUser ? " (you)" : ""}
          </Text>
          {isBankrupt && (
            <Text style={[styles.bankruptTag, { color: palette.light.crimson }]}>BANKRUPT</Text>
          )}
        </View>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>{title}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.points, { color: colors.foreground }]}>
          {entry.points.toLocaleString()}
        </Text>
        <Text style={[styles.winRate, { color: colors.mutedForeground }]}>{entry.winRate}% win</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  rank: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    width: 32,
    textAlign: "center",
  },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  displayName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  bankruptTag: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  stats: { alignItems: "flex-end" },
  points: { fontFamily: "Inter_700Bold", fontSize: 15 },
  winRate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
});
