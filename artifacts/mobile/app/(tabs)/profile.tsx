import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top;

  const activeUser = user as any;
  const finalUsername = activeUser?.username || "player";
  const finalDisplayName = activeUser?.display_name || activeUser?.displayName || "Player";
  const finalColor = activeUser?.avatar_color || activeUser?.avatarColor || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* AVATAR AND NAME ROW */}
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

        {/* STATS SECTION */}
        <View style={[styles.statsContainer, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>35%</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>WIN RATE</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>1,286</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>POINTS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>27</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>PICKS</Text>
          </View>
        </View>

        <View style={[styles.bonusButton, { backgroundColor: "rgba(0,0,0,0.05)" }]}>
          <Feather name="gift" size={16} color={colors.mutedForeground} />
          <Text style={[styles.bonusText, { color: colors.mutedForeground }]}>Bonus Claimed</Text>
        </View>

        {/* TABS */}
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.activeTab, { borderBottomColor: colors.foreground }]}>
            <Text style={[styles.activeTabText, { color: colors.foreground }]}>Stats</Text>
          </View>
          <View style={styles.inactiveTab}>
            <Text style={[styles.inactiveTabText, { color: colors.mutedForeground }]}>Picks</Text>
          </View>
        </View>

        {/* ACCOUNT INFO */}
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

        {/* APP INFO */}
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

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  
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

  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 24 },
  activeTab: { paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 2 },
  activeTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  inactiveTab: { paddingBottom: 12, paddingHorizontal: 16 },
  inactiveTabText: { fontFamily: 'Inter_500Medium', fontSize: 15 },

  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  infoCard: { borderWidth: 1, borderRadius: 12, marginBottom: 24, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  infoText: { fontFamily: 'Inter_500Medium', fontSize: 15, marginLeft: 12, flex: 1 },
  arrowIcon: { marginLeft: 'auto' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 1, borderRadius: 12, gap: 8 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FF3B30' }
});