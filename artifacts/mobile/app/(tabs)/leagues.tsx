import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
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
import type { League } from "@/context/DataContext";

function LeagueCard({ league, onPress }: { league: League; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.leagueCard,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.leagueIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="users" size={20} color={colors.foreground} />
      </View>
      <View style={styles.leagueInfo}>
        <Text style={[styles.leagueName, { color: colors.foreground }]}>{league.name}</Text>
        <Text style={[styles.leagueMeta, { color: colors.mutedForeground }]}>
          {league.memberIds.length} members · Code: {league.code}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function LeaguesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, createLeague, joinLeague } = useData();
  const { user } = useAuth();
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [leagueName, setLeagueName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleCreate = () => {
    if (!leagueName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createLeague(leagueName.trim());
    setLeagueName("");
    setModal(null);
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    const success = joinLeague(joinCode.trim().toUpperCase());
    if (!success) {
      Alert.alert("Not found", "No league found with that code. Double-check and try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoinCode("");
    setModal(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Leagues</Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => setModal("join")}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather name="log-in" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => setModal("create")}
            style={[styles.solidBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <FlatList<League>
        data={leagues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeagueCard
            league={item}
            onPress={() => router.push(`/league/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No leagues yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create a private league or join one with a code.
            </Text>
          </View>
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      />

      <Modal visible={modal === "create"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create a League</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Give your squad a name. A unique code will be generated.
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. KCL Banter FC"
              placeholderTextColor={colors.mutedForeground}
              value={leagueName}
              onChangeText={setLeagueName}
              autoFocus
            />
            <HuddleButton label="Create League" onPress={handleCreate} fullWidth />
            <Pressable onPress={() => { setModal(null); setLeagueName(""); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === "join"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Join a League</Text>
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
            />
            <HuddleButton label="Join League" onPress={handleJoin} fullWidth />
            <Pressable onPress={() => { setModal(null); setJoinCode(""); }} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
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
    borderBottomWidth: 1,
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
  leagueCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  leagueIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueInfo: { flex: 1 },
  leagueName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  leagueMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
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
