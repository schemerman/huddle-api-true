import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "./Avatar";
import type { LeaderboardEntry } from "@/context/DataContext";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        isCurrentUser && { backgroundColor: colors.muted },
      ]}
    >
      <Text style={[styles.rank, { color: entry.rank <= 3 ? colors.foreground : colors.mutedForeground }]}>
        {entry.rank <= 3 ? ["1st", "2nd", "3rd"][entry.rank - 1] : `${entry.rank}th`}
      </Text>
      <Avatar color={entry.avatarColor} username={entry.username} size={36} />
      <View style={styles.info}>
        <Text style={[styles.displayName, { color: colors.foreground }]}>
          {entry.displayName}
          {isCurrentUser ? " (you)" : ""}
        </Text>
        <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{entry.username}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.points, { color: colors.foreground }]}>{entry.points.toLocaleString()}</Text>
        <Text style={[styles.winRate, { color: colors.mutedForeground }]}>{entry.winRate}% win</Text>
      </View>
    </View>
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
  info: {
    flex: 1,
  },
  displayName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  handle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  stats: {
    alignItems: "flex-end",
  },
  points: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  winRate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
});
