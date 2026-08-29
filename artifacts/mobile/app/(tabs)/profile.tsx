import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, Linking, Image, FlatList } from "react-native";
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
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️" };
  return flags[team] || ""; 
};

const getCrestUrl = (team: string): string | null => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png", "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Spurs": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png", "Tottenham Hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Brentford": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Brentford_FC_crest.svg/1200px-Brentford_FC_crest.svg.png",
    "Ipswich Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Ipswich_Town.svg/1200px-Ipswich_Town.svg.png",
    "Hull City": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Hull_City_A.F.C._logo.svg/1200px-Hull_City_A.F.C._logo.svg.png",
    "Sunderland": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Logo_Sunderland.svg/1200px-Logo_Sunderland.svg.png",
    "Coventry City": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Coventry_City_FC_logo.svg/1200px-Coventry_City_FC_logo.svg.png"
  };
  return crests[team] || null; 
};

const getFinalResult = (wager: any): string => {
  if (!wager) return "Unknown";
  if (wager.status === "pending") return "Pending";
  if (wager.homeScore !== undefined && wager.homeScore !== null && wager.awayScore !== undefined && wager.awayScore !== null) {
      const scoreLine = `${wager.homeScore} - ${wager.awayScore}`;
      if (wager.homeScore === wager.awayScore) return `⚖️ Draw (${scoreLine})`;
      else if (wager.homeScore > wager.awayScore) return `${wager.homeTeam} Won (${scoreLine})`;
      else return `${wager.awayTeam} Won (${scoreLine})`;
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

  const [tab, setTab] = useState<"stats" | "wagers" | "posts">("stats");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [receiptWager, setReceiptWager] = useState<any | null>(null);
  
  const [socialModal, setSocialModal] = useState<{ visible: boolean; type: 'followers' | 'following'; data: any[] }>({ visible: false, type: 'followers', data: [] });
  
  const [wagers, setWagers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [wagersLoaded, setWagersLoaded] = useState(false);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isBonusLocked, setIsBonusLocked] = useState(true);
  const [visualPoints, setVisualPoints] = useState(user?.points || 0);

  useEffect(() => {
    if (user?.points !== undefined) setVisualPoints(user.points);
  }, [user?.points]);

  useEffect(() => {
    const checkLock = async () => {
      try {
        const lastClaim = await AsyncStorage.getItem('last_bonus_claim_time');
        if (lastClaim) {
          const timePassed = Date.now() - parseInt(lastClaim, 10);
          if (timePassed < DAY_MS) setIsBonusLocked(true);
          else { setIsBonusLocked(false); await AsyncStorage.removeItem('last_bonus_claim_time'); }
        } else {
          setIsBonusLocked(false);
        }
      } catch (e) { setIsBonusLocked(false); }
    };
    checkLock();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let isMounted = true;

      const fetchFreshData = async () => {
        try {
          const { data: wagersData } = await supabase.from("wagers").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
          if (wagersData) {
            const fixtureIds = wagersData.map((w: any) => w.fixture_id || w.fixtureId).filter(Boolean);
            let fixturesMap: Record<string, any> = {};
            if (fixtureIds.length > 0) {
              const { data: fixturesData } = await supabase.from("fixtures").select("*").in("id", fixtureIds);
              fixturesData?.forEach((f: any) => fixturesMap[f.id] = f);
            }
            const mergedWagers = wagersData.map((w: any) => {
              const f = fixturesMap[w.fixture_id || w.fixtureId];
              return { ...w, homeScore: f?.homeScore ?? f?.home_score, awayScore: f?.awayScore ?? f?.away_score, homeTeam: f?.homeTeam ?? f?.home_team, awayTeam: f?.awayTeam ?? f?.away_team };
            });
            if (isMounted) setWagers(mergedWagers);
          }

          // STRICT SOFT DELETE FILTERING
          const { data: postsData } = await supabase.from("posts")
            .select("*").eq("user_id", user.id)
            .neq("is_deleted", true)
            .order("created_at", { ascending: false });
            
          if (postsData && isMounted) setPosts(postsData);

          const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
          const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
          if (isMounted) {
            setFollowersCount(followers || 0);
            setFollowingCount(following || 0);
          }
        } catch (e) { } finally {
          if (isMounted) setWagersLoaded(true);
        }
      };

      fetchFreshData();
      return () => { isMounted = false; };
    }, [user?.id])
  );

  const openSocialList = async (type: 'followers' | 'following') => {
    if (!user) return;
    let targetIds: string[] = [];
    
    if (type === 'followers') {
      const { data } = await supabase.from('follows').select('follower_id').eq('following_id', user.id);
      targetIds = data?.map(d => d.follower_id) || [];
    } else {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      targetIds = data?.map(d => d.following_id) || [];
    }

    if (targetIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('*').in('id', targetIds);
      setSocialModal({ visible: true, type, data: usersData || [] });
    } else {
      setSocialModal({ visible: true, type, data: [] });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this post?")) {
        await supabase.from('posts').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } else {
      Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            await supabase.from('posts').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
          }
        }
      ]);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) { await logout(); router.replace("/(auth)/login"); }
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
  const safeWinRate = wagers.length > 0 ? Math.round((wonWagers.length / wagers.length) * 100) : 0;

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        
        <View style={styles.heroSection}>
          <Avatar color={safeColor} username={safeUsername} size={80} highlight={safeStreak >= 3} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{safeDisplayName}</Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{safeUsername}</Text>
            
            <View style={styles.socialRow}>
              <Pressable onPress={() => openSocialList('followers')}>
                <Text style={[styles.socialText, { color: colors.foreground }]}>{followersCount} <Text style={{ color: colors.mutedForeground }}>Followers</Text></Text>
              </Pressable>
              <Pressable onPress={() => openSocialList('following')}>
                <Text style={[styles.socialText, { color: colors.foreground }]}>{followingCount} <Text style={{ color: colors.mutedForeground }}>Following</Text></Text>
              </Pressable>
            </View>

            <View style={styles.perfRow}>
              <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(safeWinRate, safeWagersCount)}</Text>
              </View>
              {safeStreak >= 3 && <Text style={[styles.streakText, { color: colors.mutedForeground }]}>{safeStreak}-streak heater</Text>}
            </View>
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
          onPress={() => handleDailyBonus()}
          disabled={isBonusLocked}
          style={({ pressed }) => ({
            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, marginHorizontal: 16, marginTop: 20, marginBottom: 8,
            borderRadius: 999, borderWidth: 1, backgroundColor: !isBonusLocked ? "#FFFFFF" : "#F4F4F5", borderColor: !isBonusLocked ? "#E5E5EA" : "#E5E5EA", opacity: isBonusLocked ? 0.6 : (pressed ? 0.7 : 1),
          })}
        >
          <Feather name="gift" size={16} color={!isBonusLocked ? colors.foreground : "#8E8E93"} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, marginLeft: 8, color: !isBonusLocked ? colors.foreground : "#8E8E93" }}>
            {!isBonusLocked ? "Claim Daily Bonus" : "Bonus Claimed"}
          </Text>
        </Pressable>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(["posts", "wagers", "stats"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>{t === "stats" ? "Settings" : t === "wagers" ? "Picks" : "Posts"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "posts" && (
          <View style={{ paddingTop: 8 }}>
            {posts.length === 0 ? (
              <Text style={[styles.wagersEmpty, { color: colors.mutedForeground, textAlign: 'center', padding: 24 }]}>No posts yet.</Text>
            ) : (
              posts.map((p) => (
                <View key={p.id} style={[styles.timelinePost, { borderBottomColor: colors.border }]}>
                  <View style={styles.postHeaderRow}>
                    <Avatar color={safeColor} username={safeUsername} size={36} />
                    <View style={styles.postMeta}>
                      <Text style={[styles.postName, { color: colors.foreground }]}>{safeDisplayName}</Text>
                      <Text style={[styles.postHandle, { color: colors.mutedForeground }]}>@{safeUsername}</Text>
                    </View>
                    <Pressable onPress={() => handleDeletePost(p.id)} style={{ padding: 4 }}>
                      <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                  <Text style={[styles.postContent, { color: colors.foreground }]}>{p.content}</Text>
                  {p.image_url && <Image source={{ uri: p.image_url }} style={styles.postImage} />}
                  <View style={styles.postActionRow}>
                    <Feather name="heart" size={16} color={colors.mutedForeground} />
                    <Feather name="message-circle" size={16} color={colors.mutedForeground} />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === "wagers" && (
          <View style={styles.wagersSection}>
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
                  const aUrl = getCrestUrl(teamA); const aFlag = getFlag(teamA);
                  const bUrl = getCrestUrl(teamB); const bFlag = getFlag(teamB);
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

        {tab === "stats" && (
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
              </View>
            </View>
            <Pressable onPress={handleLogout} style={[styles.signOutBtn, { borderColor: colors.border }]}>
              <Feather name="log-out" size={16} color="#FF3B30" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={socialModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: colors.foreground, textTransform: 'capitalize' }]}>{socialModal.type}</Text>
              <Pressable onPress={() => setSocialModal({ ...socialModal, visible: false })}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <FlatList
              data={socialModal.data}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  onPress={() => { setSocialModal({ ...socialModal, visible: false }); router.push(`/user/${item.id}` as any); }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Avatar color={item.avatar_color || colors.primary} username={item.username} size={40} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground }}>{item.display_name || item.username}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.mutedForeground }}>@{item.username}</Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: colors.mutedForeground }}>No users found.</Text>}
            />
          </View>
        </View>
      </Modal>

      <ReceiptModal visible={!!receiptWager} onClose={() => setReceiptWager(null)} question={receiptWager?.question ?? ""} finalResult={getFinalResult(receiptWager)} prediction={receiptWager?.prediction || receiptWager?.choice || ""} points={receiptWager?.status === "won" ? receiptWager.payout : receiptWager?.amount ?? 0} won={receiptWager?.status === "won"} wagerId={receiptWager?.id} />
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
  socialRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 2 },
  socialText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  perfRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  streakText: { fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 4 },
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
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  section: { paddingTop: 24, paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1 },
  settingsGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  settingsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 },
  settingsLabel: { fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 20, paddingVertical: 14, borderWidth: 1, borderRadius: 999, borderColor: "#E8E8E8" },
  signOutText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FF3B30" },
  wagersSection: { paddingHorizontal: 16, paddingTop: 12 },
  wagersEmpty: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, paddingVertical: 8 },
  wagerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1 },
  wagerLeft: { flex: 1 },
  wagerTeam: { fontFamily: "Inter_400Regular", fontSize: 14 },
  wagerFixture: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  wagerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  wagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 12 },
  wagerStatus: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  timelinePost: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  postHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  postMeta: { flex: 1, marginLeft: 10 },
  postName: { fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: -0.2 },
  postHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  postContent: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postImage: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },
  postActionRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  agreementScroll: { flexGrow: 0 },
});