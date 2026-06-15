import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { PerformanceTitleBadge } from "@/components/PerformanceTitleBadge";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, claimDailyBonus } = useAuth();
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [wagers, setWagers] = useState<any[]>([]);

  const fetchWagers = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("wagers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data) {
      // DEBUGGING: This will print the raw data to your browser console
      console.log("DEBUG: Raw wager data received:", data[0]); 
      setWagers(data);
    }
  };

  useFocusEffect(useCallback(() => { fetchWagers(); }, [user?.id]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={() => logout()}><Text style={{ color: "#FF3B30", fontWeight: '600' }}>Sign out</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroSection}>
          <Avatar color={user?.avatarColor} username={user?.username || ""} size={80} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.displayName}</Text>
            <Text style={{ color: colors.mutedForeground }}>@{user?.username}</Text>
            <PerformanceTitleBadge winRate={user?.winRate || 0} />
          </View>
        </View>

        <Pressable onPress={() => claimDailyBonus()} style={styles.bonusBtn}>
          <Text style={styles.bonusText}>Claim Daily 100 Points</Text>
        </Pressable>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setTab("stats")} style={styles.tabBtn}><Text style={{ fontWeight: tab === 'stats' ? 'bold' : 'normal' }}>Stats</Text></Pressable>
          <Pressable onPress={() => setTab("wagers")} style={styles.tabBtn}><Text style={{ fontWeight: tab === 'wagers' ? 'bold' : 'normal' }}>Picks</Text></Pressable>
        </View>

        {tab === "wagers" && (
          <View style={{ padding: 20 }}>
            {wagers.length === 0 ? <Text style={{ textAlign: 'center' }}>No picks placed yet.</Text> : 
             wagers.map((w) => (
               <View key={w.id} style={styles.wagerRow}>
                 {/* This displays the data. If this shows 'undefined', the column name is wrong */}
                 <Text>{w.amount} pts on {w.prediction || w.choice || "Unknown Pick"}</Text>
                 <Text>{w.status || "Pending"}</Text>
               </View>
             ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold" },
  heroSection: { flexDirection: "row", padding: 20, gap: 16, alignItems: 'center' },
  heroText: { flex: 1 },
  displayName: { fontSize: 20, fontWeight: "bold" },
  bonusBtn: { backgroundColor: '#000', padding: 15, margin: 20, borderRadius: 10, alignItems: 'center' },
  bonusText: { color: '#fff', fontWeight: 'bold' },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: '#eee' },
  tabBtn: { padding: 15, flex: 1, alignItems: 'center' },
  wagerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee' }
});