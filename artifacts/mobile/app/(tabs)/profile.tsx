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
  const [wagersLoaded, setWagersLoaded] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<any>(null);
  const [localClaimed, setLocalClaimed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let isMounted = true;

      const fetchFreshData = async () => {
        try {
          // Fetch BOTH wagers and live profile timestamp simultaneously
          const [wagersRes, profileRes] = await Promise.all([
            supabase.from("wagers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
            supabase.from("profiles").select("*").eq("id", user.id).single()
          ]);
            
          if (isMounted) {
            if (wagersRes.data) setWagers(wagersRes.data);
            if (profileRes.data) setCloudProfile(profileRes.data);
          }
        } catch {
          // Silent catch
        } finally {
          if (isMounted) setWagersLoaded(true);
        }
      };

      fetchFreshData();
      const interval = setInterval(fetchFreshData, 3000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [user?.id])
  );

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to sign out?");
      if (confirmLogout) {
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

  // Pull the live timestamp from the cloud database, fallback to local user cache
  const liveLastClaim = cloudProfile?.last_daily_claim || cloudProfile?.lastDailyClaim || user.lastDailyClaim || 0;
  
  // Logic evaluating if it should be greyed out
  const isBonusReady = (Date.now() - liveLastClaim >= DAY_MS) && !localClaimed;

  const handleDailyBonus = async () => {
    if (!isBonusReady) return;
    
    const ok = await claimDailyBonus();
    if (ok) {
      setLocalClaimed(true); // Instantly locks the UI
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      if (Platform.OS === "web") {
        window.alert("Daily bonus claimed! +100 points added to your bankroll.");
      } else {
        Alert.alert("Daily bonus claimed", "+100 points added to your bankroll.");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}>
        
        <View style={styles.heroSection}>
          <Avatar color={user.avatarColor} username={user.username || user.email} size={80} highlight={(user.currentStreak ?? 0) >= 3} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName || user.email}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{user.username || "—"}</Text>
            <View style={styles.perfRow}>
              <PerformanceTitleBadge winRate={user.winRate} />
              {(user.currentStreak ?? 0) >= 3 && <Text style={[styles.streakText, { color: colors.mutedForeground }]}>{user.currentStreak}-streak heater</Text>}
            </View>
            {!!user.dob && <Text style={[styles.dob, { color: colors.mutedForeground }]}>Born {user.dob}</Text>}
          </View>
        </View>

        {user.isBankrupt && (
          <View style={[styles.bankruptBanner, { borderColor: palette.light.crimson }]}>
            <Text style={[styles.bankruptTag, { color: palette.light.crimson }]}>BANKRUPT</Text>
            <Text style={[styles.bankruptSub, { color: colors.mutedForeground }]}>Rebuild past 500 pts to clear this status.</Text>
          </View>
        )}

        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user.winRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
          </View>
          <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user.points.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{wagers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PICKS</Text>
          </View>
        </View>

        <Pressable
          onPress={handleDailyBonus}
          disabled={!isBonusReady}
          style={({ pressed }) => [
            styles.bonusBtn,
            !isBonusReady && styles.bonusBtnDisabled,
            pressed && isBonusReady && { opacity: 0.6 }
          ]}
        >
          <Feather name="gift" size={16} color={isBonusReady ? colors.foreground : "#A1A1AA"} />
          <Text style={[styles.bonusText, { color: isBonusReady ? colors.foreground : "#A1A1AA" }]}>
            {isBonusReady ? "Claim Daily Bonus" : "Bonus Claimed"}
          </Text>
        </Pressable>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["stats", "wagers"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>{t === "stats" ? "Stats" : "Picks"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "stats" ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
              <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
                <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <Feather name="mail" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{user.email}</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Feather name="at-sign" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>@{user.username || "—"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
              <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
                <Pressable onPress={() => setAgreementOpen(true)} style={styles.settingsRow}>
                  <Feather name="file-text" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Privacy Policy</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={handleLogout} style={[styles.signOutBtn, { borderColor: colors.border }]}>
              <Feather name="log-out" size={16} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.wagersSection}>
            <Text style={[styles.wagersHeading, { color: colors.foreground }]}>Recent Picks</Text>
            {wagersLoaded && wagers.length === 0 ? (
              <Text style={[styles.wagersEmpty, { color: colors.mutedForeground }]}>No picks placed yet. Go make a call on the Predict tab.</Text>
            ) : (
              wagers.map((w, i) => {
                const completed = w.status === "won" || w.status === "lost";
                const won = w.status === "won";
                return (
                  <Pressable key={w.id} onPress={completed ? () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReceiptWager(w); } : undefined} style={({ pressed }) => [styles.wagerRow, { borderBottomColor: colors.border }, i === wagers.length - 1 && { borderBottomWidth: 0 }, { opacity: pressed && completed ? 0.6 : 1 }]}>
                    <View style={styles.wagerLeft}>
                      <Text style={[styles.wagerTeam, { color: colors.foreground }]}>{w.amount} pts on {w.prediction || w.choice}</Text>
                      <Text style={[styles.wagerFixture, { color: colors.mutedForeground }]}>{w.question}</Text>
                    </View>
                    <View style={styles.wagerRight}>
                      <View style={[styles.wagerBadge, { backgroundColor: won ? colors.primary : colors.secondary }]}>
                        <Text style={[styles.wagerStatus, { color: won ? colors.primaryForeground : w.status === "lost" ? colors.mutedForeground : colors.foreground }]}>{statusLabel(w.status)}</Text>
                      </View>
                      {completed && <Feather name="share" size={15} color={colors.mutedForeground} />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={agreementOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setAgreementOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>User Agreement</Text>
              <Pressable onPress={() => setAgreementOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.agreementScroll}>
              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>1. User-Generated Content</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>You are solely responsible for the posts, predictions, and messages you share on Huddle. Content must not be unlawful, abusive, or harassing.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReceiptModal visible={!!receiptWager} onClose={() => setReceiptWager(null)} question={receiptWager?.question ?? ""} finalResult={receiptWager?.status === "won" ? receiptWager.prediction || receiptWager.choice : "—"} prediction={receiptWager?.prediction || receiptWager?.choice || ""} points={receiptWager?.status === "won" ? receiptWager.payout : receiptWager?.amount ?? 0} won={receiptWager?.status === "won"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  heroSection: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  heroText: { flex: 1 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  perfRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  streakText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  dob: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  bankruptBanner: { marginHorizontal: 16, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12 },
  bankruptTag: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 2 },
  bankruptSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -1 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  
  bonusBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, marginHorizontal: 16, marginTop: 20, marginBottom: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#FFFFFF' },
  bonusBtnDisabled: { backgroundColor: '#F4F4F5', borderColor: '#F4F4F5' },
  bonusText: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginLeft: 8, color: '#000000' },

  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4, marginTop: 20 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  section: { paddingTop: 24, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1 },
  settingsGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 },
  settingsLabel: { fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 999, borderColor: "#E8E8E8" },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FF3B30" },
  wagersSection: { paddingHorizontal: 16, paddingTop: 20 },
  wagersHeading: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2, marginBottom: 14 },
  wagersEmpty: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, paddingVertical: 8 },
  wagerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1 },
  wagerLeft: { flex: 1 },
  wagerTeam: { fontFamily: "Inter_400Regular", fontSize: 14 },
  wagerFixture: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  wagerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  wagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 12 },
  wagerStatus: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "80%" },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  agreementScroll: { flexGrow: 0 },
  agreementHeading: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 6, marginTop: 14 },
  agreementText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
});