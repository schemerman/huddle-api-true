import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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

interface WagerEntry {
  id: string;
  team: string;
  fixture: string;
  question: string;
  result: string;
  amount: number;
  status: "Won" | "Lost" | "Pending";
}

const MY_WAGERS: WagerEntry[] = [
  { id: "mw1", team: "Arsenal", fixture: "Arsenal vs Man City", question: "Who will win: Arsenal or Man City?", result: "TBD", amount: 120, status: "Pending" },
  { id: "mw2", team: "Liverpool", fixture: "Liverpool vs Chelsea", question: "Who will win: Liverpool or Chelsea?", result: "Liverpool", amount: 200, status: "Won" },
  { id: "mw3", team: "Brazil", fixture: "Brazil vs Germany", question: "Who will win: Brazil or Germany?", result: "Brazil", amount: 80, status: "Won" },
  { id: "mw4", team: "Draw", fixture: "Man United vs Tottenham", question: "Who will win: Man United or Tottenham?", result: "Tottenham", amount: 50, status: "Lost" },
  { id: "mw5", team: "France", fixture: "France vs Argentina", question: "Who will win: France or Argentina?", result: "TBD", amount: 150, status: "Pending" },
  { id: "mw6", team: "Spain", fixture: "Spain vs Portugal", question: "Who will win: Spain or Portugal?", result: "Spain", amount: 90, status: "Won" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, claimDailyBonus, claimBailout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [receiptWager, setReceiptWager] = useState<WagerEntry | null>(null);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await logout();
          router.replace("/(auth)/register");
        },
      },
    ]);
  };

  if (!user) return null;

  const bonusReady = Date.now() - (user.lastDailyClaim || 0) >= DAY_MS;
  const hoursLeft = Math.max(
    1,
    Math.ceil((DAY_MS - (Date.now() - (user.lastDailyClaim || 0))) / (60 * 60 * 1000))
  );

  const handleDailyBonus = async () => {
    const ok = await claimDailyBonus();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Daily bonus claimed", "+100 points added to your bankroll.");
    }
  };

  const handleBailout = async () => {
    const ok = await claimBailout();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Bailout claimed", "+100 emergency points. Spend them wisely.");
    }
  };

  const statsData = [
    { label: "Win Rate", value: `${user.winRate}%` },
    { label: "Points", value: user.points.toLocaleString() },
    { label: "Wagers", value: user.previousWagers.toLocaleString() },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Avatar
            color={user.avatarColor}
            username={user.username || user.email}
            size={80}
            highlight={(user.currentStreak ?? 0) >= 3}
          />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {user.displayName || user.email}
            </Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>
              @{user.username || "—"}
            </Text>
            <View style={styles.perfRow}>
              <PerformanceTitleBadge winRate={user.winRate} />
              {(user.currentStreak ?? 0) >= 3 && (
                <Text style={[styles.streakText, { color: colors.mutedForeground }]}>
                  {user.currentStreak}-streak heater
                </Text>
              )}
            </View>
            {!!user.dob && (
              <Text style={[styles.dob, { color: colors.mutedForeground }]}>
                Born {user.dob}
              </Text>
            )}
          </View>
        </View>

        {/* Bankrupt badge */}
        {user.isBankrupt && (
          <View style={[styles.bankruptBanner, { borderColor: palette.light.crimson }]}>
            <Text style={[styles.bankruptTag, { color: palette.light.crimson }]}>BANKRUPT</Text>
            <Text style={[styles.bankruptSub, { color: colors.mutedForeground }]}>
              Rebuild past 500 pts to clear this status.
            </Text>
          </View>
        )}

        {/* Stats bar */}
        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {statsData.map((stat, i) => (
            <View
              key={stat.label}
              style={[
                styles.statItem,
                i < statsData.length - 1 && { borderRightColor: colors.border, borderRightWidth: 1 },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Economy actions */}
        <View style={styles.economyRow}>
          <Pressable
            onPress={handleDailyBonus}
            disabled={!bonusReady}
            style={({ pressed }) => [
              styles.economyBtn,
              {
                borderColor: colors.border,
                backgroundColor: bonusReady ? colors.background : colors.secondary,
                opacity: pressed && bonusReady ? 0.7 : 1,
              },
            ]}
          >
            <Feather
              name="gift"
              size={16}
              color={bonusReady ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.economyBtnText,
                { color: bonusReady ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {bonusReady ? "Claim Daily Bonus" : `Bonus in ${hoursLeft}h`}
            </Text>
          </Pressable>

          {user.points <= 0 && (
            <Pressable
              onPress={handleBailout}
              style={({ pressed }) => [
                styles.economyBtnSolid,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="life-buoy" size={16} color={colors.primaryForeground} />
              <Text style={[styles.economyBtnText, { color: colors.primaryForeground }]}>
                Claim Daily Bailout
              </Text>
            </Pressable>
          )}
        </View>

        {/* Tab toggle */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["stats", "wagers"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tabBtn,
                tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: tab === t ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {t === "stats" ? "Stats" : "Wagers"}
              </Text>
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
            <Text style={[styles.wagersHeading, { color: colors.foreground }]}>Recent Wagers</Text>
            {MY_WAGERS.map((w, i) => {
              const completed = w.status === "Won" || w.status === "Lost";
              return (
                <Pressable
                  key={w.id}
                  onPress={
                    completed
                      ? () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setReceiptWager(w);
                        }
                      : undefined
                  }
                  style={({ pressed }) => [
                    styles.wagerRow,
                    { borderBottomColor: colors.border },
                    i === MY_WAGERS.length - 1 && { borderBottomWidth: 0 },
                    { opacity: pressed && completed ? 0.6 : 1 },
                  ]}
                >
                  <View style={styles.wagerLeft}>
                    <Text style={[styles.wagerTeam, { color: colors.foreground }]}>
                      {w.amount} pts on {w.team}
                    </Text>
                    <Text style={[styles.wagerFixture, { color: colors.mutedForeground }]}>
                      {w.fixture}
                    </Text>
                  </View>
                  <View style={styles.wagerRight}>
                    <View
                      style={[
                        styles.wagerBadge,
                        { backgroundColor: w.status === "Won" ? colors.primary : colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.wagerStatus,
                          {
                            color:
                              w.status === "Won"
                                ? colors.primaryForeground
                                : w.status === "Lost"
                                ? colors.mutedForeground
                                : colors.foreground,
                          },
                        ]}
                      >
                        {w.status}
                      </Text>
                    </View>
                    {completed && (
                      <Feather name="share" size={15} color={colors.mutedForeground} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* User Agreement modal */}
      <Modal visible={agreementOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setAgreementOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>User Agreement</Text>
              <Pressable onPress={() => setAgreementOpen(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.agreementScroll}>
              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>
                1. User-Generated Content
              </Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                You are solely responsible for the posts, predictions, and messages you share on
                Huddle. Content must not be unlawful, abusive, or harassing. Posts form a permanent
                record and cannot be deleted once published. We may remove content that violates
                these terms.
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>
                2. Assumption of Prediction Risk
              </Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                Huddle is a social prediction game played with virtual points that hold no monetary
                value and cannot be exchanged for cash or prizes. All predictions are made for
                entertainment. You accept that points may be won or lost based on real-world outcomes
                beyond our control.
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>
                3. Privacy Protections
              </Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                We collect only the information needed to operate your account, including your
                university email, username, and activity within the app. Your data is stored securely
                on your device and is never sold to third parties. You may request deletion of your
                account at any time.
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>
                4. Fair Play
              </Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                Manipulating the points economy, exploiting bugs, or creating multiple accounts to
                gain an unfair advantage is prohibited and may result in suspension.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReceiptModal
        visible={!!receiptWager}
        onClose={() => setReceiptWager(null)}
        question={receiptWager?.question ?? ""}
        finalResult={receiptWager?.result ?? ""}
        prediction={receiptWager?.team ?? ""}
        won={receiptWager?.status === "Won"}
      />
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
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  heroText: { flex: 1 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  perfRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  streakText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  dob: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  bankruptBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  bankruptTag: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 2,
  },
  bankruptSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -1 },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  economyRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  economyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  economyBtnSolid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
  },
  economyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
    marginTop: 20,
  },
  tabBtn: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  section: { paddingTop: 24, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1 },
  settingsGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingsLabel: { fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 999,
    borderColor: "#E8E8E8",
  },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FF3B30" },
  wagersSection: { paddingHorizontal: 16, paddingTop: 20 },
  wagersHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  wagerLeft: { flex: 1 },
  wagerTeam: { fontFamily: "Inter_400Regular", fontSize: 14 },
  wagerFixture: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  wagerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  wagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 12 },
  wagerStatus: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  agreementScroll: { flexGrow: 0 },
  agreementHeading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 6,
    marginTop: 14,
  },
  agreementText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
});
