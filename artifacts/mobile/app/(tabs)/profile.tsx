import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const getFlag = (team: string) => {
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️" };
  return flags[team] || ""; 
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top;

  const [activeTab, setActiveTab] = useState<"stats" | "picks">("stats");
  const [picks, setPicks] = useState<any[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  useEffect(() => {
    if (activeTab === "picks" && user) {
      fetchPicks();
    }
  }, [activeTab]);

  const fetchPicks = async () => {
    if (!user) return;
    setLoadingPicks(true);
    try {
      const { data } = await supabase.from('wagers').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setPicks(data);
    } catch (error) {
      console.log("Error loading picks", error);
    } finally {
      setLoadingPicks(false);
    }
  };

  const activeUser = user as any;
  const finalUsername = activeUser?.username || "player";
  const finalDisplayName = activeUser?.display_name || activeUser?.displayName || "Player";
  const finalColor = activeUser?.avatar_color || activeUser?.avatarColor || colors.primary;
  
  // Cleanly formatting the win rate into a standard percentage
  let winRate = activeUser?.win_rate ?? activeUser?.winRate ?? 0;
  if (winRate > 0 && winRate <= 1) winRate = Math.round(winRate * 100);
  
  const points = activeUser?.points ?? 0;
  const totalWagersCount = activeUser?.previous_wagers ?? activeUser?.previousWagers ?? picks.length ?? 0;

  const renderPick = ({ item }: { item: any }) => {
    const won = item.status === "won";
    const lost = item.status === "lost";
    const predictionStr = item.prediction || item.choice;
    const fPrediction = getFlag(predictionStr);
    const displayPred = predictionStr === "Draw" ? "⚖️ Draw" : `${fPrediction ? fPrediction + " " : ""}${predictionStr}`;
    
    return (
      <View style={[styles.miniReceipt, { borderColor: colors.border, backgroundColor: won ? "rgba(52, 199, 89, 0.05)" : lost ? "rgba(255, 59, 48, 0.05)" : colors.background }]}>
        <View style={styles.miniReceiptTop}>
          <Text style={[styles.miniReceiptLabel, { color: colors.mutedForeground }]}>Prediction</Text>
          <View style={[styles.miniReceiptBadge, { backgroundColor: won ? colors.primary : lost ? colors.secondary : colors.border }]}>
             <Text style={[styles.miniReceiptStatus, { color: won ? colors.primaryForeground : colors.foreground }]}>{won ? "WON" : lost ? "LOST" : "PENDING"}</Text>
          </View>
        </View>
        <Text style={[styles.miniReceiptPred, { color: colors.foreground }]}>{displayPred}</Text>
        <Text style={[styles.miniReceiptPts, { color: colors.mutedForeground }]}>{won ? `+${item.payout} pts` : lost ? `-${item.amount} pts` : `${item.amount} pts at stake`}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <FlatList
        data={activeTab === "picks" ? picks : []}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={
          <View>
            <View style={styles.topSection}>
              <View style={styles.profileInfoRow}>
                <Avatar color={finalColor} username={finalUsername} size={64} />
                <View style={styles.profileTextContainer}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{finalDisplayName}</Text>
                  <Text style={[styles.username, { color: colors.mutedForeground }]}>@{finalUsername}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Coin Flipper</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsContainer, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{winRate}%</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{points}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{totalWagersCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PICKS</Text>
                </View>
              </View>

              <View style={[styles.bonusButton, { backgroundColor: "rgba(0,0,0,0.05)" }]}>
                <Feather name="gift" size={16} color={colors.mutedForeground} />
                <Text style={[styles.bonusText, { color: colors.mutedForeground }]}>Bonus Claimed</Text>
              </View>

              <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setActiveTab("stats")} style={[styles.tab, activeTab === "stats" && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
                  <Text style={[activeTab === "stats" ? styles.activeTabText : styles.inactiveTabText, { color: activeTab === "stats" ? colors.foreground : colors.mutedForeground }]}>Stats</Text>
                </Pressable>
                <Pressable onPress={() => setActiveTab("picks")} style={[styles.tab, activeTab === "picks" && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
                  <Text style={[activeTab === "picks" ? styles.activeTabText : styles.inactiveTabText, { color: activeTab === "picks" ? colors.foreground : colors.mutedForeground }]}>Picks</Text>
                </Pressable>
              </View>
            </View>

            {/* IF TAB IS STATS, RENDER ACCOUNT INFO */}
            {activeTab === "stats" && (
              <View style={styles.statsTabContent}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
                <View style={[styles.infoCard, { borderColor: colors.border }]}>
                  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                    <Feather name="mail" size={18} color={colors.foreground} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>{activeUser?.email || "No email provided"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="at-sign" size={18} color={colors.foreground} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>@{finalUsername}</Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
                <View style={[styles.infoCard, { borderColor: colors.border }]}>
                  <Pressable style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                    <Feather name="file-text" size={18} color={colors.foreground} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>Privacy Policy</Text>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={styles.arrowIcon} />
                  </Pressable>
                  <Pressable style={styles.infoRow}>
                    <Feather name="message-square" size={18} color={colors.foreground} />
                    <Text style={[styles.infoText, { color: colors.foreground }]}>Give Feedback</Text>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={styles.arrowIcon} />
                  </Pressable>
                </View>

                <Pressable style={[styles.logoutBtn, { borderColor: colors.border }]} onPress={logout}>
                  <Feather name="log-out" size={18} color="#FF3B30" />
                  <Text style={styles.logoutText}>Sign out</Text>
                </Pressable>
              </View>
            )}

            {/* IF TAB IS PICKS AND STILL LOADING */}
            {activeTab === "picks" && loadingPicks && (
               <View style={styles.loadingPicks}>
                  <ActivityIndicator color={colors.foreground} />
               </View>
            )}
          </View>
        }
        renderItem={renderPick}
        ListEmptyComponent={
          activeTab === "picks" && !loadingPicks ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>You haven't made any picks yet.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  
  topSection: { padding: 16 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  profileTextContainer: { marginLeft: 16 },
  displayName: { fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 2 },
  username: { fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 8 },
  badge: { backgroundColor: "rgba(0,0,0,0.05)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  statsContainer: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22, marginBottom: 4 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 0.5 },

  bonusButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 32, gap: 8 },
  bonusText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tab: { paddingBottom: 12, paddingHorizontal: 16 },
  activeTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  inactiveTabText: { fontFamily: 'Inter_500Medium', fontSize: 15 },

  statsTabContent: { paddingHorizontal: 16 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  infoCard: { borderWidth: 1, borderRadius: 12, marginBottom: 24, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  infoText: { fontFamily: 'Inter_500Medium', fontSize: 15, marginLeft: 12, flex: 1 },
  arrowIcon: { marginLeft: 'auto' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderRadius: 12, gap: 8, marginBottom: 40 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FF3B30' },
  
  loadingPicks: { padding: 40, alignItems: "center" },
  emptyText: { textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 15 },
  
  miniReceipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, marginHorizontal: 16 },
  miniReceiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  miniReceiptLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  miniReceiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniReceiptStatus: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  miniReceiptPred: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  miniReceiptPts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});