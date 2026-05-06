import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await logout();
        },
      },
    ]);
  };

  if (!user) return null;

  const stats = [
    { label: "Win Rate", value: `${user.winRate}%`, big: true },
    { label: "Points", value: user.points.toLocaleString(), big: false },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <Pressable onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      >
        <View style={styles.heroSection}>
          <Avatar color={user.avatarColor} username={user.username || user.email} size={80} />
          <View style={styles.heroText}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>
              {user.displayName || user.email}
            </Text>
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>
              @{user.username || "—"}
            </Text>
            {!!user.dob && (
              <Text style={[styles.dob, { color: colors.mutedForeground }]}>
                Born {user.dob}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {stats.map((stat, i) => (
            <View
              key={stat.label}
              style={[
                styles.statItem,
                i < stats.length - 1 && { borderRightColor: colors.border, borderRightWidth: 1 },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
            <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{user.email}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <Feather name="at-sign" size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground }]}>@{user.username || "—"}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable style={styles.settingsRow}>
              <Feather name="bell" size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Notifications</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP</Text>
          <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
            <Pressable style={[styles.settingsRow, { borderBottomColor: colors.border }]}>
              <Feather name="help-circle" size={18} color={colors.foreground} />
              <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Help & Support</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable style={styles.settingsRow}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  heroText: { flex: 1 },
  displayName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  handle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 2,
  },
  dob: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -1,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1,
  },
  settingsGroup: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    flex: 1,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 999,
    borderColor: "#E8E8E8",
  },
  signOutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FF3B30",
  },
});
