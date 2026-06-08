import React, { useRef } from "react";
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

export interface PublicProfileUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
}

interface WagerEntry {
  id: string;
  team: string;
  amount: number;
  status: "Won" | "Lost" | "Pending";
}

const MOCK_WAGER_HISTORY: Record<string, WagerEntry[]> = {
  u1: [
    { id: "w1", team: "Arsenal", amount: 200, status: "Won" },
    { id: "w2", team: "Man City", amount: 50, status: "Lost" },
    { id: "w3", team: "Brazil", amount: 150, status: "Pending" },
    { id: "w4", team: "Liverpool", amount: 80, status: "Won" },
  ],
  u2: [
    { id: "w5", team: "Liverpool", amount: 100, status: "Won" },
    { id: "w6", team: "Chelsea", amount: 75, status: "Pending" },
    { id: "w7", team: "France", amount: 120, status: "Lost" },
  ],
  u3: [
    { id: "w8", team: "Tottenham", amount: 300, status: "Won" },
    { id: "w9", team: "Germany", amount: 200, status: "Won" },
    { id: "w10", team: "Spain", amount: 150, status: "Pending" },
    { id: "w11", team: "Arsenal", amount: 100, status: "Lost" },
    { id: "w12", team: "Argentina", amount: 250, status: "Won" },
  ],
  u4: [
    { id: "w13", team: "Aston Villa", amount: 50, status: "Lost" },
    { id: "w14", team: "England", amount: 60, status: "Pending" },
  ],
  u5: [
    { id: "w15", team: "Brazil", amount: 180, status: "Won" },
    { id: "w16", team: "Chelsea", amount: 90, status: "Pending" },
    { id: "w17", team: "Man City", amount: 120, status: "Won" },
  ],
  u6: [
    { id: "w18", team: "Newcastle", amount: 40, status: "Lost" },
    { id: "w19", team: "Portugal", amount: 55, status: "Pending" },
  ],
  u7: [
    { id: "w20", team: "Spain", amount: 70, status: "Won" },
    { id: "w21", team: "Netherlands", amount: 85, status: "Lost" },
    { id: "w22", team: "Liverpool", amount: 60, status: "Pending" },
  ],
};

const FALLBACK_WAGERS: WagerEntry[] = [
  { id: "fb1", team: "Arsenal", amount: 50, status: "Pending" },
  { id: "fb2", team: "Brazil", amount: 100, status: "Won" },
];

function statusColor(status: WagerEntry["status"], foreground: string, muted: string): string {
  if (status === "Won") return foreground;
  return muted;
}

function statusLabel(status: WagerEntry["status"]): string {
  return status;
}

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

  const wagers = user ? (MOCK_WAGER_HISTORY[user.userId] ?? FALLBACK_WAGERS) : [];

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
          {/* Drag handle */}
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

            {/* Recent Picks */}
            <View style={styles.wagersSection}>
              <Text style={[styles.wagersTitle, { color: colors.foreground }]}>Recent Picks</Text>
              <ScrollView
                style={styles.wagersList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                scrollEnabled={wagers.length > 4}
              >
                {wagers.map((w, i) => (
                  <View
                    key={w.id}
                    style={[
                      styles.wagerRow,
                      { borderBottomColor: colors.border },
                      i === wagers.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.wagerLeft}>
                      <Text style={[styles.wagerTeam, { color: colors.foreground }]}>
                        {w.amount} pts on {w.team}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.wagerBadge,
                        {
                          backgroundColor:
                            w.status === "Won"
                              ? colors.primary
                              : colors.secondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.wagerStatus,
                          {
                            color:
                              w.status === "Won"
                                ? colors.primaryForeground
                                : statusColor(w.status, colors.foreground, colors.mutedForeground),
                          },
                        ]}
                      >
                        {statusLabel(w.status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  sheetInner: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  handleWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  avatarWrap: { marginBottom: 16 },
  displayName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  username: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 6,
  },
  perfBadge: {
    alignSelf: "center",
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    width: "100%",
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.8,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  wagersSection: {
    width: "100%",
    marginBottom: 20,
  },
  wagersTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  wagersList: {
    maxHeight: 200,
  },
  wagerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  wagerLeft: { flex: 1 },
  wagerTeam: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  wagerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 10,
  },
  wagerStatus: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  closeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  closeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
