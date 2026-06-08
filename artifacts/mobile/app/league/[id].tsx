import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
import { Avatar } from "@/components/Avatar";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";

const MOCK_USERS: Record<string, { username: string; displayName: string; avatarColor: string }> = {
  u1: { username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A" },
  u2: { username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8" },
  u3: { username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8" },
  u4: { username: "ameliavoss", displayName: "Amelia Voss", avatarColor: "#3AE86A" },
  u5: { username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A" },
  u6: { username: "mikeokoro", displayName: "Mike Okoro", avatarColor: "#E83A8C" },
  u7: { username: "priyapatel", displayName: "Priya Patel", avatarColor: "#3AE8D4" },
};

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
  isYou: boolean;
}

export default function LeagueMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, getUserStats } = useData();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);

  const league = leagues.find((l) => l.id === id);

  const openProfile = (m: Member) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileUser({
      userId: m.id,
      username: m.username,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      points: m.points,
      winRate: m.winRate,
    });
  };

  if (!league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Huddle not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const members: Member[] = league.memberIds.map((uid) => {
    if (uid === user?.id || uid === "me") {
      return {
        id: uid,
        username: user?.username || "me",
        displayName: user?.displayName || "You",
        avatarColor: user?.avatarColor || "#000000",
        points: user?.points ?? 0,
        winRate: user?.winRate ?? 0,
        isYou: true,
      };
    }
    const stats = getUserStats(uid);
    const mock = MOCK_USERS[uid];
    const base = mock ?? { username: uid, displayName: uid, avatarColor: "#8A8A8A" };
    return {
      id: uid,
      ...base,
      points: stats?.points ?? 0,
      winRate: stats?.winRate ?? 0,
      isYou: false,
    };
  });

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.leagueName, { color: colors.foreground }]} numberOfLines={1}>
            {league.name}
          </Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {league.memberIds.length} {league.memberIds.length === 1 ? "member" : "members"}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <FlatList<Member>
        data={sortedMembers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24),
        }}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MEMBERS</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openProfile(item)}
            style={({ pressed }) => [
              styles.memberRow,
              { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Avatar color={item.avatarColor} username={item.username} size={44} />
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                {item.displayName}
                {item.isYou ? " (you)" : ""}
              </Text>
              <Text style={[styles.memberHandle, { color: colors.mutedForeground }]} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
            <View style={styles.memberRight}>
              <Text style={[styles.memberPoints, { color: colors.foreground }]}>
                {item.points.toLocaleString()}
              </Text>
              <Text style={[styles.memberPointsLabel, { color: colors.mutedForeground }]}>pts</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  leagueName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  memberCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  memberHandle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 1,
  },
  memberRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  memberPoints: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  memberPointsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
});
