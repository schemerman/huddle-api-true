import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, FlatList, ActivityIndicator, KeyboardAvoidingView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export interface PublicProfileUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate?: number;
}

interface PublicProfileModalProps {
  user: PublicProfileUser | null;
  onClose: () => void;
}

const getRank = (winRate: number, totalPicks: number = 0) => {
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
    "Bournemouth": "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
    "AFC Bournemouth": "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
    "Brentford": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/hx8g3Hj4Z2a5v7Z1h1x8g3_500x500.png",
    "Brentford FC": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/hx8g3Hj4Z2a5v7Z1h1x8g3_500x500.png",
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
    "Ipswich": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/56vquJBk5U16Dng7txLXCw_500x500.png",
    "Ipswich Town": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/56vquJBk5U16Dng7txLXCw_500x500.png",
    "Coventry": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/KHpmY4tIwqiutl8Cfl0MAw_500x500.png",
    "Coventry City": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/KHpmY4tIwqiutl8Cfl0MAw_500x500.png",
    "Hull": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/riiyZbb1JHuFQgZ3831jUQ_500x500.png",
    "Hull City": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/riiyZbb1JHuFQgZ3831jUQ_500x500.png",
    "Sheffield Utd": "https://a.espncdn.com/i/teamlogos/soccer/500/398.png",
    "Sheffield United": "https://a.espncdn.com/i/teamlogos/soccer/500/398.png",
    "Burnley": "https://a.espncdn.com/i/teamlogos/soccer/500/379.png",
    "Luton": "https://a.espncdn.com/i/teamlogos/soccer/500/394.png",
    "Luton Town": "https://a.espncdn.com/i/teamlogos/soccer/500/394.png",
    "Norwich": "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
    "Norwich City": "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
    "Watford": "https://a.espncdn.com/i/teamlogos/soccer/500/392.png",
    "Leeds": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/5dqfOKpjjW6EwTAx_FysKQ_500x500.png",
    "Leeds United": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/5dqfOKpjjW6EwTAx_FysKQ_500x500.png",
    "Sunderland": "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/CQFeTfHrtxqgr3VKWtTwfA_500x500.png"
  };
  return crests[team] || null; 
};

