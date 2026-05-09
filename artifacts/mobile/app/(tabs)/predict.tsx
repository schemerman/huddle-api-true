import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface Fixture {
  id: string;
  competition: string;
  kickoff: string;
  question: string;
  teamA: string;
  teamB: string;
  oddsA: number;
  oddsB: number;
  votesA: number;
  votesB: number;
  userVote?: "A" | "B";
  userWager?: number;
}

const SEED_FIXTURES: Fixture[] = [
  { id: "fx1", competition: "Premier League", kickoff: "Sat · 3:00 PM", question: "Who will win: Arsenal or Man City?", teamA: "Arsenal", teamB: "Man City", oddsA: 2.2, oddsB: 1.7, votesA: 142, votesB: 381 },
  { id: "fx2", competition: "Premier League", kickoff: "Sat · 12:30 PM", question: "Who will win: Liverpool or Chelsea?", teamA: "Liverpool", teamB: "Chelsea", oddsA: 1.5, oddsB: 2.8, votesA: 334, votesB: 198 },
  { id: "fx3", competition: "Premier League", kickoff: "Sun · 2:00 PM", question: "Who will win: Man United or Tottenham?", teamA: "Man United", teamB: "Tottenham", oddsA: 2.6, oddsB: 1.5, votesA: 201, votesB: 287 },
  { id: "fx4", competition: "Premier League", kickoff: "Sun · 4:30 PM", question: "Who will win: Newcastle or Aston Villa?", teamA: "Newcastle", teamB: "Aston Villa", oddsA: 1.9, oddsB: 2.0, votesA: 312, votesB: 256 },
  { id: "fx5", competition: "World Cup", kickoff: "Mon · 3:00 PM", question: "Who will win: Brazil or Germany?", teamA: "Brazil", teamB: "Germany", oddsA: 1.6, oddsB: 2.4, votesA: 489, votesB: 374 },
  { id: "fx6", competition: "World Cup", kickoff: "Mon · 6:00 PM", question: "Who will win: France or Argentina?", teamA: "France", teamB: "Argentina", oddsA: 1.8, oddsB: 2.1, votesA: 412, votesB: 501 },
  { id: "fx7", competition: "World Cup", kickoff: "Tue · 3:00 PM", question: "Who will win: Spain or Portugal?", teamA: "Spain", teamB: "Portugal", oddsA: 1.9, oddsB: 2.0, votesA: 398, votesB: 367 },
  { id: "fx8", competition: "World Cup", kickoff: "Tue · 6:00 PM", question: "Who will win: England or Netherlands?", teamA: "England", teamB: "Netherlands", oddsA: 2.3, oddsB: 1.6, votesA: 445, votesB: 321 },
];

const STORAGE_KEY = "huddle_fixtures_v4";

interface WagerTarget {
  fixture: Fixture;
  choice: "A" | "B";
}

