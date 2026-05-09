import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  color: string;
  username: string;
  size?: number;
  onPress?: () => void;
}

export function Avatar({ color, username, size = 40, onPress }: AvatarProps) {
  const initials = username ? username.substring(0, 2).toUpperCase() : "??";
  const fontSize = size * 0.38;

  const circle = (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        hitSlop={6}
      >
        {circle}
      </Pressable>
    );
  }

  return circle;
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
