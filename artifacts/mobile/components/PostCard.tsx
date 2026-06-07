import { AntDesign, Feather } from "@expo/vector-icons";
// Note: AntDesign "heart" = filled red, Feather "heart" = outline grey
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "./Avatar";
import type { Post } from "@/context/DataContext";

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onVote: (choice: "A" | "B") => void;
  onPress?: () => void;
  onAvatarPress?: () => void;
  onUsernamePress?: () => void;
  onAcceptCallout?: () => void;
  onDeclineCallout?: () => void;
  currentUserId?: string;
  acceptDisabled?: boolean;
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
  onAcceptCallout,
  onDeclineCallout,
  currentUserId,
  acceptDisabled = false,
  highlight = false,
  hidePrediction = false,
}: PostCardProps) {
  const colors = useColors();
  const pred = hidePrediction ? undefined : post.prediction;

  const callout = post.callout;
  const isTarget =
    !!callout &&
    !!currentUserId &&
    (callout.targetUserId === currentUserId || callout.targetUserId === "me");
  const isAuthor = !!currentUserId && post.userId === currentUserId;

  const calloutMessage = callout
    ? callout.status === "accepted"
      ? `Pot locked at ${(callout.pot ?? callout.amount * 2).toLocaleString()} pts. Winner takes all.`
      : callout.status === "declined"
      ? "Callout declined. No points on the line."
      : isTarget
      ? `@${post.username} called you out for ${callout.amount.toLocaleString()} pts. Winner takes all.`
      : isAuthor
      ? `You challenged @${callout.targetUsername} for ${callout.amount.toLocaleString()} pts. Awaiting response.`
      : `${callout.amount.toLocaleString()} pts on the line. Winner takes all.`
    : "";

  const calloutLabel = callout
    ? callout.status === "accepted"
      ? "CALLOUT ACCEPTED"
      : callout.status === "declined"
      ? "CALLOUT DECLINED"
      : "PENDING CALLOUT"
    : "";

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAcceptCallout?.();
  };
  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeclineCallout?.();
  };

  const totalVotes = pred ? pred.votesA + pred.votesB : 0;
  const pctA = totalVotes > 0 ? Math.round((pred!.votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  const handleVote = (choice: "A" | "B") => {
    if (pred?.userVote) return;
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

      {callout && (
        <View style={[styles.calloutBox, { borderColor: colors.border }]}>
          <Text style={[styles.calloutLabel, { color: colors.mutedForeground }]}>
            {calloutLabel}
          </Text>
          <Text style={[styles.calloutText, { color: colors.foreground }]}>
            {calloutMessage}
          </Text>
          {callout.status === "pending" && isTarget && (
            <View style={styles.calloutActions}>
              <Pressable
                onPress={handleAccept}
                disabled={acceptDisabled}
                style={({ pressed }) => [
                  styles.calloutAccept,
                  {
                    backgroundColor: acceptDisabled ? colors.secondary : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.calloutAcceptText,
                    { color: acceptDisabled ? colors.mutedForeground : colors.primaryForeground },
                  ]}
                >
                  {acceptDisabled ? "Not enough pts" : "Accept"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDecline}
                style={({ pressed }) => [
                  styles.calloutDecline,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.calloutDeclineText, { color: colors.foreground }]}>
                  Decline
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {pred && (
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
        <Pressable style={styles.actionBtn}>
          <Feather name="share" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
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
  calloutBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 6 },
  calloutLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  calloutText: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  calloutActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  calloutAccept: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
  },
  calloutAcceptText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  calloutDecline: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
  },
  calloutDeclineText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
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
});