function FixtureCard({
  fixture,
  onOpenWager,
}: {
  fixture: Fixture;
  onOpenWager: (fixture: Fixture, choice: "A" | "B") => void;
}) {
  const colors = useColors();
  const total = fixture.votesA + fixture.votesB;
  const pctA = total > 0 ? Math.round((fixture.votesA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const voted = !!fixture.userVote;

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.cardMeta}>
        <Text style={[styles.competition, { color: colors.mutedForeground }]}>{fixture.competition}</Text>
        <Text style={[styles.kickoff, { color: colors.mutedForeground }]}>{fixture.kickoff}</Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>{fixture.question}</Text>

      <View style={styles.pollRow}>
        <Pressable
          onPress={() => !voted && onOpenWager(fixture, "A")}
          style={({ pressed }) => [
            styles.pollBtn,
            {
              backgroundColor: fixture.userVote === "A" ? colors.primary : colors.secondary,
              borderColor: colors.border,
              opacity: pressed && !voted ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.pollBtnInner}>
            <Text
              style={[styles.pollBtnText, { color: fixture.userVote === "A" ? colors.primaryForeground : colors.foreground }]}
              numberOfLines={1}
            >
              {fixture.teamA}
            </Text>
            <Text style={[styles.odds, { color: fixture.userVote === "A" ? colors.primaryForeground : colors.mutedForeground }]}>
              {voted ? `${pctA}%` : `${fixture.oddsA}x`}
            </Text>
          </View>
        </Pressable>

        <View style={styles.vsDivider}>
          <Text style={[styles.vsText, { color: colors.mutedForeground }]}>vs</Text>
        </View>

        <Pressable
          onPress={() => !voted && onOpenWager(fixture, "B")}
          style={({ pressed }) => [
            styles.pollBtn,
            {
              backgroundColor: fixture.userVote === "B" ? colors.primary : colors.secondary,
              borderColor: colors.border,
              opacity: pressed && !voted ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.pollBtnInner}>
            <Text
              style={[styles.pollBtnText, { color: fixture.userVote === "B" ? colors.primaryForeground : colors.foreground }]}
              numberOfLines={1}
            >
              {fixture.teamB}
            </Text>
            <Text style={[styles.odds, { color: fixture.userVote === "B" ? colors.primaryForeground : colors.mutedForeground }]}>
              {voted ? `${pctB}%` : `${fixture.oddsB}x`}
            </Text>
          </View>
        </Pressable>
      </View>

      {voted && (
        <Text style={[styles.votesMeta, { color: colors.mutedForeground }]}>
          {(total + 1).toLocaleString()} predictions
          {fixture.userWager ? ` · ${fixture.userWager} pts wagered` : ""}
        </Text>
      )}
    </View>
  );
}

export default function PredictScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updatePoints } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [wagerTarget, setWagerTarget] = useState<WagerTarget | null>(null);
  const [wagerAmount, setWagerAmount] = useState("10");
  const inputRef = useRef<TextInput>(null);

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            setWagerTarget(null);
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setWagerTarget(null);
      translateY.setValue(0);
    });
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setFixtures(raw ? JSON.parse(raw) : SEED_FIXTURES);
    });
  }, []);

  useEffect(() => {
    if (!wagerTarget) translateY.setValue(0);
  }, [wagerTarget]);

  const saveFixtures = (next: Fixture[]) => {
    setFixtures(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleOpenWager = (fixture: Fixture, choice: "A" | "B") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWagerAmount("10");
    setWagerTarget({ fixture, choice });
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleConfirmWager = () => {
    if (!wagerTarget) return;
    const amount = parseInt(wagerAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    const capped = Math.min(amount, user?.points ?? 0);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const { fixture, choice } = wagerTarget;
    const next = fixtures.map((f) => {
      if (f.id !== fixture.id || f.userVote) return f;
      return {
        ...f,
        userVote: choice,
        userWager: capped,
        votesA: choice === "A" ? f.votesA + 1 : f.votesA,
        votesB: choice === "B" ? f.votesB + 1 : f.votesB,
      };
    });
    saveFixtures(next);
    updatePoints(-capped);

    Animated.timing(translateY, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setWagerTarget(null);
      translateY.setValue(0);
    });
  };

  const parsedAmount = parseInt(wagerAmount, 10);
  const chosenOdds =
    wagerTarget?.choice === "A"
      ? wagerTarget.fixture.oddsA
      : wagerTarget?.fixture.oddsB ?? 1;
  const chosenTeam =
    wagerTarget?.choice === "A"
      ? wagerTarget?.fixture.teamA
      : wagerTarget?.fixture.teamB;

  const canConfirm =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= (user?.points ?? 0);

  const potentialPayout =
    canConfirm ? Math.floor(parsedAmount * chosenOdds) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Predict</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Upcoming fixtures</Text>
        </View>
        <View style={[styles.balancePill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Available</Text>
          <Text style={[styles.balanceValue, { color: colors.foreground }]}>
            {(user?.points ?? 0).toLocaleString()} pts
          </Text>
        </View>
      </View>

      <FlatList<Fixture>
        data={fixtures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FixtureCard fixture={item} onOpenWager={handleOpenWager} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      />

      <Modal
        visible={!!wagerTarget}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
          <Pressable style={styles.modalDismiss} onPress={closeModal} />
          <Animated.View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, transform: [{ translateY }] },
            ]}
          >
            {/* Drag handle — pan gesture target */}
            <View style={styles.handleWrap} {...panResponder.panHandlers}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Place a Wager</Text>
            <Text style={[styles.modalPick, { color: colors.mutedForeground }]}>
              {wagerTarget?.fixture.question}
            </Text>

            <View style={styles.teamOddsRow}>
              <View style={[styles.chosenTeamBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.chosenTeamText, { color: colors.primaryForeground }]}>
                  {chosenTeam}
                </Text>
              </View>
              <Text style={[styles.oddsTag, { color: colors.mutedForeground }]}>
                {chosenOdds}x odds
              </Text>
            </View>

            <Text style={[styles.wagerLabel, { color: colors.foreground }]}>
              How many points do you want to wager?
            </Text>

            <TextInput
              ref={inputRef}
              style={[
                styles.wagerInput,
                {
                  backgroundColor: colors.secondary,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              value={wagerAmount}
              onChangeText={(t) => setWagerAmount(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              returnKeyType="done"
              blurOnSubmit
              maxLength={6}
            />

            <View style={styles.metaRow}>
              <Text style={[styles.balanceHint, { color: colors.mutedForeground }]}>
                Balance: {(user?.points ?? 0).toLocaleString()} pts
              </Text>
              {potentialPayout !== null && (
                <Text style={[styles.payoutText, { color: colors.foreground }]}>
                  Potential Payout:{" "}
                  <Text style={styles.payoutNum}>{potentialPayout.toLocaleString()} pts</Text>
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleConfirmWager}
              disabled={!canConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                {
                  backgroundColor: canConfirm ? colors.primary : colors.secondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  { color: canConfirm ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Confirm Wager
              </Text>
            </Pressable>
          </Animated.View>
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
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  balancePill: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  balanceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  balanceValue: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: -0.3 },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    gap: 10,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  competition: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  kickoff: { fontFamily: "Inter_400Regular", fontSize: 12 },
  question: { fontFamily: "Inter_600SemiBold", fontSize: 16, lineHeight: 22 },
  pollRow: { flexDirection: "row", alignItems: "center" },
  pollBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  pollBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  pollBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, flexShrink: 1 },
  odds: { fontFamily: "Inter_700Bold", fontSize: 12 },
  vsDivider: { paddingHorizontal: 10, alignItems: "center" },
  vsText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  votesMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  modalPick: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  teamOddsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  chosenTeamBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chosenTeamText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  oddsTag: { fontFamily: "Inter_400Regular", fontSize: 13 },
  wagerLabel: { fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 10 },
  wagerInput: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
    borderWidth: 1,
    marginBottom: 10,
  },
  metaRow: { gap: 4, marginBottom: 20 },
  balanceHint: { fontFamily: "Inter_400Regular", fontSize: 12 },
  payoutText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  payoutNum: { fontFamily: "Inter_700Bold", fontSize: 13 },
  confirmBtn: { paddingVertical: 15, borderRadius: 999, alignItems: "center" },
  confirmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
});
