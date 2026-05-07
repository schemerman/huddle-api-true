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
    competition: "Premier League",
    kickoff: "Sat · 12:30 PM",
    question: "Can Liverpool hold firm at Anfield?",
    teamA: "Liverpool",
    teamB: "Chelsea",
    votesA: 334,
    votesB: 198,
  },
  {
    id: "fx3",
    competition: "Premier League",
    kickoff: "Sun · 2:00 PM",
    question: "Who takes three points at Old Trafford?",
    teamA: "Man United",
    teamB: "Tottenham",
    votesA: 201,
    votesB: 287,
  },
  {
    id: "fx4",
    competition: "Premier League",
    kickoff: "Sun · 4:30 PM",
    question: "Will Newcastle edge it at St. James' Park?",
    teamA: "Newcastle",
    teamB: "Aston Villa",
    votesA: 312,
    votesB: 256,
  },
  {
    id: "fx5",
    competition: "World Cup",
    kickoff: "Mon · 3:00 PM",
    question: "Who takes the points in the Group A opener?",
    teamA: "Brazil",
    teamB: "Germany",
    votesA: 489,
    votesB: 374,
  },
  {
    id: "fx6",
    competition: "World Cup",
    kickoff: "Mon · 6:00 PM",
    question: "Can France defend their title here?",
    teamA: "France",
    teamB: "Argentina",
    votesA: 412,
    votesB: 501,
  },
  {
    id: "fx7",
    competition: "World Cup",
    kickoff: "Tue · 3:00 PM",
    question: "Will Spain control the midfield battle?",
    teamA: "Spain",
    teamB: "Portugal",
    votesA: 398,
    votesB: 367,
  },
  {
    id: "fx8",
    competition: "World Cup",
    kickoff: "Tue · 6:00 PM",
    question: "Can the Three Lions go deep in this tournament?",
    teamA: "England",
    teamB: "Netherlands",
    votesA: 445,
    votesB: 321,
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
