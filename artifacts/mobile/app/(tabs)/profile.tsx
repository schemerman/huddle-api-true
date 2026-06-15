import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { type Wager } from "@workspace/api-client-react";
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
  const { user, logout, claimDailyBonus, claimBailout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [receiptWager, setReceiptWager] = useState<Wager | null>(null);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [wagersLoaded, setWagersLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const userId = user?.id;
      if (!userId) return;
      let active = true;

      (async () => {
        console.log("DEBUG: Querying wagers for ID:", userId);

        // Try 'user_id' first
        let { data, error } = await supabase
          .from("wagers")
          .select("*")
          .eq("user_id", userId);

        // If that fails, try 'userId'
        if (error || !data || data.length === 0) {
          console.log("DEBUG: Primary query failed/empty, trying userId column...");
          const fallback = await supabase
            .from("wagers")
            .select("*")
            .eq("userId", userId);
          
          data = fallback.data;
          if (fallback.error) console.error("DEBUG: Both queries failed:", fallback.error);
        }

        if (active) {
          console.log("DEBUG: Data received:", data);
          setWagers((data as Wager[] || []).reverse());
          setWagersLoaded(true);
        }
      })();

      return () => { active = false; };
    }, [user?.id])
  );

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        await logout();
        router.replace("/login");
      }
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
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
        {/* PROFILE HERO */}
        <View style={styles.heroSection}>
          <Avatar color={user.avatarColor} username={user.username || user.email} size={80} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.email}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{user.username || "—"}</Text>
          </View>
        </View>

        {/* STATS */}
        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {[
            { label: "Win Rate", value: `${user.winRate}%` },
            { label: "Points", value: user.points.toLocaleString() },
          ].map((stat) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* TABS */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["stats", "wagers"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>
                {t === "stats" ? "Stats" : "Picks"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* WAGER LIST */}
        {tab === "wagers" && (
          <View style={styles.wagersSection}>
            {!wagersLoaded ? (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>Loading picks...</Text>
            ) : wagers.length === 0 ? (
              <Text style={[styles.wagersEmpty, { color: colors.mutedForeground }]}>No picks found.</Text>
            ) : (
              wagers.map((w) => (
                <View key={w.id} style={styles.wagerRow}>
                  <Text style={{ color: colors.foreground }}>{w.amount} pts on {w.prediction || w.choice}</Text>
                  <Text style={{ color: colors.foreground }}>{statusLabel(w.status)}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  heroSection: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  heroText: { flex: 1 },
  displayName: { fontSize: 20, fontWeight: "bold" },
  handle: { fontSize: 14, color: "gray" },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18 },
  statValue: { fontSize: 24, fontWeight: "bold" },
  statLabel: { fontSize: 12, textTransform: "uppercase" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4, marginTop: 20 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 13 },
  tabLabel: { fontSize: 14 },
  wagersSection: { padding: 16 },
  wagersEmpty: { fontSize: 14, textAlign: 'center' },
  wagerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1 }
});