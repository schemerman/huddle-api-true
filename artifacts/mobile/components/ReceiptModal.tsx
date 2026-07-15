import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  wagerId?: string; 
}

export function ReceiptModal({
  visible,
  onClose,
  question,
  finalResult,
  prediction,
  points,
  won,
  wagerId,
}: ReceiptModalProps) {
  const colors = useColors();
  const { user } = useAuth();

  let displayQuestion = question;
  if (question.includes(" or ")) {
    const teamsStr = question.replace("Who will win: ", "").replace("?", "");
    const [teamA, teamB] = teamsStr.split(" or ");
    displayQuestion = `Who will win:\n${getFlag(teamA)} ${teamA} vs ${getFlag(teamB)} ${teamB}?`;
  }

  const displayFinalResult = finalResult === "Pending" || finalResult === "Incorrect Pick" || finalResult.includes("-") 
    ? finalResult 
    : `${getFlag(finalResult)} ${finalResult}`;
    
  const displayPrediction = prediction === "Draw" ? "⚖️ Draw" : `${getFlag(prediction)} ${prediction}`;

  // THE NEW SHARE LOGIC
  const handleShareToHome = async () => {
    if (!wagerId) return;
    // 1. Save the ID to local storage so the Home tab can grab it
    await AsyncStorage.setItem("pending_share_wager", wagerId);
    // 2. Close the modal
    onClose();
    // 3. Jump to the Home tab
    router.push("/(tabs)/index");
  };

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

          <View style={styles.defaultActionContainer}>
            {wagerId && (
              <Pressable
                onPress={handleShareToHome}
                style={[styles.receiptShareBtn, { backgroundColor: colors.foreground }]}
              >
                <Feather name="send" size={16} color={colors.background} />
                <Text style={[styles.receiptShareText, { color: colors.background }]}>Share to Home</Text>
              </Pressable>
            )}
            
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.receiptClose,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                !wagerId && { marginTop: 12 }
              ]}
            >
              <Text style={[styles.receiptCloseText, { color: colors.foreground }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  receiptOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  receiptCard: { width: "100%", maxWidth: 360, borderWidth: 2, borderRadius: 20, padding: 28, alignItems: "center" },
  receiptBrand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  receiptRule: { width: 40, height: 2, marginTop: 14, marginBottom: 18 },
  receiptKicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.5, marginBottom: 14 },
  receiptQuestion: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 25, textAlign: "center", marginBottom: 22 },
  receiptBlock: { alignItems: "center", marginBottom: 16 },
  receiptBlockLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  receiptBlockValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  receiptPoints: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, marginTop: 2, marginBottom: 12 },
  receiptStamp: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 10, marginTop: 6, marginBottom: 18 },
  receiptStampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  defaultActionContainer: { width: "100%", gap: 10, marginTop: 10 },
  receiptShareBtn: { flexDirection: "row", borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  receiptShareText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  receiptClose: { borderWidth: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  receiptCloseText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});