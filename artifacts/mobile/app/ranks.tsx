import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { RANKS, ROOKIE_PICKS, getRank, nextRank, rankRequirement, winRateOf } from "@/utils/ranks";

// "How ranks work": every rank, what it takes, and where you stand.
// Opened from the Predict "Your Rank" box, the Profile rank badge and Profile settings.
export default function RanksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const { user } = useAuth();

  // Same numbers as the Profile badge: finished picks only (won or lost).
  const [stats, setStats] = useState<{ won: number; settled: number } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase
      .from("wagers")
      .select("status")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active || !data) return;
        const settled = data.filter((w: any) => w.status === "won" || w.status === "lost");
        setStats({ won: settled.filter((w: any) => w.status === "won").length, settled: settled.length });
      });
    return () => { active = false; };
  }, [user?.id]);

  const winRate = stats ? winRateOf(stats.won, stats.settled) : 0;
  const myRank = stats ? getRank(winRate, stats.settled) : null;
  const next = stats ? nextRank(winRate, stats.settled) : null;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.headerBtn} accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>How ranks work</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        {user?.id ? (
          <View style={[styles.youCard, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.youLabel, { color: colors.background, opacity: 0.7 }]}>YOUR RANK</Text>
            {stats ? (
              <>
                <Text style={[styles.youRank, { color: colors.background }]}>{myRank}</Text>
                <Text style={[styles.youStats, { color: colors.background, opacity: 0.8 }]}>
                  {winRate}% win rate · {stats.settled} finished pick{stats.settled === 1 ? "" : "s"}
                </Text>
                <View style={[styles.youRule, { backgroundColor: colors.background }]} />
                <Text style={[styles.youNext, { color: colors.background }]}>
                  {next ? (next.rank ? `Next: ${next.rank.name}. ${next.needs}` : next.needs) : "You're at the top. Stay there."}
                </Text>
              </>
            ) : (
              <ActivityIndicator color={colors.background as string} style={{ marginVertical: 12 }} />
            )}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ALL RANKS</Text>
        <View style={[styles.list, { borderColor: colors.border }]}>
          {RANKS.map((rank, i) => {
            const mine = rank.name === myRank;
            return (
              <View
                key={rank.name}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  i === RANKS.length - 1 && styles.rowLast,
                  mine && { backgroundColor: colors.secondary },
                ]}
                accessibilityLabel={`${rank.name}. ${rankRequirement(rank)}.${mine ? " Your rank." : ""}`}
              >
                <View style={styles.rowTop}>
                  <View style={[styles.badge, { backgroundColor: mine ? colors.foreground : colors.secondary }]}>
                    <Text style={[styles.badgeText, { color: mine ? colors.background : colors.foreground }]}>{rank.name}</Text>
                  </View>
                  {mine ? <Text style={[styles.youTag, { color: colors.foreground }]}>You</Text> : null}
                </View>
                <Text style={[styles.requirement, { color: colors.foreground }]}>{rankRequirement(rank)}</Text>
                <Text style={[styles.description, { color: colors.mutedForeground }]}>{rank.description}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>GOOD TO KNOW</Text>
        <View style={styles.notes}>
          {[
            "Your rank comes from your win rate: picks won ÷ finished picks.",
            "Only finished matches count. Pending picks don't change your rank.",
            `Everyone starts as a Rookie. Finish ${ROOKIE_PICKS} picks to get your first real rank.`,
            "Higher ranks need more picks too, so one lucky call can't make you an Oracle.",
            "Your rank shows on your profile and on the leaderboards.",
          ].map((note) => (
            <View key={note} style={styles.noteRow}>
              <Text style={[styles.bullet, { color: colors.mutedForeground }]}>•</Text>
              <Text style={[styles.noteText, { color: colors.foreground }]}>{note}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingBottom: 10, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, maxWidth: 720, width: "100%", alignSelf: "center" },
  youCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  youLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.2 },
  youRank: { fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: -0.5, marginTop: 4 },
  youStats: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  youRule: { height: 1, opacity: 0.2, marginVertical: 14 },
  youNext: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  list: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 24 },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 4 },
  rowLast: { borderBottomWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  youTag: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.5 },
  requirement: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  description: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  notes: { gap: 8 },
  noteRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  bullet: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 20 },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
});
