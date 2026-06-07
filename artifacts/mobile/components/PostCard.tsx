import { AntDesign, Feather } from "@expo/vector-icons";
// Note: AntDesign "heart" = filled red, Feather "heart" = outline grey
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "./Avatar";
import type { Post } from "@/context/DataContext";

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onVote: (choice: "A" | "B") => void;
  onPress?: () => void;
  onAvatarPress?: () => void;
  onUsernamePress?: () => void;
  highlight?: boolean;
  hidePrediction?: boolean;
}

export function PostCard({
  post,
  onLike,
  onVote,
  onPress,
  onAvatarPress,
  onUsernamePress,
  highlight = false,
  hidePrediction = false,
}: PostCardProps) {
  const colors = useColors();
  const { user: currentUser } = useAuth();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const pred = post.prediction;
  const isResolved =
    !!pred && (pred.resolved === true || pred.result === "A" || pred.result === "B");
  const showPoll = !!pred && !isResolved && !hidePrediction;
  const userPick = pred?.userVote;
  const canShareReceipt = isResolved && !!userPick;
  const userWon = isResolved && userPick === pred!.result;
  const winningLabel = pred ? (pred.result === "A" ? pred.optionA : pred.optionB) : "";
  const userPickLabel = pred && userPick ? (userPick === "A" ? pred.optionA : pred.optionB) : "";

  const totalVotes = pred ? pred.votesA + pred.votesB : 0;
  const pctA = totalVotes > 0 ? Math.round((pred!.votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  const handleVote = (choice: "A" | "B") => {
    if (pred?.userVote || isResolved) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVote(choice);
  };

  const profileHandler = onAvatarPress ?? onUsernamePress;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: colors.border, opacity: onPress && pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.header}>
        <Avatar
          color={post.avatarColor}
          username={post.username}
          size={40}
          onPress={onAvatarPress}
          highlight={highlight}
        />
        <Pressable
          style={styles.headerText}
          onPress={onUsernamePress ?? onAvatarPress}
          disabled={!profileHandler}
        >
          <Text style={[styles.displayName, { color: colors.foreground }]}>{post.displayName}</Text>
          <Text style={[styles.handle, { color: colors.handle }]}>
            @{post.username} · {post.createdAt}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.text, { color: colors.foreground }]}>{post.text}</Text>

      {showPoll && pred && (
        <View style={[styles.predictionBox, { borderColor: colors.border }]}>
          <Text style={[styles.predQuestion, { color: colors.foreground }]}>{pred.question}</Text>
          <View style={styles.pollRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pollOption,
                {
                  backgroundColor: pred.userVote === "A" ? colors.primary : colors.secondary,
                  borderColor: colors.border,
                  opacity: pressed && !pred.userVote ? 0.7 : 1,
                  flex: 1,
                },
              ]}
              onPress={() => handleVote("A")}
            >
              <Text
                style={[
                  styles.pollOptionText,
                  { color: pred.userVote === "A" ? colors.primaryForeground : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {pred.optionA}
              </Text>
              {pred.userVote && (
                <Text
                  style={[
                    styles.pollPct,
                    { color: pred.userVote === "A" ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {pctA}%
                </Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.pollOption,
                {
                  backgroundColor: pred.userVote === "B" ? colors.primary : colors.secondary,
                  borderColor: colors.border,
                  opacity: pressed && !pred.userVote ? 0.7 : 1,
                  flex: 1,
                },
              ]}
              onPress={() => handleVote("B")}
            >
              <Text
                style={[
                  styles.pollOptionText,
                  { color: pred.userVote === "B" ? colors.primaryForeground : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {pred.optionB}
              </Text>
              {pred.userVote && (
                <Text
                  style={[
                    styles.pollPct,
                    { color: pred.userVote === "B" ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {pctB}%
                </Text>
              )}
            </Pressable>
          </View>
          {pred.userVote && (
            <Text style={[styles.votesMeta, { color: colors.mutedForeground }]}>
              {totalVotes.toLocaleString()} votes
            </Text>
          )}
        </View>
      )}

      {isResolved && pred && (
        <View style={[styles.resolvedBox, { borderColor: colors.border }]}>
          <Text style={[styles.predQuestion, { color: colors.foreground }]}>{pred.question}</Text>
          <View style={[styles.resolvedRow, { borderTopColor: colors.border }]}>
            <View style={styles.resolvedLeft}>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>FINAL</Text>
              <Text style={[styles.finalResult, { color: colors.foreground }]} numberOfLines={1}>
                {winningLabel}
              </Text>
            </View>
            {canShareReceipt && (
              <View style={styles.resolvedRight}>
                <View
                  style={[
                    styles.resultTag,
                    userWon
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultTagText,
                      { color: userWon ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {userWon ? "YOU WON" : "YOU FAILED"}
                  </Text>
                </View>
                <Pressable onPress={() => setReceiptOpen(true)} hitSlop={8} style={styles.shareReceiptBtn}>
                  <Feather name="share" size={16} color={colors.foreground} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={handleLike}>
          {post.liked ? (
            <AntDesign name="heart" size={18} color="#E8533A" />
          ) : (
            <Feather name="heart" size={18} color={colors.mutedForeground} />
          )}
          <Text style={[styles.actionCount, { color: post.liked ? "#E8533A" : colors.mutedForeground }]}>
            {post.likes}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onPress}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{post.comments}</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={canShareReceipt ? () => setReceiptOpen(true) : undefined}
        >
          <Feather
            name="share"
            size={18}
            color={canShareReceipt ? colors.foreground : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <Modal
        visible={receiptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptOpen(false)}
      >
        <View style={styles.receiptOverlay}>
          <View style={[styles.receiptCard, { backgroundColor: colors.background, borderColor: colors.foreground }]}>
            <Text style={[styles.receiptBrand, { color: colors.foreground }]}>HUDDLE</Text>
            <View style={[styles.receiptRule, { backgroundColor: colors.border }]} />
            <Text style={[styles.receiptKicker, { color: colors.mutedForeground }]}>PREDICTION RECEIPT</Text>
            <Text style={[styles.receiptQuestion, { color: colors.foreground }]}>{pred?.question}</Text>

            <View style={styles.receiptBlock}>
              <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>FINAL RESULT</Text>
              <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{winningLabel}</Text>
            </View>
            <View style={styles.receiptBlock}>
              <Text style={[styles.receiptBlockLabel, { color: colors.mutedForeground }]}>
                @{currentUser?.username || "you"} predicted
              </Text>
              <Text style={[styles.receiptBlockValue, { color: colors.foreground }]}>{userPickLabel}</Text>
            </View>

            <View
              style={[
                styles.receiptStamp,
                userWon
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.background, borderColor: colors.foreground },
              ]}
            >
              <Text style={[styles.receiptStampText, { color: userWon ? colors.primaryForeground : colors.foreground }]}>
                {userWon ? "WON" : "FAILED"}
              </Text>
            </View>

            <Text style={[styles.receiptFooter, { color: colors.mutedForeground }]}>
              Screenshot to share your call
            </Text>

            <Pressable
              onPress={() => setReceiptOpen(false)}
              style={({ pressed }) => [
                styles.receiptClose,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.receiptCloseText, { color: colors.foreground }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  headerText: { flex: 1 },
  displayName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  text: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 12 },
  predictionBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 10 },
  predQuestion: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 20 },
  pollRow: { flexDirection: "row", gap: 8 },
  pollOption: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  pollOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, flexShrink: 1 },
  pollPct: { fontFamily: "Inter_700Bold", fontSize: 12 },
  votesMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  actions: { flexDirection: "row", gap: 20, paddingVertical: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: { fontFamily: "Inter_400Regular", fontSize: 13 },
  resolvedBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 10 },
  resolvedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  resolvedLeft: { flex: 1 },
  finalLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  finalResult: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 2 },
  resolvedRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  resultTagText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  shareReceiptBtn: { padding: 2 },
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  receiptCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 2,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  receiptBrand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  receiptRule: { width: 40, height: 2, marginTop: 14, marginBottom: 18 },
  receiptKicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1.5, marginBottom: 14 },
  receiptQuestion: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    lineHeight: 25,
    textAlign: "center",
    marginBottom: 22,
  },
  receiptBlock: { alignItems: "center", marginBottom: 16 },
  receiptBlockLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  receiptBlockValue: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  receiptStamp: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 18,
  },
  receiptStampText: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 3 },
  receiptFooter: { fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 22 },
  receiptClose: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 11,
    alignSelf: "stretch",
    alignItems: "center",
  },
  receiptCloseText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
