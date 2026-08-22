import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";

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
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️", "Spain": "🇪🇸", "Belgium": "🇧🇪" };
  return flags[team] || ""; 
};

const getCrestUrl = (team: string): string | null => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Manchester City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Man United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Manchester United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Newcastle": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    "Newcastle United": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    "Spurs": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Tottenham": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Tottenham Hotspur": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Brentford": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Brentford_FC_crest.svg/1200px-Brentford_FC_crest.svg.png",
    "Brentford FC": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Brentford_FC_crest.svg/1200px-Brentford_FC_crest.svg.png",
    "Ipswich": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Ipswich_Town.svg/1200px-Ipswich_Town.svg.png",
    "Ipswich Town": "https://upload.wikimedia.org/wikipedia/en/thumb/4/43/Ipswich_Town.svg/1200px-Ipswich_Town.svg.png",
    "Hull": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Hull_City_A.F.C._logo.svg/1200px-Hull_City_A.F.C._logo.svg.png",
    "Hull City": "https://upload.wikimedia.org/wikipedia/en/thumb/5/54/Hull_City_A.F.C._logo.svg/1200px-Hull_City_A.F.C._logo.svg.png",
    "Sunderland": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Logo_Sunderland.svg/1200px-Logo_Sunderland.svg.png",
    "Sunderland A.F.C.": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Logo_Sunderland.svg/1200px-Logo_Sunderland.svg.png",
    "Coventry": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Coventry_City_FC_logo.svg/1200px-Coventry_City_FC_logo.svg.png",
    "Coventry City": "https://upload.wikimedia.org/wikipedia/en/thumb/9/94/Coventry_City_FC_logo.svg/1200px-Coventry_City_FC_logo.svg.png"
  };
  return crests[team] || null; 
};

function statusLabel(status: string): string {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "Pending";
}

