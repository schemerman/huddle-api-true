import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import palette from "@/constants/colors";
import { PerformanceTitleBadge } from "@/components/PerformanceTitleBadge";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { ReceiptModal } from "@/components/ReceiptModal";
import { supabase } from "@/lib/supabase";

function statusLabel(status: string): string {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "Pending";
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, claimDailyBonus } = useAuth();
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [wagers, setWagers] = useState<any[]>([]);
  const [receiptWager, setReceiptWager] = useState<any | null>(null);

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

        {tab === "wagers" ? (
          <View style={{ padding: 20 }}>
            {wagers.map((w) => (
              <Pressable key={w.id} onPress={() => setReceiptWager(w)} style={styles.wagerRow}>
                <View>
                  <Text style={{ fontWeight: 'bold' }}>{w.amount} pts on {w.prediction || w.choice}</Text>
                  <Text style={{ fontSize: 12, color: 'gray' }}>{w.question}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: w.status === 'won' ? 'black' : '#eee' }]}>
                  <Text style={{ color: w.status === 'won' ? 'white' : 'black' }}>{statusLabel(w.status)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.statsSection}>
            <Text>Email: {user?.email}</Text>
            <Text>Username: @{user?.username}</Text>
          </View>
        )}
      </ScrollView>

      <ReceiptModal 
        visible={!!receiptWager} 
        onClose={() => setReceiptWager(null)} 
        {...receiptWager} 
        won={receiptWager?.status === 'won'}
      />
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
  wagerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  badge: { padding: 5, borderRadius: 5 },
  statsSection: { padding: 20 }
});