import React from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";
import { getCrestUrl, getFlag } from "@/utils/teams";

export type ReceiptCardProps = {
  question: string;
  finalResult: string;
  prediction: string;
  points: number;
  won: boolean;
  username: string;
  /** Image source for a team's badge. Defaults to the online badge; the share image passes preloaded copies. */
  crestFor?: (team: string) => string | null;
  /** Called when each badge image finishes loading (or fails), so the share image knows when to capture. */
  onCrestSettled?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

function parseTeams(question: string): [string, string] | null {
  if (!question.includes(" or ")) return null;
  const [a, b] = question.replace("Who will win: ", "").replace("?", "").split(" or ");
  return [a, b];
}

const hasScore = (finalResult: string) =>
  finalResult === "Pending" || finalResult === "Incorrect Pick" || finalResult.includes("-");

/** The teams whose badges the receipt shows, in order. Used to know how many images must load. */
export function receiptCrestTeams(question: string, finalResult: string, prediction: string): string[] {
  const teams: string[] = [];
  const pair = parseTeams(question);
  if (pair) teams.push(pair[0], pair[1]);
  if (!hasScore(finalResult)) teams.push(finalResult);
  if (prediction !== "Draw") teams.push(prediction);
  return teams;
}

/** The prediction receipt (HUDDLE, the match, final result, your pick, points, WON stamp). Shared by the app and the share image. */
export function ReceiptCard({ question, finalResult, prediction, points, won, username, crestFor = getCrestUrl, onCrestSettled, style, children }: ReceiptCardProps) {
  const colors = useColors();
  const crest = (team: string, size: number, extra: object) => {
    const uri = crestFor(team);
    return uri ? (
      <Image source={{ uri }} style={[{ width: size, height: size }, extra]} onLoad={onCrestSettled} onError={onCrestSettled} />
    ) : (
      <Text style={[{ fontSize: size - 2 }, extra]}>{getFlag(team) || "⚽"}</Text>
    );
  };

  const pair = parseTeams(question);
  const matchHeader = pair ? (
    <View style={styles.matchRow}>
      <Text style={[styles.question, { color: colors.foreground, marginBottom: 0 }]}>Who will win: </Text>
      {crest(pair[0], 20, { marginRight: 6 })}
      <Text style={[styles.question, { color: colors.foreground, marginBottom: 0 }]}>{pair[0]} or </Text>
      {crest(pair[1], 20, { marginRight: 6, marginLeft: 2 })}
      <Text style={[styles.question, { color: colors.foreground, marginBottom: 0 }]}>{pair[1]}?</Text>
    </View>
  ) : (
    <Text style={[styles.question, { color: colors.foreground }]}>{question}</Text>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.foreground }, style]}>
      <Text style={[styles.brand, { color: colors.foreground }]}>HUDDLE</Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>PREDICTION RECEIPT</Text>

      {matchHeader}

      <View style={styles.block}>
        <Text style={[styles.blockLabel, { color: colors.mutedForeground }]}>FINAL RESULT</Text>
        {hasScore(finalResult) ? (
          <Text style={[styles.blockValue, { color: colors.foreground }]}>{finalResult}</Text>
        ) : (
          <View style={styles.inlineRow}>
            {crest(finalResult, 18, { marginRight: 6 })}
            <Text style={[styles.blockValue, { color: colors.foreground }]}>{finalResult}</Text>
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={[styles.blockLabel, { color: colors.mutedForeground }]}>@{username} predicted</Text>
        <View style={styles.inlineRow}>
          {prediction === "Draw" ? (
            <Text style={[styles.blockValue, { color: colors.foreground }]}>⚖️ Draw</Text>
          ) : (
            <>
              {crest(prediction, 18, { marginRight: 6 })}
              <Text style={[styles.blockValue, { color: colors.foreground }]}>{prediction}</Text>
            </>
          )}
        </View>
      </View>

      <Text style={[styles.points, { color: colors.foreground }]}>
        {won ? "+" : "-"} {points} PTS
      </Text>

      <View
        style={[
          styles.stamp,
          won
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: colors.background, borderColor: colors.foreground },
        ]}
      >
        <Text style={[styles.stampText, { color: won ? colors.primaryForeground : colors.foreground }]}>{won ? "WON" : "FAILED"}</Text>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", maxWidth: 360, borderWidth: 2, borderRadius: 20, padding: 28, alignItems: "center" },
  brand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  rule: { width: 40, height: 2, marginTop: 14, marginBottom: 18 },
  kicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.5, marginBottom: 14 },
  question: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 25, textAlign: "center" },
  matchRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center", marginBottom: 22 },
  block: { alignItems: "center", marginBottom: 16 },
  inlineRow: { flexDirection: "row", alignItems: "center" },
  blockLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  blockValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  points: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, marginTop: 2, marginBottom: 12 },
  stamp: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 10, marginTop: 6, marginBottom: 18 },
  stampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
});
