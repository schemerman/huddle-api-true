import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useIsFocused } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listFixtures, type Fixture as ApiFixture } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Choice = "A" | "D" | "B";

interface Fixture {
  id: string;
  competition: string;
  kickoff: string;
  question: string;
  teamA: string;
  teamB: string;
  oddsA: number;
  oddsD: number;
  oddsB: number;
  votesA: number;
  votesD: number;
  votesB: number;
  userVote?: Choice;
  userWager?: number;
}

interface FixtureOverlay {
  userVote: Choice;
  userWager: number;
}

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function toFixture(api: ApiFixture, overlay: Record<string, FixtureOverlay>): Fixture {
  const o = overlay[api.id];
  return {
    id: api.id,
    competition: api.competition,
    kickoff: formatKickoff(api.startTime),
    question: `Who will win: ${api.homeTeam} or ${api.awayTeam}?`,
    teamA: api.homeTeam,
    teamB: api.awayTeam,
    oddsA: api.oddsHome,
    oddsD: api.oddsDraw,
    oddsB: api.oddsAway,
    votesA: 0,
    votesD: 0,
    votesB: 0,
    userVote: o?.userVote,
    userWager: o?.userWager,
  };
}

interface WagerTarget {
  fixture: Fixture;
  choice: Choice;
}

function FixtureCard({ fixture, onOpenWager }: { fixture: Fixture; onOpenWager: (fixture: Fixture, choice: Choice) => void }) {
  const colors = useColors();
  const total = fixture.votesA + fixture.votesD + fixture.votesB;
  const voted = !!fixture.userVote;

  const options: { choice: Choice; label: string; odds: number }[] = [
    { choice: "A", label: fixture.teamA, odds: fixture.oddsA },
    { choice: "D", label: "Draw", odds: fixture.oddsD },
    { choice: "B", label: fixture.teamB, odds: fixture.oddsB },
  ];

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.cardMeta}>
        <Text style={[styles.competition, { color: colors.mutedForeground }]}>{fixture.competition}</Text>
        <Text style={[styles.kickoff, { color: colors.mutedForeground }]}>{fixture.kickoff}</Text>
      </View>
      <Text style={[styles.question, { color: colors.foreground }]}>{fixture.question}</Text>
      <View style={styles.optionsCol}>
        {options.map(({ choice, label, odds }) => {
          const isSelected = fixture.userVote === choice;
          return (
            <Pressable
              key={choice}
              onPress={() => !voted && onOpenWager(fixture, choice)}
              style={({ pressed }) => [
                styles.optionBtn,
                { backgroundColor: isSelected ? colors.primary : colors.secondary, borderColor: colors.border, opacity: pressed && !voted ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.optionLabel, { color: isSelected ? colors.primaryForeground : colors.foreground }]} numberOfLines={1}>{label}</Text>
              <Text style={[styles.optionOdds, { color: isSelected ? colors.primaryForeground : colors.mutedForeground }]}>{odds}x</Text>
            </Pressable>
          );
        })}
      </View>
      {voted && (
        <Text style={[styles.votesMeta, { color: colors.mutedForeground }]}>
          {(total + 1).toLocaleString()} predictions{fixture.userWager ? ` · ${fixture.userWager} pts picked` : ""}
        </Text>
      )}
    </View>
  );
}

