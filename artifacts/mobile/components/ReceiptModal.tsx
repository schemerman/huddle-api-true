import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, Image } from "react-native";
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
  return flags[team] || "";
};

// FULLY EXPANDED DICTIONARY TO CATCH ALL API VARIATIONS
const getCrestUrl = (team: string): string | null => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Bournemouth": "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
    "AFC Bournemouth": "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
    "Brentford": "https://a.espncdn.com/i/teamlogos/soccer/500/139026.png",
    "Brighton": "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
    "Brighton and Hove Albion": "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
    "Brighton & Hove Albion": "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    "Crystal Palace": "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
    "Everton": "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
    "Fulham": "https://a.espncdn.com/i/teamlogos/soccer/500/370.png",
    "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Manchester City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Man United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Newcastle": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    "Newcastle United": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    "Nottm Forest": "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
    "Nottingham Forest": "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
    "Southampton": "https://a.espncdn.com/i/teamlogos/soccer/500/376.png",
    "Spurs": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Tottenham": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Tottenham Hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "West Ham": "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
    "West Ham United": "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
    "Wolves": "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
    "Wolverhampton Wanderers": "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
    "Leicester": "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
    "Leicester City": "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
    "Ipswich": "https://a.espncdn.com/i/teamlogos/soccer/500/374.png",
    "Ipswich Town": "https://a.espncdn.com/i/teamlogos/soccer/500/374.png",
    "Coventry": "https://a.espncdn.com/i/teamlogos/soccer/500/386.png",
    "Coventry City": "https://a.espncdn.com/i/teamlogos/soccer/500/386.png",
    "Hull": "https://a.espncdn.com/i/teamlogos/soccer/500/366.png",
    "Hull City": "https://a.espncdn.com/i/teamlogos/soccer/500/366.png",
    "Sheffield Utd": "https://a.espncdn.com/i/teamlogos/soccer/500/398.png",
    "Sheffield United": "https://a.espncdn.com/i/teamlogos/soccer/500/398.png",
    "Burnley": "https://a.espncdn.com/i/teamlogos/soccer/500/379.png",
    "Luton": "https://a.espncdn.com/i/teamlogos/soccer/500/394.png",
    "Luton Town": "https://a.espncdn.com/i/teamlogos/soccer/500/394.png",
    "Norwich": "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
    "Norwich City": "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
    "Watford": "https://a.espncdn.com/i/teamlogos/soccer/500/392.png",
    "Leeds": "https://a.espncdn.com/i/teamlogos/soccer/500/357.png",
    "Leeds United": "https://a.espncdn.com/i/teamlogos/soccer/500/357.png",
    "Sunderland": "https://a.espncdn.com/i/teamlogos/soccer/500/390.png",
    "West Brom": "https://a.espncdn.com/i/teamlogos/soccer/500/391.png",
    "West Bromwich Albion": "https://a.espncdn.com/i/teamlogos/soccer/500/391.png"
  };
  return crests[team] || null; 
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

  // ROUTING LOGIC: We set distinct keys so the destination screen knows to pick it up!
  const handleShareToHome = async () => {
    if (!wagerId) return;
    await AsyncStorage.setItem("pending_share_wager", wagerId);
    onClose();
    router.navigate("/");
  };

  const handleShareToHuddle = async () => {
    if (!wagerId) return;
    await AsyncStorage.setItem("pending_share_wager_huddle", wagerId);
    onClose();
    router.navigate("/huddles");
  };

  const handleShareToDM = async () => {
    if (!wagerId) return;
    await AsyncStorage.setItem("pending_share_wager_dm", wagerId);
    onClose();
    router.navigate("/messages" as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.receiptOverlay}>
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

                <Pressable onPress={handleShareToHuddle} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={16} color={colors.foreground} />
                  <Text style={[styles.receiptShareText, { color: colors.foreground }]}>Share to Huddle</Text>
                </Pressable>

                <Pressable onPress={handleShareToDM} style={[styles.receiptShareBtn, { backgroundColor: colors.secondary }]}>
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