import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";

function statusLabel(status: string): string {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "Pending";
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [wagers, setWagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWagers = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    // Force direct Supabase fetch with no cache
    const { data, error } = await supabase
      .from("wagers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setWagers(data || []);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchWagers();
    }, [user?.id])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Text style={{ color: "#FF3B30", fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Avatar color={user.avatarColor} username={user.username || user.email} size={80} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.email}</Text>
            <Text style={{ color: colors.mutedForeground }}>@{user.username || "—"}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user.points}</Text>
            <Text style={{ color: colors.mutedForeground }}>Points</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable onPress={() => setTab("stats")} style={styles.tabBtn}>
            <Text style={{ fontWeight: tab === "stats" ? "bold" : "normal" }}>Stats</Text>
          </Pressable>
          <Pressable onPress={() => setTab("wagers")} style={styles.tabBtn}>
            <Text style={{ fontWeight: tab === "wagers" ? "bold" : "normal" }}>Picks</Text>
          </Pressable>
        </View>

        {tab === "wagers" && (
          <View style={styles.wagersSection}>
            {loading ? (
              <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : wagers.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20 }}>No picks found.</Text>
            ) : (
              wagers.map((w) => (
                <View key={w.id} style={styles.wagerRow}>
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{w.amount} pts on {w.prediction || w.choice}</Text>
                    <Text style={{ fontSize: 12, color: 'gray' }}>{w.question}</Text>
                  </View>
                  <Text style={{ fontWeight: '600' }}>{statusLabel(w.status)}</Text>
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
  topBar: { flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: "bold" },
  heroSection: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  heroText: { flex: 1 },
  displayName: { fontSize: 20, fontWeight: "bold" },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18 },
  statValue: { fontSize: 24, fontWeight: "bold" },
  tabRow: { flexDirection: "row", marginTop: 20, borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn: { padding: 15, flex: 1, alignItems: 'center' },
  wagersSection: { padding: 16 },
  wagerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' }
});