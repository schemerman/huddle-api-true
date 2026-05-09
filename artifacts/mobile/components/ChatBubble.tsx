import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "./Avatar";

interface ChatBubbleProps {
  text: string;
  username: string;
  avatarColor: string;
  isOwn: boolean;
  time: string;
  showAvatar?: boolean;
  onAvatarPress?: () => void;
}

export function ChatBubble({
  text,
  username,
  avatarColor,
  isOwn,
  time,
  showAvatar = true,
  onAvatarPress,
}: ChatBubbleProps) {
  if (isOwn) {
    return (
      <View style={[styles.row, styles.ownRow]}>
        <View style={[styles.bubble, styles.ownBubble]}>
          <Text style={styles.ownText}>{text}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {showAvatar ? (
        <Avatar color={avatarColor} username={username} size={30} onPress={onAvatarPress} />
      ) : (
        <View style={{ width: 30 }} />
      )}
      <View style={styles.otherContent}>
        {showAvatar && <Text style={styles.senderName}>@{username}</Text>}
        <View style={[styles.bubble, styles.otherBubble]}>
          <Text style={styles.otherText}>{text}</Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  ownRow: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  otherContent: {
    flex: 1,
    maxWidth: "75%",
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: "100%",
  },
  ownBubble: {
    backgroundColor: "#000000",
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
    maxWidth: "75%",
  },
  otherBubble: {
    backgroundColor: "#F0F0F0",
    borderBottomLeftRadius: 4,
  },
  ownText: {
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  otherText: {
    color: "#000000",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  senderName: {
    color: "#8A8A8A",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginBottom: 3,
    marginLeft: 2,
  },
  time: {
    color: "#8A8A8A",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
});
