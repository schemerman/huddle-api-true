import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { HuddleButton } from "@/components/HuddleButton";
import { Avatar } from "@/components/Avatar";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import type { League } from "@/context/DataContext";

// FALLBACK ADDED: Defaults to 5 to avoid the "Rookie" trap if backend is slow
export const getRank = (winRate: number, totalPicks: number = 5) => {
  if (totalPicks < 5) return "Rookie";
  if (winRate >= 95 && totalPicks >= 30) return "Oracle";
  if (winRate >= 85 && totalPicks >= 25) return "GOAT";
  if (winRate >= 70 && totalPicks >= 15) return "Champion";
  if (winRate >= 60 && totalPicks >= 10) return "All Star";
  if (winRate >= 50) return "Starter";
  if (winRate >= 35) return "Coin Flipper";
  if (winRate >= 20) return "Beginner's Luck";
  return "Benchwarmer";
};

function HuddleCard({ 
  league, 
  onPress, 
  onLeave 
}: { 
  league: League; 
  onPress: () => void;
  onLeave: () => void;
}) {
  const colors = useColors();
  
  const handleLeave = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to leave ${league.name}?`)) {
        onLeave();
      }
    } else {
      Alert.alert(
        "Leave This Huddle?",
        `Are you sure you want to leave ${league.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Leave", 
            style: "destructive", 
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onLeave();
            } 
          }
        ]
      );
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="users" size={20} color={colors.foreground} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.foreground }]}>{league.name}</Text>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          {league.memberIds.length} members · Code: {league.code}
        </Text>
      </View>
      
      <Pressable onPress={handleLeave} style={{ padding: 8 }}>
        <Feather name="log-out" size={18} color="#E8533A" />
      </Pressable>
      
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function HuddlesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, leaderboard, createLeague, joinLeague, leaveLeague } = useData();
  const { user } = useAuth();
  
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [huddleName, setHuddleName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  const [mainTab, setMainTab] = useState<"global" | "huddles">("huddles");
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleCreate = () => {
    if (!huddleName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createLeague(huddleName.trim());
    setHuddleName("");
    setModal(null);
  };

  const handleJoin = async () => {
    const codeToJoin = joinCode.trim().toUpperCase();
    if (!codeToJoin) return;

    const alreadyJoined = leagues.some((l) => l.code === codeToJoin);
    if (alreadyJoined) {
      if (Platform.OS === "web") window.alert("You are already a member of this Huddle!");
      else Alert.alert("Already Joined", "You are already a member of this Huddle!");
      setJoinCode("");
      setModal(null);
      return;
    }

    const success = await joinLeague(codeToJoin);
    if (!success) {
      if (Platform.OS === "web") window.alert("No huddle found with that code.");
      else Alert.alert("Not found", "No huddle found with that code.");
      return;
    }
    
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoinCode("");
    setModal(null);
  };

  const getRankSuffix = (i: number) => {
    const j = i % 10, k = i % 100;
    if (j == 1 && k != 11) return i + "st";
    if (j == 2 && k != 12) return i + "nd";
    if (j == 3 && k != 13) return i + "rd";
    return i + "th";
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points);
  const myHuddles = leagues.filter((league) => user && league.memberIds.includes(user.id));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Huddles</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => setModal("join")} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="log-in" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => setModal("create")} style={[styles.solidBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => setMainTab("huddles")} style={[styles.tabBtn, mainTab === "huddles" && { borderBottomColor: colors.foreground }]}>
          <Text style={[styles.tabLabel, { color: mainTab === "huddles" ? colors.foreground : colors.mutedForeground }]}>My Huddles</Text>
        </Pressable>
        <Pressable onPress={() => setMainTab("global")} style={[styles.tabBtn, mainTab === "global" && { borderBottomColor: colors.foreground }]}>
          <Text style={[styles.tabLabel, { color: mainTab === "global" ? colors.foreground : colors.mutedForeground }]}>Global Rankings</Text>
        </Pressable>
      </View>

      {mainTab === "huddles" ? (
        <FlatList<League>
          data={myHuddles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HuddleCard
              league={item}
              onPress={() => router.push(`/league/${item.id}`)}
              onLeave={() => leaveLeague(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No huddles yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Start a private huddle or join one with a code.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}
        />
      ) : (
        <FlatList
          data={sortedLeaderboard}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}
          renderItem={({ item, index }) => {
            const picksCounter = (item as any).total_picks ?? (item as any).picksCount ?? 5;

            return (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setProfileUser(item);
                }}
                style={({ pressed }) => [styles.memberRow, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={styles.rankCol}>
                  <Text style={[styles.rankText, { color: colors.foreground }]}>{getRankSuffix(index + 1)}</Text>
                </View>
                <Avatar color={item.avatarColor} username={item.username} size={40} />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.displayName}
                    {item.userId === user?.id ? " (you)" : ""}
                  </Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground, marginTop: 0 }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                    <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.badgeText, { color: colors.foreground }]}>
                        {getRank(item.winRate, picksCounter)}
                      </Text>
                    </View>
                  </View>

                </View>
                <View style={styles.memberRight}>
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.memberPoints, { color: colors.foreground }]}>{item.points.toLocaleString()}</Text>
                    <Text style={[styles.memberPointsLabel, { color: colors.mutedForeground }]}>pts</Text>
                  </View>
                  <Text style={[styles.memberWinRate, { color: colors.mutedForeground }]}>{item.winRate}% win</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />

      <Modal visible={modal === "create"} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalDismiss} onPress={() => { setModal(null); setHuddleName(""); }} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Huddle</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Give your group a name. A unique code will be generated for invites.
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. KCL Banter FC"
              placeholderTextColor={colors.mutedForeground}
              value={huddleName}
              onChangeText={setHuddleName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <HuddleButton label="Huddle up" onPress={handleCreate} fullWidth />
            <Pressable onPress={() => { setModal(null); setHuddleName(""); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modal === "join"} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalDismiss} onPress={() => { setModal(null); setJoinCode(""); }} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Join a Huddle</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Enter the invite code from your mate.
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. KCL2024"
              placeholderTextColor={colors.mutedForeground}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />
            <HuddleButton label="Join Huddle" onPress={handleJoin} fullWidth />
            <Pressable onPress={() => { setModal(null); setJoinCode(""); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  solidBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4 },
  tabBtn: { flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center" },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  cardMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
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
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});