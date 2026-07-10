import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { PerformanceTitleBadge } from "./PerformanceTitleBadge";
import { Avatar } from "./Avatar";
import { supabase } from "@/lib/supabase";

export interface PublicProfileUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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

interface Props {
  user: PublicProfileUser | null;
  onClose: () => void;
}

export function PublicProfileModal({ user, onClose }: Props) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: 700,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            onClose();
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

  const [wagers, setWagers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = user?.userId;
    if (!id) {
      setWagers([]);
      setLoaded(false);
      return;
    }
    let active = true;
    setLoaded(false);

    const fetchPublicData = async () => {
      try {
        const { data: wagersData, error } = await supabase
          .from("wagers")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false });

        if (error || !wagersData) throw error;

        const fixtureIds = wagersData.map((w: any) => w.fixture_id || w.fixtureId).filter(Boolean);
        let fixturesMap: Record<string, any> = {};

        if (fixtureIds.length > 0) {
          const { data: fixturesData } = await supabase
            .from("fixtures")
            .select("*")
            .in("id", fixtureIds);

          if (fixturesData) {
            fixturesData.forEach((f: any) => {
              fixturesMap[f.id] = f;
            });
          }
        }

        const merged = wagersData.map((w: any) => {
          const f = fixturesMap[w.fixture_id || w.fixtureId];
          return {
            ...w,
            homeScore: f?.homeScore ?? f?.home_score,
            awayScore: f?.awayScore ?? f?.away_score,
            homeTeam: f?.homeTeam ?? f?.home_team,
            awayTeam: f?.awayTeam ?? f?.away_team,
          };
        });

        if (active) setWagers(merged);
      } catch (err) {
        if (active) setWagers([]);
      } finally {
        if (active) setLoaded(true);
      }
    };

    fetchPublicData();

    return () => {
      active = false;
    };
  }, [user?.userId]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: 700,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      translateY.setValue(0);
    });
  };

  return (
    <Modal
      visible={!!user}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      onDismiss={() => translateY.setValue(0)}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, transform: [{ translateY }] },
          ]}
        >
          <Pressable onPress={() => {}} style={styles.sheetInner}>
            <View style={styles.handleWrap} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.avatarWrap}>
              <Avatar
                color={user?.avatarColor ?? "#000"}
                username={user?.username ?? ""}
                size={80}
              />
            </View>

            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {user?.displayName}
            </Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>
              @{user?.username}
            </Text>
            {!!user && (
              <PerformanceTitleBadge winRate={user.winRate} style={styles.perfBadge} />
            )}

            <View
              style={[
                styles.statsRow,
                { borderTopColor: colors.border, borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}
              >
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {user?.points.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Points</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {user?.winRate}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Win Rate</Text>
              </View>
            </View>

            <View style={styles.wagersSection}>
              <Text style={[styles.wagersTitle, { color: colors.foreground }]}>Recent Picks</Text>
              {loaded && wagers.length === 0 ? (
                <Text style={[styles.wagersEmpty, { color: colors.mutedForeground }]}>
                  No activity yet
                </Text>
              ) : (
                <ScrollView
                  style={styles.wagersList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={wagers.length > 4}
                >
                  {wagers.map((w, i) => {
                    const won = w.status === "won";
                    const pick = w.prediction || w.choice;
                    
                    let matchText = w.question || "";
                    let actualResultText = null;

                    if (matchText.includes(" or ")) {
                      const teamsStr = matchText.replace("Who will win: ", "").replace("?", "");
                      const [teamA, teamB] = teamsStr.split(" or ");
                      const flagA = getFlag(teamA);
                      const flagB = getFlag(teamB);
                      
                      matchText = `${flagA ? flagA + " " : ""}${teamA} vs ${flagB ? flagB + " " : ""}${teamB}`;
                      
                      if (w.status !== "pending") {
                        const finalWinner = w.actual_result; 
                        const hScore = w.homeScore;
                        const aScore = w.awayScore;
                        const hTeam = w.homeTeam;
                        const aTeam = w.awayTeam;

                        // Use the exact new logic to format the score
                        if (hScore !== undefined && hScore !== null && aScore !== undefined && aScore !== null && hTeam && aTeam) {
                          const hFlag = getFlag(hTeam);
                          const aFlag = getFlag(aTeam);
                          const scoreLine = `${hScore} - ${aScore}`;

                          if (hScore === aScore) {
                            actualResultText = `⚖️ Draw (${scoreLine})`;
                          } else if (hScore > aScore) {
                            actualResultText = `${hFlag ? hFlag + " " : ""}${hTeam} Won (${scoreLine})`;
                          } else {
                            actualResultText = `${aFlag ? aFlag + " " : ""}${aTeam} Won (${scoreLine})`;
                          }
                        } else if (finalWinner) {
                          if (finalWinner.toLowerCase() === "draw") {
                            actualResultText = "⚖️ Draw";
                          } else {
                            const fFlag = getFlag(finalWinner);
                            actualResultText = `${fFlag ? fFlag + " " : ""}${finalWinner} Won`;
                          }
                        } else {
                          actualResultText = "Match Finished";
                        }
                      }
                    }

                    const pickFlag = getFlag(pick);

                    return (
                      <View
                        key={w.id}
                        style={[
                          styles.wagerRow,
                          { borderBottomColor: colors.border },
                          i === wagers.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={styles.wagerLeft}>
                          <Text style={[styles.wagerTeam, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                            {matchText}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                            Picked: {pickFlag ? pickFlag + " " : ""}{pick} ({w.amount} pts)
                          </Text>
                          {actualResultText && (
                            <Text style={{ color: won ? colors.primary : colors.foreground, fontSize: 13, marginTop: 4, fontFamily: "Inter_700Bold" }}>
                              {actualResultText}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.wagerBadge,
                            { backgroundColor: won ? colors.primary : colors.secondary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.wagerStatus,
                              {
                                color: won
                                  ? colors.primaryForeground
                                  : w.status === "lost"
                                  ? colors.mutedForeground
                                  : colors.foreground,
                              },
                            ]}
                          >
                            {statusLabel(w.status)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  sheetInner: { paddingHorizontal: 24, paddingBottom: 40, alignItems: "center" },
  handleWrap: { alignSelf: "stretch", alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  avatarWrap: { marginBottom: 16 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3, marginBottom: 4 },
  username: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 6 },
  perfBadge: { alignSelf: "center", marginBottom: 24 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, width: "100%", marginBottom: 24 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -0.8 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  wagersSection: { width: "100%", marginBottom: 20 },
  wagersTitle: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2, marginBottom: 12 },
  wagersList: { maxHeight: 250 },
  wagersEmpty: { fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 8 },
  wagerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  wagerLeft: { flex: 1, paddingRight: 12 },
  wagerTeam: { fontFamily: "Inter_400Regular", fontSize: 15 },
  wagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 10 },
  wagerStatus: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  closeBtn: { width: "100%", paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  closeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});