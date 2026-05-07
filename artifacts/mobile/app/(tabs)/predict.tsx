import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

interface Fixture {
  id: string;
  competition: string;
  kickoff: string;
  question: string;
  teamA: string;
  teamB: string;
  votesA: number;
  votesB: number;
  userVote?: "A" | "B";
}

const SEED_FIXTURES: Fixture[] = [
  {
    id: "fx1",
    competition: "Premier League",
    kickoff: "Sat · 3:00 PM",
    question: "Who wins at the Etihad?",
    teamA: "Arsenal",
    teamB: "Man City",
    votesA: 142,
    votesB: 381,
  },
  {
    id: "fx2",
    competition: "NBA",
    kickoff: "Fri · 10:30 PM",
    question: "Will Golden State take it at home?",
    teamA: "Golden State",
    teamB: "LA Lakers",
    votesA: 267,
    votesB: 189,
  },
  {
    id: "fx3",
    competition: "La Liga",
    kickoff: "Sat · 8:00 PM",
    question: "Can Atlético hold out at the Bernabéu?",
    teamA: "Real Madrid",
    teamB: "Atletico",
    votesA: 412,
    votesB: 208,
  },
  {
    id: "fx4",
    competition: "The Ashes",
    kickoff: "Thu · 11:00 AM",
    question: "Who takes the first Test?",
    teamA: "England",
    teamB: "Australia",
    votesA: 198,
    votesB: 321,
  },
  {
    id: "fx5",
    competition: "Champions League",
    kickoff: "Wed · 8:00 PM",
    question: "Does Bayern progress from the tie?",
    teamA: "Bayern Munich",
    teamB: "PSG",
    votesA: 334,
    votesB: 299,
  },
  {
    id: "fx6",
    competition: "Six Nations",
    kickoff: "Sat · 2:15 PM",
    question: "Will Ireland continue their Grand Slam run?",
    teamA: "Ireland",
    teamB: "France",
    votesA: 410,
    votesB: 378,
  },
  {
    id: "fx7",
    competition: "ATP Madrid Open",
    kickoff: "Sun · 2:00 PM",
    question: "Can Sinner beat Alcaraz on clay?",
    teamA: "Sinner",
    teamB: "Alcaraz",
    votesA: 221,
    votesB: 445,
  },
  {
    id: "fx8",
    competition: "Serie A",
    kickoff: "Sun · 7:45 PM",
    question: "Who wins the Milan derby?",
    teamA: "AC Milan",
    teamB: "Inter Milan",
    votesA: 287,
    votesB: 312,
  },
];

const STORAGE_KEY = "huddle_fixtures";

function FixtureCard({
  fixture,
  onVote,
}: {
  fixture: Fixture;
  onVote: (id: string, choice: "A" | "B") => void;
}) {
  const colors = useColors();
  const total = fixture.votesA + fixture.votesB;
  const pctA = total > 0 ? Math.round((fixture.votesA / total) * 100) : 50;
  const pctB = 100 - pctA;

  const handleVote = (choice: "A" | "B") => {
    if (fixture.userVote) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVote(fixture.id, choice);
  };

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.cardMeta}>
        <Text style={[styles.competition, { color: colors.mutedForeground }]}>
          {fixture.competition}
        </Text>
        <Text style={[styles.kickoff, { color: colors.mutedForeground }]}>
          {fixture.kickoff}
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>
        {fixture.question}
      </Text>

      <View style={styles.pollRow}>
        <Pressable
          onPress={() => handleVote("A")}
          style={({ pressed }) => [
            styles.pollBtn,
            {
              backgroundColor:
                fixture.userVote === "A" ? colors.primary : colors.secondary,
              borderColor: colors.border,
              opacity: pressed && !fixture.userVote ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.pollBtnText,
              {
                color:
                  fixture.userVote === "A"
                    ? colors.primaryForeground
                    : colors.foreground,
              },
            ]}
            numberOfLines={1}
          >
            {fixture.teamA}
          </Text>
          {fixture.userVote && (
            <Text
              style={[
                styles.pollPct,
                {
                  color:
                    fixture.userVote === "A"
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {pctA}%
            </Text>
          )}
        </Pressable>

        <View style={[styles.vsDivider]}>
          <Text style={[styles.vsText, { color: colors.mutedForeground }]}>vs</Text>
        </View>

        <Pressable
          onPress={() => handleVote("B")}
          style={({ pressed }) => [
            styles.pollBtn,
            {
              backgroundColor:
                fixture.userVote === "B" ? colors.primary : colors.secondary,
              borderColor: colors.border,
              opacity: pressed && !fixture.userVote ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.pollBtnText,
              {
                color:
                  fixture.userVote === "B"
                    ? colors.primaryForeground
                    : colors.foreground,
              },
            ]}
            numberOfLines={1}
          >
            {fixture.teamB}
          </Text>
          {fixture.userVote && (
            <Text
              style={[
                styles.pollPct,
                {
                  color:
                    fixture.userVote === "B"
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {pctB}%
            </Text>
          )}
        </Pressable>
      </View>

      {fixture.userVote && (
        <Text style={[styles.votesMeta, { color: colors.mutedForeground }]}>
          {(total + 1).toLocaleString()} predictions
        </Text>
      )}
    </View>
  );
}

export default function PredictScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setFixtures(raw ? JSON.parse(raw) : SEED_FIXTURES);
    });
  }, []);

  const handleVote = (id: string, choice: "A" | "B") => {
    const next = fixtures.map((f) => {
      if (f.id !== id || f.userVote) return f;
      return {
        ...f,
        userVote: choice,
        votesA: choice === "A" ? f.votesA + 1 : f.votesA,
        votesB: choice === "B" ? f.votesB + 1 : f.votesB,
      };
    });
    setFixtures(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Predict</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Upcoming fixtures
          </Text>
        </View>
      </View>

      <FlatList<Fixture>
        data={fixtures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FixtureCard fixture={item} onVote={handleVote} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
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
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 1,
  },
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
  kickoff: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  question: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  pollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  pollBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  pollBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    flexShrink: 1,
  },
  pollPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  vsDivider: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  vsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  votesMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
