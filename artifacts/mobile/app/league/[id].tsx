import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { supabase } from "@/lib/supabase";

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
  // We grab the full leaderboard here so we have access to everyone's real names and stats
  const { leagues, leaderboard } = useData(); 
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

  // THE ADMIN FIX BUTTON
  // This physically updates your phone's deep auth cache so it stops overwriting the database
  const handleAdminFix = async () => {
    if (!user?.id) return;
    try {
      // 1. Force update the local Auth Cache
      await supabase.auth.updateUser({ data: { username: "ceo", displayName: "ceo" } });
      // 2. Force update the live Database
      await supabase.from("users").update({ username: "ceo", display_name: "ceo" }).eq("id", user.id);
      
      Alert.alert("System Override Complete", "Your name is permanently locked as 'ceo'. Please completely close the app and reopen it to clear the memory.");
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    }
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
    // Find the real data from our bulletproof leaderboard
    const globalData = leaderboard.find((l) => l.userId === uid);

    if (uid === user?.id || uid === "me") {
      return {
        id: uid,
        username: globalData?.username || "ceo",
        displayName: globalData?.displayName || "ceo",
        avatarColor: globalData?.avatarColor || user?.avatarColor || "#000000",
        points: globalData?.points ?? user?.points ?? 0,
        winRate: globalData?.winRate ?? user?.winRate ?? 0,
        isYou: true,
      };
    }
    
    return {
      id: uid,
      username: globalData?.username || "Player",
      displayName: globalData?.displayName || "Player",
      avatarColor: globalData?.avatarColor || "#8A8A8A",
      points: globalData?.points ?? 0,
      winRate: globalData?.winRate ?? 0,
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
              <View style={styles.pointsContainer}>
                <Text style={[styles.memberPoints, { color: colors.foreground }]}>
                  {item.points.toLocaleString()}
                </Text>
                <Text style={[styles.memberPointsLabel, { color: colors.mutedForeground }]}>pts</Text>
              </View>
              {/* NEW WIN RATE TEXT */}
              <Text style={[styles.memberWinRate, { color: colors.mutedForeground }]}>
                {item.winRate}% win
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable 
            onPress={handleAdminFix} 
            style={{ margin: 20, padding: 15, backgroundColor: "#E8533A", borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>[ADMIN] FORCE SYNC USERNAME</Text>
          </Pressable>
        }
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
    alignItems: "flex-end",
    marginRight: 4,
    gap: 2,
  },
  pointsContainer: {
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
  memberWinRate: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});