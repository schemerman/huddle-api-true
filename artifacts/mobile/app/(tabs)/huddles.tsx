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
import type { League } from "@/context/DataContext";

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
      
      {/* The New Leave Button */}
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
  const { leagues, createLeague, joinLeague, leaveLeague } = useData();
  const { user } = useAuth();
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [huddleName, setHuddleName] = useState("");
  const [joinCode, setJoinCode] = useState("");

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

    // Check if we are already in this Huddle
    const alreadyJoined = leagues.some((l) => l.code === codeToJoin);
    if (alreadyJoined) {
      Alert.alert("Already Joined", "You are already a member of this Huddle!");
      setJoinCode("");
      setModal(null);
      return;
    }

    const success = await joinLeague(codeToJoin);
    if (!success) {
      Alert.alert("Not found", "No huddle found with that code. Double-check and try again.");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJoinCode("");
    setModal(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Huddles</Text>
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
        data={leagues.filter((league) => user && league.memberIds.includes(user.id))}
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
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      />

      <Modal visible={modal === "create"} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
