import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  color: string;
  username: string;
  size?: number;
}

export function Avatar({ color, username, size = 40 }: AvatarProps) {
  const initials = username ? username.substring(0, 2).toUpperCase() : "??";
  const fontSize = size * 0.38;
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
