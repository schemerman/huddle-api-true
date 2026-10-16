import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { SharePicker } from "@/components/SharePicker";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCrestUrl, getFlag } from "@/utils/teams";

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

  let matchHeader: React.ReactNode = <Text style={[styles.receiptQuestion, { color: colors.foreground }]}>{question}</Text>;

  if (question.includes(" or ")) {
    const teamsStr = question.replace("Who will win: ", "").replace("?", "");
    const [teamA, teamB] = teamsStr.split(" or ");
    
    const urlA = getCrestUrl(teamA);
    const flagA = getFlag(teamA);
    const urlB = getCrestUrl(teamB);
    const flagB = getFlag(teamB);

    matchHeader = (
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center", marginBottom: 22 }}>
        <Text style={[styles.receiptQuestion, { color: colors.foreground, marginBottom: 0 }]}>Who will win: </Text>
        {urlA ? <Image source={{ uri: urlA }} style={{ width: 20, height: 20, marginRight: 6 }} /> : <Text style={{ fontSize: 18, marginRight: 4 }}>{flagA || "⚽"}</Text>}
        <Text style={[styles.receiptQuestion, { color: colors.foreground, marginBottom: 0 }]}>{teamA} or </Text>
        {urlB ? <Image source={{ uri: urlB }} style={{ width: 20, height: 20, marginRight: 6, marginLeft: 2 }} /> : <Text style={{ fontSize: 18, marginRight: 4, marginLeft: 2 }}>{flagB || "⚽"}</Text>}
        <Text style={[styles.receiptQuestion, { color: colors.foreground, marginBottom: 0 }]}>{teamB}?</Text>
      </View>
    );
  }

  const isPendingResult = finalResult === "Pending" || finalResult === "Incorrect Pick" || finalResult.includes("-");
  const resultUrl = getCrestUrl(finalResult);
  const resultFlag = getFlag(finalResult);

  const predUrl = getCrestUrl(prediction);
  const predFlag = getFlag(prediction);

  // Huddle and DM shares pick a destination inside the receipt card.
  const [shareMode, setShareMode] = useState<"huddle" | "dm" | null>(null);
  useEffect(() => {
    if (!visible) setShareMode(null);
  }, [visible]);

  // Home picks the receipt up from storage and opens the post composer with it attached.
  const handleShareToHome = async () => {
    if (!wagerId) return;
    await AsyncStorage.setItem("pending_share_wager", wagerId);
    onClose();
    router.navigate("/(tabs)" as any);
  };

  const handleShared = (chatPath: string) => {
    setShareMode(null);
    onClose();
    router.push(chatPath as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.receiptOverlay}>
        {shareMode && wagerId ? (
          <View style={[styles.receiptCard, { backgroundColor: colors.background, borderColor: colors.foreground, alignItems: "stretch" }]}>
            <SharePicker mode={shareMode} wagerId={wagerId} onBack={() => setShareMode(null)} onSent={handleShared} />
          </View>
        ) : (
        <View style={[styles.receiptCard, { backgroundColor: colors.background, borderColor: colors.foreground }]}>
          <Text style={[styles.receiptBrand, { color: colors.foreground }]}>HUDDLE</Text>
          <View style={[styles.receiptRule, { backgroundColor: colors.border }]} />
          <Text style={[styles.receiptKicker, { color: colors.mutedForeground }]}>PREDICTION RECEIPT</Text>
          
          {matchHeader}

          <View style={styles.receiptBlock}>
            <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>FINAL RESULT</Text>
            {isPendingResult ? (
              <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{finalResult}</Text>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {resultUrl ? <Image source={{ uri: resultUrl }} style={{ width: 18, height: 18, marginRight: 6 }} /> : <Text style={{ fontSize: 16, marginRight: 6 }}>{resultFlag || "⚽"}</Text>}
                <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{finalResult}</Text>
              </View>
            )}
          </View>

          <View style={styles.receiptBlock}>
            <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>
              @{user?.username || "you"} predicted
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {prediction === "Draw" ? (
                <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>⚖️ Draw</Text>
              ) : (
                <>
                  {predUrl ? <Image source={{ uri: predUrl }} style={{ width: 18, height: 18, marginRight: 6 }} /> : <Text style={{ fontSize: 16, marginRight: 6 }}>{predFlag || "⚽"}</Text>}
                  <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{prediction}</Text>
                </>
              )}
            </View>
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
              <>
                <Pressable onPress={handleShareToHome} style={[styles.receiptShareBtn, { backgroundColor: colors.foreground }]}>
                  <Feather name="send" size={16} color={colors.background} />
                  <Text style={[styles.receiptShareText, { color: colors.background }]}>Share to Home</Text>
                </Pressable>

                <Pressable onPress={() => setShareMode("huddle")} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Share to Huddle</Text>
                </Pressable>

                <Pressable onPress={() => setShareMode("dm")} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="message-circle" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Send in DM</Text>
                </Pressable>
              </>
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
        )}
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
  receiptQuestion: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 25, textAlign: "center" },
  receiptBlock: { alignItems: "center", marginBottom: 16 },
  receiptBlockLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  receiptBlockValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  receiptPoints: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1, marginTop: 2, marginBottom: 12 },
  receiptStamp: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 10, marginTop: 6, marginBottom: 18 },
  receiptStampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  defaultActionContainer: { width: "100%", gap: 8, marginTop: 10 },
  receiptShareBtn: { flexDirection: "row", borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  receiptShareText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  receiptClose: { borderWidth: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  receiptCloseText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});