export default function UserProfileScreen() {
  const { id: targetUserId } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user: activeUser } = useAuth();

  const [targetUser, setTargetUser] = useState<any>(null);
  const [tab, setTab] = useState<"posts" | "wagers">("posts");
  
  const [wagers, setWagers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!targetUserId) return;
      let isMounted = true;

      const fetchTargetData = async () => {
        try {
          const { data: userData } = await supabase.from('users').select('*').eq('id', targetUserId).single();
          if (userData && isMounted) setTargetUser(userData);

          const { data: wagersData } = await supabase.from("wagers").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false });
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

          const { data: postsData } = await supabase.from("posts").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false });
          if (postsData && isMounted) setPosts(postsData);

          const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId);
          const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId);
          
          if (activeUser?.id) {
            const { data: followStatus } = await supabase.from('follows').select('id').eq('follower_id', activeUser.id).eq('following_id', targetUserId).maybeSingle();
            if (isMounted) setIsFollowing(!!followStatus);
          }

          if (isMounted) {
            setFollowersCount(followers || 0);
            setFollowingCount(following || 0);
          }
        } catch (e) { } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchTargetData();
      return () => { isMounted = false; };
    }, [targetUserId, activeUser?.id])
  );

  const handleToggleFollow = async () => {
    if (!activeUser || !targetUserId) return;
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);

    try {
      if (previousState) await supabase.from('follows').delete().match({ follower_id: activeUser.id, following_id: targetUserId });
      else await supabase.from('follows').insert({ follower_id: activeUser.id, following_id: targetUserId });
    } catch (e) { setIsFollowing(previousState); }
  };

  if (!targetUser && !loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, textAlign: 'center', marginTop: 50 }}>User not found.</Text>
      </View>
    );
  }

  const safeName = targetUser?.display_name || targetUser?.displayName || targetUser?.username || "Player";
  const safeUsername = targetUser?.username || "player";
  const safeColor = targetUser?.avatar_color || targetUser?.avatarColor || colors.primary;
  
  const completedWagers = wagers.filter(w => w.status === "won" || w.status === "lost");
  const wonWagers = completedWagers.filter(w => w.status === "won");
  const fallbackWinRate = wagers.length > 0 ? Math.round((wonWagers.length / wagers.length) * 100) : 0;
  const safeWinRate = targetUser?.win_rate ?? targetUser?.winRate ?? fallbackWinRate;
  const safeWagersCount = targetUser?.total_picks ?? targetUser?.totalPicks ?? wagers.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{safeName}</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
          <View style={styles.heroSection}>
            <Avatar color={safeColor} username={safeUsername} size={80} />
            <View style={styles.heroText}>
              <Text style={[styles.displayName, { color: colors.foreground }]}>{safeName}</Text>
              <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{safeUsername}</Text>
              
              <View style={styles.socialRow}>
                <Text style={[styles.socialText, { color: colors.foreground }]}>{followersCount} <Text style={{ color: colors.mutedForeground }}>Followers</Text></Text>
                <Text style={[styles.socialText, { color: colors.foreground }]}>{followingCount} <Text style={{ color: colors.mutedForeground }}>Following</Text></Text>
              </View>

              <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(safeWinRate, safeWagersCount)}</Text>
              </View>
            </View>
          </View>

          {activeUser?.id !== targetUserId && (
            <View style={styles.actionRow}>
              <Pressable onPress={handleToggleFollow} style={[styles.actionBtn, { backgroundColor: isFollowing ? colors.secondary : colors.foreground }]}>
                <Text style={[styles.actionBtnText, { color: isFollowing ? colors.foreground : colors.background }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
              <Pressable onPress={() => router.push(`/dm/${targetUserId}` as any)} style={[styles.actionBtn, { backgroundColor: colors.secondary, flex: 0, paddingHorizontal: 20 }]}>
                <Feather name="message-circle" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          )}

          <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{safeWinRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
            </View>
            <View style={[styles.statItem, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(targetUser?.points || 0).toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{safeWagersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PICKS</Text>
            </View>
          </View>

          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {(["posts", "wagers"] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
                <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>{t === "wagers" ? "Picks" : "Posts"}</Text>
              </Pressable>
            ))}
          </View>

          {tab === "posts" && (
            <View style={{ paddingTop: 8 }}>
              {posts.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet.</Text>
              ) : (
                posts.map((p) => (
                  <View key={p.id} style={[styles.timelinePost, { borderBottomColor: colors.border }]}>
                    <View style={styles.postHeaderRow}>
                      <Avatar color={safeColor} username={safeUsername} size={36} />
                      <View style={styles.postMeta}>
                        <Text style={[styles.postName, { color: colors.foreground }]}>{safeName}</Text>
                        <Text style={[styles.postHandle, { color: colors.mutedForeground }]}>@{safeUsername}</Text>
                      </View>
                      {/* DELIBERATELY OMITTED TRASH CAN SO USERS CANNOT DELETE OTHERS' POSTS */}
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
              {wagers.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No picks placed yet.</Text>
              ) : (
                wagers.map((w, i) => {
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
                    <View key={w.id} style={[styles.wagerRow, { borderBottomColor: colors.border }, i === wagers.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.wagerLeft}>
                        <Text style={[styles.wagerTeam, { color: colors.foreground }]}>{w.amount} pts on {w.prediction || w.choice}</Text>
                        <Text style={[styles.wagerFixture, { color: colors.mutedForeground }]}>{displayQuestion}</Text>
                      </View>
                      <View style={styles.wagerRight}>
                        <View style={[styles.wagerBadge, { backgroundColor: won ? colors.primary : colors.secondary }]}>
                          <Text style={[styles.wagerStatus, { color: won ? colors.primaryForeground : w.status === "lost" ? colors.mutedForeground : colors.foreground }]}>{statusLabel(w.status)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: "flex-start" },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.5, flex: 1, textAlign: "center" },
  heroSection: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 24, gap: 16 },
  heroText: { flex: 1 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.3 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  socialRow: { flexDirection: 'row', gap: 12, marginTop: 6, marginBottom: 2 },
  socialText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  rankBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 24 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -1 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4, marginTop: 8 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  wagersSection: { paddingHorizontal: 16, paddingTop: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontFamily: 'Inter_400Regular', fontSize: 15, padding: 24 },
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
});