export default function PredictScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, placeWager } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isFocused = useIsFocused(); // Triggers real-time sync

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [wagerTarget, setWagerTarget] = useState<WagerTarget | null>(null);
  const [wagerAmount, setWagerAmount] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderGrant: () => { Keyboard.dismiss(); },
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.8) {
          Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(() => {
            setWagerTarget(null);
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
        }
      },
    })
  ).current;

  const closeModal = () => {
    Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(() => {
      setWagerTarget(null);
      translateY.setValue(0);
    });
  };

  // Aggressive Real-Time Sync on Focus
  useEffect(() => {
    if (!isFocused || !user?.id) return;
    let isMounted = true;

    const loadLiveFixtures = async () => {
      try {
        const apiFixtures = await listFixtures();
        const cloudOverlay: Record<string, FixtureOverlay> = {};

        const { data } = await supabase.from("wagers").select("*").eq("user_id", user.id);

        if (data) {
          data.forEach((w: any) => {
            const fId = w.fixture_id || w.fixtureId;
            if (fId) {
              cloudOverlay[fId] = { userVote: w.choice, userWager: w.amount };
            } else {
              const matchedApi = apiFixtures.find((apiF) => `Who will win: ${apiF.homeTeam} or ${apiF.awayTeam}?` === w.question);
              if (matchedApi) cloudOverlay[matchedApi.id] = { userVote: w.choice, userWager: w.amount };
            }
          });
        }

        if (isMounted) setFixtures(apiFixtures.map((f) => toFixture(f, cloudOverlay)));
      } catch {
        // Silent catch for transient errors
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLiveFixtures();
    const interval = setInterval(loadLiveFixtures, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isFocused, user?.id]);

  const handleOpenWager = (fixture: Fixture, choice: Choice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWagerAmount("10");
    setWagerTarget({ fixture, choice });
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleConfirmWager = async () => {
    if (!wagerTarget || submitting) return;
    const amount = parseInt(wagerAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const capped = Math.min(amount, user?.points ?? 0);
    if (capped <= 0) return;

    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const { fixture, choice } = wagerTarget;
    const prediction = choice === "A" ? fixture.teamA : choice === "D" ? "Draw" : fixture.teamB;
    const odds = choice === "A" ? fixture.oddsA : choice === "D" ? fixture.oddsD : fixture.oddsB;

    try {
      await placeWager({ fixtureId: fixture.id, choice, question: fixture.question, prediction, amount: capped, odds });
    } catch {
      setSubmitting(false);
      return;
    }

    setFixtures((prev) => prev.map((f) => (f.id === fixture.id ? { ...f, userVote: choice, userWager: capped } : f)));

    Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(() => {
      setWagerTarget(null);
      translateY.setValue(0);
      setSubmitting(false);
    });
  };

  const chosenOdds = wagerTarget ? (wagerTarget.choice === "A" ? wagerTarget.fixture.oddsA : wagerTarget.choice === "D" ? wagerTarget.fixture.oddsD : wagerTarget.fixture.oddsB) : 1;
  const chosenLabel = wagerTarget ? (wagerTarget.choice === "A" ? wagerTarget.fixture.teamA : wagerTarget.choice === "D" ? "Draw" : wagerTarget.fixture.teamB) : "";
  const parsedAmount = parseInt(wagerAmount, 10);
  const canConfirm = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= (user?.points ?? 0);
  const potentialPayout = canConfirm ? Math.floor(parsedAmount * chosenOdds) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Predict</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Upcoming fixtures</Text>
        </View>
        <View style={[styles.balancePill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>{user?.isBankrupt ? "Bankrupt" : "Available"}</Text>
          <Text style={[styles.balanceValue, { color: colors.foreground }]}>{(user?.points ?? 0).toLocaleString()} pts</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateWrap}><ActivityIndicator size="small" color={colors.mutedForeground} /></View>
      ) : (
        <FlatList<Fixture>
          data={fixtures}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FixtureCard fixture={item} onOpenWager={handleOpenWager} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={fixtures.length === 0 ? styles.emptyContent : { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}
          ListEmptyComponent={
            <View style={styles.stateWrap}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No fixtures yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Upcoming matches will appear here once they're available. Check back soon.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!wagerTarget} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable style={styles.modalDismiss} onPress={closeModal} />
          <Animated.View style={[styles.modalSheet, { backgroundColor: colors.background, transform: [{ translateY }] }]}>
            <View style={styles.handleWrap} {...panResponder.panHandlers}><View style={[styles.modalHandle, { backgroundColor: colors.border }]} /></View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Place a Pick</Text>
            <Text style={[styles.modalPick, { color: colors.mutedForeground }]}>{wagerTarget?.fixture.question}</Text>
            <View style={styles.teamOddsRow}>
              <View style={[styles.chosenTeamBadge, { backgroundColor: colors.primary }]}><Text style={[styles.chosenTeamText, { color: colors.primaryForeground }]}>{chosenLabel}</Text></View>
              <Text style={[styles.oddsTag, { color: colors.mutedForeground }]}>{chosenOdds}x multiplier</Text>
            </View>
            <Text style={[styles.wagerLabel, { color: colors.foreground }]}>How many points for your pick?</Text>
            <View style={styles.wagerInputRow}>
              <TextInput ref={inputRef} style={[styles.wagerInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]} value={wagerAmount} onChangeText={(t) => setWagerAmount(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" returnKeyType="done" blurOnSubmit maxLength={6} />
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setWagerAmount(String(user?.points ?? 0)); }} disabled={(user?.points ?? 0) <= 0} style={({ pressed }) => [styles.allInBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : (user?.points ?? 0) <= 0 ? 0.4 : 1 }]}>
                <Text style={[styles.allInText, { color: colors.foreground }]}>ALL IN</Text>
              </Pressable>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.balanceHint, { color: colors.mutedForeground }]}>Balance: {(user?.points ?? 0).toLocaleString()} pts</Text>
              {potentialPayout !== null && <Text style={[styles.payoutText, { color: colors.foreground }]}>Potential Payout: <Text style={styles.payoutNum}>{potentialPayout.toLocaleString()} pts</Text></Text>}
            </View>
            <Pressable onPress={handleConfirmWager} disabled={!canConfirm || submitting} style={({ pressed }) => [styles.confirmBtn, { backgroundColor: canConfirm ? colors.primary : colors.secondary, opacity: pressed && !submitting ? 0.8 : 1 }]}>
              {submitting ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={[styles.confirmBtnText, { color: canConfirm ? colors.primaryForeground : colors.mutedForeground }]}>Confirm Pick</Text>}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  balancePill: { alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  balanceLabel: { fontFamily: "Inter_400Regular", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  balanceValue: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: -0.3 },
  card: { paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1, gap: 10 },
  cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  competition: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 },
  kickoff: { fontFamily: "Inter_400Regular", fontSize: 12 },
  question: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  optionsCol: { gap: 7 },
  optionBtn: { borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionLabel: { fontFamily: "Inter_500Medium", fontSize: 14, flexShrink: 1 },
  optionOdds: { fontFamily: "Inter_700Bold", fontSize: 13, marginLeft: 8 },
  votesMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  stateWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 64, gap: 8 },
  emptyContent: { flexGrow: 1 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: -0.3 },
  emptyBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3, marginBottom: 6 },
  modalPick: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  teamOddsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  chosenTeamBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  chosenTeamText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  oddsTag: { fontFamily: "Inter_400Regular", fontSize: 13 },
  wagerLabel: { fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 10 },
  wagerInputRow: { flexDirection: "row", alignItems: "stretch", gap: 10, marginBottom: 10 },
  wagerInput: { flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.5, borderWidth: 1 },
  allInBtn: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  allInText: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 0.5 },
  metaRow: { gap: 4, marginBottom: 20 },
  balanceHint: { fontFamily: "Inter_400Regular", fontSize: 12 },
  payoutText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  payoutNum: { fontFamily: "Inter_700Bold", fontSize: 13 },
  confirmBtn: { paddingVertical: 15, borderRadius: 999, alignItems: "center" },
  confirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
});