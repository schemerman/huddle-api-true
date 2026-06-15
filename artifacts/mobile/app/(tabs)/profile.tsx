import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import palette from "@/constants/colors";
import { PerformanceTitleBadge } from "@/components/PerformanceTitleBadge";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { ReceiptModal } from "@/components/ReceiptModal";
import { supabase } from "@/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

function statusLabel(status: string): string {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "Pending";
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, claimDailyBonus } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [receiptWager, setReceiptWager] = useState<any | null>(null);
  const [wagers, setWagers] = useState<any[]>([]);

  // Fixed Logic: Direct fetch from DB, bypassing any potential API cache
  const fetchWagers = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("wagers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data) setWagers(data);
  };

  useFocusEffect(useCallback(() => { fetchWagers(); }, [user?.id]));

  const handleDailyBonus = async () => {
    // Logic: Check if bonus is ready
    const bonusReady = Date.now() - (user?.lastDailyClaim || 0) >= DAY_MS;
    
    if (!bonusReady) {
      Alert.alert("Already Claimed", "You have already claimed your daily points. Come back tomorrow!");
      return;
    }

    const ok = await claimDailyBonus();
    if (ok) {
      Alert.alert("Success", "Daily bonus claimed! +100 points added.");
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        await logout();
        router.replace("/(auth)/login");
      }
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
      ]);
    }
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroSection}>
          <Avatar color={user.avatarColor} username={user.username || user.email} size={80} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.email}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{user.username || "—"}</Text>
            <PerformanceTitleBadge winRate={user.winRate} />
          </View>
        </View>

        <Pressable onPress={handleDailyBonus} style={styles.bonusBtn}>
            <Text style={{ fontWeight: 'bold' }}>Claim Daily Bonus</Text>
        </Pressable>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setTab("stats")} style={styles.tabBtn}><Text style={{ fontWeight: tab === 'stats' ? 'bold' : 'normal' }}>Stats</Text></Pressable>
          <Pressable onPress={() => setTab("wagers")} style={styles.tabBtn}><Text style={{ fontWeight: tab === 'wagers' ? 'bold' : 'normal' }}>Picks</Text></Pressable>
        </View>

        {tab === "wagers" ? (
          <View style={{ padding: 20 }}>
            {wagers.map((w) => (
              <Pressable key={w.id} onPress={() => setReceiptWager(w)} style={styles.wagerRow}>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>{w.amount} pts on {w.prediction || w.choice}</Text>
                  <Text style={{ fontSize: 12, color: 'gray' }}>{w.question}</Text>
                </View>
                <View style={{ backgroundColor: '#eee', padding: 5, borderRadius: 5 }}>
                    <Text>{statusLabel(w.status)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ padding: 20 }}>
            <Text>Email: {user.email}</Text>
            <Text>Username: @{user.username}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "bold" },
  heroSection: { flexDirection: "row", padding: 20, gap: 16, alignItems: 'center' },
  heroText: { flex: 1 },
  displayName: { fontSize: 20, fontWeight: "bold" },
  handle: { fontSize: 14 },
  bonusBtn: { backgroundColor: '#eee', padding: 15, margin: 20, borderRadius: 10, alignItems: 'center' },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn: { padding: 15, flex: 1, alignItems: 'center' },
  wagerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }
});