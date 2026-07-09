import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

// The same flag dictionary so the modal knows how to draw them!
const getFlag = (team: string) => {
  const flags: Record<string, string> = {
    "Argentina": "🇦🇷", "Australia": "🇦🇺", "Belgium": "🇧🇪", "Brazil": "🇧🇷",
    "Canada": "🇨🇦", "Colombia": "🇨🇴", "Croatia": "🇭🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷", "Ghana": "🇬🇭", "Morocco": "🇲🇦", "Norway": "🇳🇴",
    "Panama": "🇵🇦", "Portugal": "🇵🇹", "Qatar": "🇶🇦", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "Senegal": "🇸🇳", "Spain": "🇪🇸", "Switzerland": "🇨🇭", "USA": "🇺🇸",
    "Uzbekistan": "🇺🇿", "Algeria": "🇩🇿", "Bosnia & Herzegovina": "🇧🇦",
    "DR Congo": "🇨🇩", "Haiti": "🇭🇹", "Iraq": "🇮🇶", "Jordan": "🇯🇴",
    "Saudi Arabia": "🇸🇦", "South Africa": "🇿🇦", "Uruguay": "🇺🇾",
    "Czech Republic": "🇨🇿", "Draw": "⚖️"
  };
  return flags[team] || "🏳️";
};

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  question: string;
  finalResult: string;
  prediction: string;
  points: number;
  won: boolean;
}

export function ReceiptModal({
  visible,
  onClose,
  question,
  finalResult,
  prediction,
  points,
  won,
}: ReceiptModalProps) {
  const colors = useColors();
  const { user } = useAuth();

  // Clean up the question text to include flags
  let displayQuestion = question;
  if (question.includes(" or ")) {
    const teamsStr = question.replace("Who will win: ", "").replace("?", "");
    const [teamA, teamB] = teamsStr.split(" or ");
    displayQuestion = `Who will win:\n${getFlag(teamA)} ${teamA} vs ${getFlag(teamB)} ${teamB}?`;
  }

  // Add flags to the results and predictions if they are country names
  const displayFinalResult = finalResult === "Pending" || finalResult === "Incorrect Pick" || finalResult.includes("-") 
    ? finalResult 
    : `${getFlag(finalResult)} ${finalResult}`;
    
  const displayPrediction = prediction === "Draw" ? "⚖️ Draw" : `${getFlag(prediction)} ${prediction}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.receiptOverlay}>
        <View style={[styles.receiptCard, { backgroundColor: colors.background, borderColor: colors.foreground }]}>
          <Text style={[styles.receiptBrand, { color: colors.foreground }]}>HUDDLE</Text>
          <View style={[styles.receiptRule, { backgroundColor: colors.border }]} />
          <Text style={[styles.receiptKicker, { color: colors.mutedForeground }]}>PREDICTION RECEIPT</Text>
          <Text style={[styles.receiptQuestion, { color: colors.foreground }]}>{displayQuestion}</Text>

          <View style={styles.receiptBlock}>
            <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>FINAL RESULT</Text>
            <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{displayFinalResult}</Text>
          </View>
          <View style={styles.receiptBlock}>
            <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>
              @{user?.username || "you"} predicted
            </Text>
            <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{displayPrediction}</Text>
          </View>

          <Text style={[styles.receiptPoints, { color: colors.foreground }]}>
            {won ? "+" : "-"} {points} PTS
          </Text>

          <View
            style={[
              styles.receiptStamp,
              won
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.foreground },
            ]}
          >
            <Text style={[styles.receiptStampText, { color: won ? colors.primaryForeground : colors.foreground }]}>
              {won ? "WON" : "FAILED"}
            </Text>
          </View>

          <Text style={[styles.receiptFooter, { color: colors.mutedForeground }]}>
            Screenshot to share your call
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.receiptClose,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.receiptCloseText, { color: colors.foreground }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  receiptCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 2,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  receiptBrand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  receiptRule: { width: 40, height: 2, marginTop: 14, marginBottom: 18 },
  receiptKicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.5, marginBottom: 14 },
  receiptQuestion: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
    marginBottom: 22,
  },
  receiptBlock: { alignItems: "center", marginBottom: 16 },
  receiptBlockLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  receiptBlockValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  receiptPoints: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, marginTop: 2, marginBottom: 12 },
  receiptStamp: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 18,
  },
  receiptStampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  receiptFooter: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 22 },
  receiptClose: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 11,
    alignSelf: "stretch",
    alignItems: "center",
  },
  receiptCloseText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});