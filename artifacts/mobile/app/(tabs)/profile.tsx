import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import palette from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { ReceiptModal } from "@/components/ReceiptModal";
import { supabase } from "@/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

function statusLabel(status: string): string {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "Pending";
}

// NEW ALGORITHM: Requires both Win Rate AND Sample Size
export const getRank = (winRate: number, totalPicks: number = 0) => {
  if (totalPicks < 5) return "Rookie";
  if (winRate >= 95 && totalPicks >= 30) return "Oracle";
  if (winRate >= 85 && totalPicks >= 25) return "GOAT";
  if (winRate >= 70 && totalPicks >= 15) return "Champion";
  if (winRate >= 60 && totalPicks >= 10) return "All Star";
  if (winRate >= 50) return "Starter";
  if (winRate >= 35) return "Coin Flipper";
  if (winRate >= 20) return "Beginner's Luck";
  return "Benchwarmer";
};

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

const getFinalResult = (wager: any): string => {
  if (!wager) return "Unknown";
  if (wager.status === "pending") return "Pending";
  
  if (wager.homeScore !== undefined && wager.homeScore !== null && wager.awayScore !== undefined && wager.awayScore !== null) {
      const scoreLine = `${wager.homeScore} - ${wager.awayScore}`;

      if (wager.homeScore === wager.awayScore) {
          return `⚖️ Draw (${scoreLine})`;
      } 
      else if (wager.homeScore > wager.awayScore) {
          return `${wager.homeTeam} Won (${scoreLine})`;
      } 
      else {
          return `${wager.awayTeam} Won (${scoreLine})`;
      }
  }

  const finalWinner = wager.actual_result;
  if (finalWinner) {
      if (finalWinner.toLowerCase() === "draw") return "⚖️ Draw";
      return `${finalWinner} Won`;
  }

  return "Match Finished";
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, claimDailyBonus } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<"stats" | "wagers">("stats");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [receiptWager, setReceiptWager] = useState<any | null>(null);
  const [wagers, setWagers] = useState<any[]>([]);
  const [wagersLoaded, setWagersLoaded] = useState(false);
  
  const [isBonusLocked, setIsBonusLocked] = useState(true);
  const [visualPoints, setVisualPoints] = useState(user?.points || 0);

  useEffect(() => {
    if (user?.points !== undefined) {
      setVisualPoints(user.points);
    }
  }, [user?.points]);

  useEffect(() => {
    const checkLock = async () => {
      try {
        const lastClaim = await AsyncStorage.getItem('last_bonus_claim_time');
        if (lastClaim) {
          const timePassed = Date.now() - parseInt(lastClaim, 10);
          if (timePassed < DAY_MS) {
            setIsBonusLocked(true);
          } else {
            setIsBonusLocked(false);
            await AsyncStorage.removeItem('last_bonus_claim_time');
          }
        } else {
          setIsBonusLocked(false);
        }
      } catch (e) {
        setIsBonusLocked(false);
      }
    };
    checkLock();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let isMounted = true;

      const fetchFreshData = async () => {
        try {
          const { data: wagersData, error } = await supabase
            .from("wagers")
            .select("*")
            .eq("user_id", user.id)
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

          const mergedWagers = wagersData.map((w: any) => {
            const f = fixturesMap[w.fixture_id || w.fixtureId];
            return {
              ...w,
              homeScore: f?.homeScore ?? f?.home_score,
              awayScore: f?.awayScore ?? f?.away_score,
              homeTeam: f?.homeTeam ?? f?.home_team,
              awayTeam: f?.awayTeam ?? f?.away_team,
            };
          });

          if (isMounted) setWagers(mergedWagers);
        } catch {
        } finally {
          if (isMounted) setWagersLoaded(true);
        }
      };

      fetchFreshData();

      return () => {
        isMounted = false;
      };
    }, [user?.id])
  );

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to sign out?");
      if (confirmLogout) {
        await logout();
        router.replace("/(auth)/login");
      }
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
      ]);
    }
  };

  if (!user) return null;

  const completedWagers = wagers.filter(w => w.status === "won" || w.status === "lost");
  const wonWagers = completedWagers.filter(w => w.status === "won");
  const safeWinRate = wagers.length > 0 
    ? Math.round((wonWagers.length / wagers.length) * 100) 
    : 0;

  let safeStreak = 0;
  for (const w of wagers) {
    if (w.status === "won") safeStreak++;
    else if (w.status === "lost") break;
  }

  const isEmail = (str: string) => str?.includes("@");
  const isUUID = (str: string) => str?.length > 20;

  const activeUser = user as any;
  const safeEmail = activeUser.email || "No Email";
  const safeUsername = (activeUser.username && !isEmail(activeUser.username) && !isUUID(activeUser.username)) ? activeUser.username : "player";
  const safeDisplayName = activeUser.display_name || activeUser.displayName || safeUsername || "Player";
  const safeColor = activeUser.avatar_color || activeUser.avatarColor || colors.primary;

  const safeWagersCount = wagers?.length || 0;

  const handleDailyBonus = async () => {
    if (isBonusLocked) return;
    
    setIsBonusLocked(true);
    setVisualPoints((prev: number) => prev + 100);
    
    await AsyncStorage.setItem('last_bonus_claim_time', Date.now().toString());
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      window.alert("Daily bonus claimed! +100 points.");
    }

    try {
      await claimDailyBonus();
    } catch (error) {
      console.log("Backend sync running quietly in background.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}>
        
        <View style={styles.heroSection}>
          <Avatar color={safeColor} username={safeUsername} size={80} highlight={safeStreak >= 3} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{safeDisplayName}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{safeUsername}</Text>
            <View style={styles.perfRow}>
              
              <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
                {/* ALGORITHM USES BOTH WIN RATE AND TOTAL WAGERS */}
                <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(safeWinRate, safeWagersCount)}</Text>
              </View>

              {safeStreak >= 3 && <Text style={[styles.streakText, { color: colors.mutedForeground }]}>{safeStreak}-streak heater</Text>}
            </View>
            {!!user.dob && <Text style={[styles.dob, { color: colors.mutedForeground }]}>Born {user.dob}</Text>}
          </View>
        </View>

        {user.isBankrupt && (
          <View style={[styles.bankruptBanner, { borderColor: palette.light.crimson }]}>
            <Text style={[styles.bankruptTag, { color: palette.light.crimson }]}>BANKRUPT</Text>
            <Text style={[styles.bankruptSub, { color: colors.mutedForeground }]}>Rebuild past 500 pts to clear this status.</Text>
          </View>
        )}

        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{safeWinRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
          </View>
          <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{visualPoints.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{safeWagersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PICKS</Text>
          </View>
        </View>

        <Pressable
          onPress={handleDailyBonus}
          disabled={isBonusLocked}
          style={({ pressed }) => ({
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 15,
            marginHorizontal: 16,
            marginTop: 20,
            marginBottom: 8,
            borderRadius: 999,
            borderWidth: 1,
            backgroundColor: !isBonusLocked ? "#FFFFFF" : "#F4F4F5",
            borderColor: !isBonusLocked ? "#E5E5EA" : "#E5E5EA",
            opacity: isBonusLocked ? 0.6 : (pressed ? 0.7 : 1),
          })}
        >
          <Feather name="gift" size={16} color={!isBonusLocked ? colors.foreground : "#8E8E93"} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, marginLeft: 8, color: !isBonusLocked ? colors.foreground : "#8E8E93" }}>
            {!isBonusLocked ? "Claim Daily Bonus" : "Bonus Claimed"}
          </Text>
        </Pressable>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["stats", "wagers"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>{t === "stats" ? "Stats" : "Picks"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "stats" ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
              <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
                <View style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <Feather name="mail" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{safeEmail}</Text>
                </View>
                <View style={styles.settingsRow}>
                  <Feather name="at-sign" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>@{safeUsername}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
              <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
                <Pressable onPress={() => setAgreementOpen(true)} style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
                  <Feather name="file-text" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Privacy Policy</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
                <Pressable 
                  onPress={() => Linking.openURL('mailto:huddleappsupport@gmail.com?subject=Huddle App Feedback')} 
                  style={styles.settingsRow}
                >
                  <Feather name="message-square" size={18} color={colors.foreground} />
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Give Feedback</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={handleLogout} style={[styles.signOutBtn, { borderColor: colors.border }]}>
              <Feather name="log-out" size={16} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.wagersSection}>
            <Text style={[styles.wagersHeading, { color: colors.foreground }]}>Recent Picks</Text>
            {wagersLoaded && wagers.length === 0 ? (
              <Text style={[styles.wagersEmpty, { color: colors.mutedForeground }]}>No picks placed yet. Go make a call on the Predict tab.</Text>
            ) : (
              wagers.map((w, i) => {
                const completed = w.status === "won" || w.status === "lost";
                const won = w.status === "won";
                
                let displayQuestion: React.ReactNode = w.question || "";
                if (typeof displayQuestion === "string" && displayQuestion.includes(" or ")) {
                  const teamsStr = displayQuestion.replace("Who will win: ", "").replace("?", "");
                  const [teamA, teamB] = teamsStr.split(" or ");
                  const aUrl = getCrestUrl(teamA);
                  const aFlag = getFlag(teamA);
                  const bUrl = getCrestUrl(teamB);
                  const bFlag = getFlag(teamB);
                  displayQuestion = (
                    <Text>
                      {aUrl ? <Image source={{ uri: aUrl as string }} style={{ width: 14, height: 14 }} /> : (aFlag || "⚽")} {teamA} vs {bUrl ? <Image source={{ uri: bUrl as string }} style={{ width: 14, height: 14 }} /> : (bFlag || "⚽")} {teamB}
                    </Text>
                  );
                }

                return (
                  <Pressable key={w.id} onPress={completed ? () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReceiptWager(w); } : undefined} style={({ pressed }) => [styles.wagerRow, { borderBottomColor: colors.border }, i === wagers.length - 1 && { borderBottomWidth: 0 }, { opacity: pressed && completed ? 0.6 : 1 }]}>
                    <View style={styles.wagerLeft}>
                      <Text style={[styles.wagerTeam, { color: colors.foreground }]}>{w.amount} pts on {w.prediction || w.choice}</Text>
                      <Text style={[styles.wagerFixture, { color: colors.mutedForeground }]}>{displayQuestion}</Text>
                    </View>
                    <View style={styles.wagerRight}>
                      <View style={[styles.wagerBadge, { backgroundColor: won ? colors.primary : colors.secondary }]}>
                        <Text style={[styles.wagerStatus, { color: won ? colors.primaryForeground : w.status === "lost" ? colors.mutedForeground : colors.foreground }]}>{statusLabel(w.status)}</Text>
                      </View>
                      {completed && <Feather name="share" size={15} color={colors.mutedForeground} />}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={agreementOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setAgreementOpen(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background, maxHeight: "90%" }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Terms & Privacy</Text>
              <Pressable onPress={() => setAgreementOpen(false)}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.agreementScroll}>
              
              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>1. No Real Money Gambling</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                Huddle is a strictly free-to-play sports prediction simulator. The "Points" used within this application have absolutely no real-world cash value, cannot be purchased with real money, and cannot be redeemed, withdrawn, or exchanged for cash, prizes, or goods of any kind. 
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>2. User-Generated Content (UGC)</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                By posting on the Home feed, you agree to treat the community with respect. We have a zero-tolerance policy for objectionable content. You may not post content that is unlawful, defamatory, harassing, abusive, fraudulent, obscenely offensive, or contains hate speech. Violating these terms will result in an immediate and permanent account ban.
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>3. Virtual Economy & Bankrolls</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                Huddle reserves the right to modify, wipe, reset, or balance the virtual points economy at any time without prior notice to ensure a fair competitive environment for all users. Exploiting bugs to generate points is strictly prohibited.
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>4. Data Privacy</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                We collect basic account information (such as your email and username) strictly for authentication and account recovery purposes. Your prediction history and public posts are visible to other users. We do not sell your personal data to third parties. 
              </Text>

              <Text style={[styles.agreementHeading, { color: colors.foreground }]}>5. Account Termination</Text>
              <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>
                We reserve the right to suspend or terminate your access to the app at our sole discretion, at any time, and without notice, including if we believe you have violated this Agreement.
              </Text>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReceiptModal 
        visible={!!receiptWager} 
        onClose={() => setReceiptWager(null)} 
        question={receiptWager?.question ?? ""} 
        finalResult={getFinalResult(receiptWager)} 
        prediction={receiptWager?.prediction || receiptWager?.choice || ""} 
        points={receiptWager?.status === "won" ? receiptWager.payout : receiptWager?.amount ?? 0} 
        won={receiptWager?.status === "won"} 
        wagerId={receiptWager?.id} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  heroSection: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  heroText: { flex: 1 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  perfRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  streakText: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
  dob: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  rankBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 6 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bankruptBanner: { marginHorizontal: 16, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12 },
  bankruptTag: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 2 },
  bankruptSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -1 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4, marginTop: 20 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  section: { paddingTop: 24, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1 },
  settingsGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 },
  settingsLabel: { fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 999, borderColor: "#E8E8E8" },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FF3B30" },
  wagersSection: { paddingHorizontal: 16, paddingTop: 20 },
  wagersHeading: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2, marginBottom: 14 },
  wagersEmpty: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, paddingVertical: 8 },
  wagerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1 },
  wagerLeft: { flex: 1 },
  wagerTeam: { fontFamily: "Inter_400Regular", fontSize: 14 },
  wagerFixture: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  wagerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  wagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 12 },
  wagerStatus: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "80%" },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  agreementScroll: { flexGrow: 0 },
  agreementHeading: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 6, marginTop: 14 },
  agreementText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
});