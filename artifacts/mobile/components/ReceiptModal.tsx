import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, TextInput, Alert, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

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
  wagerId?: string; // NEW: Added so we can link the post to the wager!
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
  
  // New state for the sharing flow
  const [isSharing, setIsSharing] = useState(false);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleClose = () => {
    // Reset state when closing so it's fresh for the next time
    setIsSharing(false);
    setCaption("");
    onClose();
  };

  const submitShare = async () => {
    if (!user || !wagerId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: caption.trim() || (won ? "Easiest points of my life! 💰" : "Can't believe this happened... 🤦‍♂️"),
        wager_id: wagerId
      });

      if (error) throw error;

      Alert.alert("Posted!", "Your receipt is now on the Home feed.");
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Could not share this receipt. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
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

          {/* THE NEW SHARING UI */}
          {isSharing ? (
            <View style={styles.shareContainer}>
              <TextInput
                style={[styles.captionInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="Add a caption..."
                placeholderTextColor={colors.mutedForeground}
                value={caption}
                onChangeText={setCaption}
                maxLength={120}
                autoFocus
              />
              <View style={styles.shareActionRow}>
                <Pressable onPress={() => setIsSharing(false)} style={styles.shareCancelBtn}>
                  <Text style={[styles.shareCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={submitShare} 
                  disabled={isSubmitting}
                  style={[styles.shareSubmitBtn, { backgroundColor: colors.foreground }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Text style={[styles.shareSubmitText, { color: colors.background }]}>Post to Home</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.defaultActionContainer}>
              {wagerId && (
                <Pressable
                  onPress={() => setIsSharing(true)}
                  style={[styles.receiptShareBtn, { backgroundColor: colors.foreground }]}
                >
                  <Feather name="send" size={16} color={colors.background} />
                  <Text style={[styles.receiptShareText, { color: colors.background }]}>Share to Home</Text>
                </Pressable>
              )}
              
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.receiptClose,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  !wagerId && { marginTop: 12 }
                ]}
              >
                <Text style={[styles.receiptCloseText, { color: colors.foreground }]}>Close</Text>
              </Pressable>
            </View>
          )}

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

  shareContainer: { width: "100%", marginTop: 10 },
  captionInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontFamily: "Inter_400Regular", fontSize: 15, marginBottom: 12 },
  shareActionRow: { flexDirection: "row", gap: 10 },
  shareCancelBtn: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  shareCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  shareSubmitBtn: { flex: 1.5, borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  shareSubmitText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});