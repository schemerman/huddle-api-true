import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import type { LeaderboardEntry } from "@/context/DataContext";

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leaderboard, leagues, getLeagueLeaderboard } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<"global" | string>("global");
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const activeLeague = leagues.find((l) => l.id === tab) ?? null;
  const displayData: LeaderboardEntry[] =
    tab === "global"
      ? leaderboard
      : activeLeague
      ? getLeagueLeaderboard(activeLeague)
      : [];

  const openProfile = (entry: LeaderboardEntry) => {
    if (entry.userId === user?.id) return;
    setProfileUser({
      userId: entry.userId,
      username: entry.username,
      displayName: entry.displayName,
      avatarColor: entry.avatarColor,
      points: entry.points,
      winRate: entry.winRate,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Leaderboard</Text>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setTab("global")}
          style={[
            styles.tabBtn,
            tab === "global" && { borderBottomColor: colors.foreground, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: tab === "global" ? colors.foreground : colors.mutedForeground },
            ]}
          >
            Global
          </Text>
        </Pressable>
        {leagues.map((league) => (
          <Pressable
            key={league.id}
            onPress={() => setTab(league.id)}
            style={[
              styles.tabBtn,
              tab === league.id && { borderBottomColor: colors.foreground, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: tab === league.id ? colors.foreground : colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              {league.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList<LeaderboardEntry>
        data={displayData}
        keyExtractor={(item) => item.userId + tab}
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            isCurrentUser={item.userId === user?.id}
            highlight={item.userId === user?.id && (user?.currentStreak ?? 0) >= 3}
            isBankrupt={item.userId === user?.id && !!user?.isBankrupt}
            onAvatarPress={() => openProfile(item)}
            onPress={() => openProfile(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No data yet for this league.
            </Text>
          </View>
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
        showsVerticalScrollIndicator={false}
      />

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
