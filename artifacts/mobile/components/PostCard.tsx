import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "./Avatar";
import type { Post } from "@/context/DataContext";

interface PostCardProps {
  post: Post;
  onVote: (choice: "A" | "B") => void;
  onPress?: () => void;
  onAvatarPress?: () => void;
  onUsernamePress?: () => void;
  highlight?: boolean;
  hidePrediction?: boolean;
}

export function PostCard({
  post,
  onVote,
  onPress,
  onAvatarPress,
  onUsernamePress,
  highlight = false,
  hidePrediction = false,
}: PostCardProps) {
  const colors = useColors();

  const pred = post.prediction;
  const isResolved =
    !!pred && (pred.resolved === true || pred.result === "A" || pred.result === "B");
  const showPoll = !!pred && !isResolved && !hidePrediction;
  const userPick = pred?.userVote;
  const showResultTag = isResolved && !!userPick;
  const userWon = isResolved && userPick === pred!.result;
  const winningLabel = pred ? (pred.result === "A" ? pred.optionA : pred.optionB) : "";

  const totalVotes = pred ? pred.votesA + pred.votesB : 0;
  const pctA = totalVotes > 0 ? Math.round((pred!.votesA / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

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

      {isResolved && pred && !hidePrediction && (
        <View style={[styles.resolvedBox, { borderColor: colors.border }]}>
          <Text style={[styles.predQuestion, { color: colors.foreground }]}>{pred.question}</Text>
          <View style={[styles.resolvedRow, { borderTopColor: colors.border }]}>
            <View style={styles.resolvedLeft}>
              <Text style={[styles.finalLabel, { color: colors.mutedForeground }]}>FINAL</Text>
              <Text style={[styles.finalResult, { color: colors.foreground }]} numberOfLines={1}>
                {winningLabel}
              </Text>
            </View>
            {showResultTag && (
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
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
  resultTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  resultTagText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
});
