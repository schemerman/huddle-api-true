import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, FlatList, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';

export interface PublicProfileUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate?: number; // ADDED THIS BACK TO STOP THE RED ERRORS!
}

interface PublicProfileModalProps {
  user: PublicProfileUser | null;
  onClose: () => void;
}

const getFlag = (team: string) => {
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️", "Spain": "🇪🇸", "Belgium": "🇧🇪" };
  return flags[team] || ""; 
};

export function PublicProfileModal({ user, onClose }: PublicProfileModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dynamicWinRate, setDynamicWinRate] = useState(0);

  useEffect(() => {
    if (user?.userId) {
      fetchUserPicks(user.userId);
    } else {
      setPicks([]);
      setDynamicWinRate(0);
    }
  }, [user]);

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

      // PERFECTED VIDEO GAME MATH
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

  if (!user) return null;

  const renderPick = ({ item }: { item: any }) => {
    const f = item.fixture || {};
    const homeTeam = f.homeTeam || f.home_team || "Home";
    const awayTeam = f.awayTeam || f.away_team || "Away";
    const homeScore = f.homeScore ?? f.home_score ?? 0;
    const awayScore = f.awayScore ?? f.away_score ?? 0;
    
    const choiceStr = item.prediction || item.choice;
    const isWon = item.status === "won";
    const isLost = item.status === "lost";

    let winnerStr = "";
    if (isWon || isLost) {
      if (homeScore > awayScore) winnerStr = `${getFlag(homeTeam)} ${homeTeam} Won`;
      else if (awayScore > homeScore) winnerStr = `${getFlag(awayTeam)} ${awayTeam} Won`;
      else winnerStr = `⚖️ Draw`;
      winnerStr += ` (${homeScore} - ${awayScore})`;
    }

    return (
      <View style={[styles.sleekPickContainer, { borderBottomColor: colors.border }]}>
        <View style={styles.sleekPickLeft}>
          <Text style={[styles.sleekMatchText, { color: colors.foreground }]}>
            {getFlag(homeTeam)} {homeTeam} vs {getFlag(awayTeam)} {awayTeam}
          </Text>
          <Text style={[styles.sleekPickDetails, { color: colors.mutedForeground }]}>
            Picked: {getFlag(choiceStr)} {choiceStr} ({item.amount} pts)
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
    <Modal visible={!!user} animationType="slide" transparent onRequestClose={onClose}>
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
                  <Avatar color={user.avatarColor} username={user.username} size={80} />
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{user.displayName}</Text>
                  <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user.username}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Benchwarmer</Text>
                  </View>
                </View>

                <View style={[styles.statsContainer, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{user.points}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{dynamicWinRate}%</Text>
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
  displayName: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 12, marginBottom: 2 },
  username: { fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 8 },
  badge: { backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
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