export function PublicProfileModal({ user: profileUser, onClose }: PublicProfileModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: activeUser } = useAuth();
  
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dynamicWinRate, setDynamicWinRate] = useState(0);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (profileUser?.userId) {
      fetchUserPicks(profileUser.userId);
      fetchSocialStats(profileUser.userId);
    } else {
      setPicks([]);
      setDynamicWinRate(0);
      setIsFollowing(false);
    }
  }, [profileUser]);

  const fetchSocialStats = async (targetId: string) => {
    if (!activeUser) return;
    try {
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId);
      
      const { data: followStatus } = await supabase.from('follows').select('id').eq('follower_id', activeUser.id).eq('following_id', targetId).maybeSingle();

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
      setIsFollowing(!!followStatus);
    } catch (e) {}
  };

  const handleToggleFollow = async () => {
    if (!activeUser || !profileUser) return;
    const previousState = isFollowing;
    
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);

    try {
      if (previousState) {
        await supabase.from('follows').delete().match({ follower_id: activeUser.id, following_id: profileUser.userId });
      } else {
        await supabase.from('follows').insert({ follower_id: activeUser.id, following_id: profileUser.userId });
      }
    } catch (e) {
      setIsFollowing(previousState);
    }
  };

  const handleMessage = () => {
    onClose();
    router.push(`/dm/${profileUser?.userId}` as any);
  };

  const fetchUserPicks = async (userId: string) => {
    setLoading(true);
    try {
      const { data: wagersData } = await supabase.from('wagers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      
      if (!wagersData || wagersData.length === 0) {
        setPicks([]); setDynamicWinRate(0); return;
      }

      const fixtureIds = wagersData.map(w => w.fixture_id || w.fixtureId).filter(Boolean);
      let fixturesMap: Record<string, any> = {};
      
      if (fixtureIds.length > 0) {
        const { data: fixturesData } = await supabase.from('fixtures').select('*').in('id', fixtureIds);
        fixturesData?.forEach(f => fixturesMap[f.id] = f);
      }

      const fullyBuiltPicks = wagersData.map(w => ({ ...w, fixture: fixturesMap[w.fixture_id || w.fixtureId] || null }));
      setPicks(fullyBuiltPicks);

      const resolvedPicks = fullyBuiltPicks.filter(p => p.status === 'won' || p.status === 'lost');
      if (resolvedPicks.length > 0) {
        const wins = resolvedPicks.filter(p => p.status === 'won').length;
        setDynamicWinRate(Math.round((wins / resolvedPicks.length) * 100));
      } else {
        setDynamicWinRate(0);
      }

    } catch (error) {
      console.log("Error loading modal picks", error);
    } finally {
      setLoading(false);
    }
  };

  if (!profileUser) return null;

  const renderPick = ({ item }: { item: any }) => {
    const f = item.fixture || {};
    const homeTeam = f.homeTeam || f.home_team || "Home";
    const awayTeam = f.awayTeam || f.away_team || "Away";
    const homeScore = f.homeScore ?? f.home_score ?? 0;
    const awayScore = f.awayScore ?? f.away_score ?? 0;
    
    const choiceStr = item.prediction || item.choice;
    const isWon = item.status === "won";
    const isLost = item.status === "lost";

    const hUrl = getCrestUrl(homeTeam);
    const aUrl = getCrestUrl(awayTeam);
    const cUrl = getCrestUrl(choiceStr);

    let winnerStr = "";
    if (isWon || isLost) {
      if (homeScore > awayScore) winnerStr = `${homeTeam} Won`;
      else if (awayScore > homeScore) winnerStr = `${awayTeam} Won`;
      else winnerStr = `⚖️ Draw`;
      winnerStr += ` (${homeScore} - ${awayScore})`;
    }

    return (
      <View style={[styles.sleekPickContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.sleekPickLeft}>
          <Text style={[styles.sleekMatchText, { color: colors.foreground }]}>
            {hUrl ? <Image source={{ uri: hUrl }} style={{ width: 14, height: 14 }} /> : (getFlag(homeTeam) || "⚽")} {homeTeam} vs {aUrl ? <Image source={{ uri: aUrl }} style={{ width: 14, height: 14 }} /> : (getFlag(awayTeam) || "⚽")} {awayTeam}
          </Text>
          <Text style={[styles.sleekPickDetails, { color: colors.mutedForeground }]}>
            Picked: {cUrl ? <Image source={{ uri: cUrl }} style={{ width: 12, height: 12 }} /> : (getFlag(choiceStr) || "⚽")} {choiceStr} ({item.amount} pts)
          </Text>
          {(isWon || isLost) && (
            <Text style={[styles.sleekResultText, { color: colors.foreground }]}>
              {winnerStr}
            </Text>
          )}
        </View>
        <View style={[styles.sleekBadge, { backgroundColor: isWon ? colors.foreground : "rgba(0,0,0,0.05)" }]}>
          <Text style={[styles.sleekBadgeText, { color: isWon ? colors.background : colors.foreground }]}>
            {isWon ? "Won" : isLost ? "Lost" : "Pending"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={!!profileUser} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: insets.bottom || 24 }]}>
          
          <FlatList
            data={picks}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.headerSpacer} />
                <View style={styles.profileHeader}>
                  <Avatar color={profileUser.avatarColor} username={profileUser.username} size={80} />
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{profileUser.displayName}</Text>
                  
                  <View style={styles.socialRow}>
                    <Text style={[styles.socialText, { color: colors.foreground }]}>{followersCount} <Text style={{ color: colors.mutedForeground }}>Followers</Text></Text>
                    <Text style={[styles.socialText, { color: colors.foreground }]}>{followingCount} <Text style={{ color: colors.mutedForeground }}>Following</Text></Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(profileUser.winRate || dynamicWinRate, picks.length)}</Text>
                  </View>

                  {/* ACTION BUTTONS */}
                  {activeUser?.id !== profileUser.userId && (
                    <View style={styles.actionRow}>
                      <Pressable onPress={handleToggleFollow} style={[styles.actionBtn, { backgroundColor: isFollowing ? colors.secondary : colors.foreground }]}>
                        <Text style={[styles.actionBtnText, { color: isFollowing ? colors.foreground : colors.background }]}>
                          {isFollowing ? "Following" : "Follow"}
                        </Text>
                      </Pressable>
                      <Pressable onPress={handleMessage} style={[styles.actionBtn, { backgroundColor: colors.secondary, flex: 0, paddingHorizontal: 16 }]}>
                        <Feather name="message-circle" size={18} color={colors.foreground} />
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={[styles.statsContainer, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{profileUser.points.toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{profileUser.winRate || dynamicWinRate}%</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
                  </View>
                </View>

                <View style={styles.recentPicksHeader}>
                  <Text style={[styles.recentPicksTitle, { color: colors.foreground }]}>Recent Picks</Text>
                </View>

                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.foreground} />
                  </View>
                )}
              </View>
            }
            renderItem={renderPick}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No picks found.</Text>
              ) : null
            }
          />

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable style={[styles.closeBtn, { backgroundColor: 'rgba(0,0,0,0.05)' }]} onPress={onClose}>
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Close</Text>
            </Pressable>
          </View>
          
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  headerSpacer: { height: 24 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  displayName: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 12, marginBottom: 4 },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  socialText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, width: '100%', paddingHorizontal: 32 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  statsContainer: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 4 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 0.5 },
  recentPicksHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  recentPicksTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, fontFamily: 'Inter_400Regular', fontSize: 15 },
  footer: { padding: 16, borderTopWidth: 1 },
  closeBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  sleekPickContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  sleekPickLeft: { flex: 1, paddingRight: 16 },
  sleekMatchText: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 4 },
  sleekPickDetails: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 4 },
  sleekResultText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  sleekBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  sleekBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'capitalize' }
});