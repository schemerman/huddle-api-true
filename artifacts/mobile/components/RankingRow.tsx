import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import type { LeaderboardEntry } from "@/context/DataContext";
import { getRank, getRankSuffix } from "@/utils/ranks";

// One leaderboard row: rank, avatar, name, @handle with badge, points and win rate.
// Used by Global Rankings and by each huddle's leaderboard so they look the same.
export function RankingRow({
  entry,
  position,
  isMe,
  onPress,
}: {
  entry: LeaderboardEntry;
  position: number;
  isMe: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.memberRow, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.rankCol}>
        <Text style={[styles.rankText, { color: colors.foreground }]}>{getRankSuffix(position)}</Text>
      </View>
      <Avatar color={entry.avatarColor} username={entry.username} size={40} />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
          {entry.displayName}
          {isMe ? " (you)" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={[styles.memberHandle, { color: colors.mutedForeground, marginTop: 0 }]} numberOfLines={1}>
            @{entry.username}
          </Text>
          <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(entry.winRate)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.memberRight}>
        <View style={styles.pointsContainer}>
          <Text style={[styles.memberPoints, { color: colors.foreground }]}>{entry.points.toLocaleString()}</Text>
          <Text style={[styles.memberPointsLabel, { color: colors.mutedForeground }]}>pts</Text>
        </View>
        <Text style={[styles.memberWinRate, { color: colors.mutedForeground }]}>{entry.winRate}% win</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  rankCol: { width: 32, alignItems: "center" },
  rankText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: -0.2 },
  memberHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  rankBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  memberRight: { alignItems: "flex-end", marginRight: 4, gap: 2 },
  pointsContainer: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  memberPoints: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: -0.3 },
  memberPointsLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  memberWinRate: { fontFamily: "Inter_500Medium", fontSize: 11 },
});
