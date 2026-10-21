import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getCrestUrl, getFlag } from "@/utils/teams";

export type ShareableReceiptProps = {
  question: string;
  finalResult: string;
  prediction: string;
  points: number;
  won: boolean;
  username: string;
};

export const SHARE_URL = "https://huddle-app.vercel.app";

function Crest({ team, size }: { team: string; size: number }) {
  const url = getCrestUrl(team);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />;
  return <Text style={{ fontSize: size * 0.8 }}>{team === "Draw" ? "⚖️" : getFlag(team) || "⚽"}</Text>;
}

// A 9:16 story-sized receipt (360×640, saved at 3× = 1080×1920) for WhatsApp, Instagram Stories, Snapchat.
// Plain colours only (no transparency) so it looks the same in every app it's shared to.
export const ShareableReceipt = forwardRef<View, ShareableReceiptProps>(function ShareableReceipt(
  { question, finalResult, prediction, points, won, username },
  ref
) {
  const teams = question.includes(" or ") ? question.replace("Who will win: ", "").replace("?", "").split(" or ") : null;

  return (
    <View ref={ref} collapsable={false} style={styles.story}>
      <View style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.brand}>HUDDLE</Text>
          <View style={styles.rule} />
          <Text style={styles.kicker}>PREDICTION RECEIPT</Text>
        </View>

        <View style={styles.middle}>
          {teams ? (
            <View style={styles.match}>
              <View style={styles.team}>
                <Crest team={teams[0]} size={52} />
                <Text style={styles.teamName} numberOfLines={2}>{teams[0]}</Text>
              </View>
              <Text style={styles.vs}>vs</Text>
              <View style={styles.team}>
                <Crest team={teams[1]} size={52} />
                <Text style={styles.teamName} numberOfLines={2}>{teams[1]}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.question}>{question}</Text>
          )}

          <View style={styles.block}>
            <Text style={styles.label}>FINAL RESULT</Text>
            <Text style={styles.value}>{finalResult}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>@{username} PREDICTED</Text>
            <View style={styles.pickRow}>
              <Crest team={prediction} size={22} />
              <Text style={styles.value}>{prediction === "Draw" ? "Draw" : prediction}</Text>
            </View>
          </View>

          <Text style={styles.points}>{won ? "+" : "-"} {points.toLocaleString()} PTS</Text>
          <View style={[styles.stamp, won ? styles.stampWon : styles.stampLost]}>
            <Text style={[styles.stampText, won ? styles.stampTextWon : styles.stampTextLost]}>{won ? "WON" : "MISSED"}</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.cta}>Think you can beat me?</Text>
          <Text style={styles.join}>Join me on Huddle</Text>
          <Text style={styles.url}>{SHARE_URL.replace("https://", "")}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  story: { width: 360, height: 640, backgroundColor: "#FFFFFF", padding: 20 },
  card: {
    flex: 1, borderWidth: 2, borderColor: "#000000", borderRadius: 24, backgroundColor: "#FFFFFF",
    paddingVertical: 28, paddingHorizontal: 22, alignItems: "center", justifyContent: "space-between",
  },
  top: { alignItems: "center" },
  brand: { fontFamily: "Inter_700Bold", fontSize: 34, letterSpacing: -0.5, color: "#000000" },
  rule: { width: 44, height: 2, backgroundColor: "#E5E5EA", marginTop: 12, marginBottom: 12 },
  kicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.8, color: "#8A8A8A" },
  middle: { alignItems: "center", width: "100%", gap: 14 },
  match: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", gap: 10 },
  team: { flex: 1, alignItems: "center", gap: 8 },
  teamName: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center", color: "#000000" },
  vs: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#8A8A8A" },
  question: { fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center", color: "#000000" },
  block: { alignItems: "center", gap: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, color: "#8A8A8A" },
  value: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center", color: "#000000" },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  points: { fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: 1, color: "#000000", marginTop: 4 },
  stamp: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 30, paddingVertical: 10 },
  stampWon: { backgroundColor: "#000000", borderColor: "#000000" },
  stampLost: { backgroundColor: "#FFFFFF", borderColor: "#000000" },
  stampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  stampTextWon: { color: "#FFFFFF" },
  stampTextLost: { color: "#000000" },
  bottom: { alignItems: "center", gap: 2 },
  cta: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#000000" },
  join: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#000000" },
  url: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#8A8A8A", marginTop: 2 },
});
