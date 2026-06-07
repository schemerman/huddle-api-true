import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";
import { performanceTitle } from "@/utils/performance";

interface Props {
  winRate: number;
  style?: StyleProp<ViewStyle>;
}

export function PerformanceTitleBadge({ winRate, style }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.secondary, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.foreground }]}>
        {performanceTitle(winRate)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 14, letterSpacing: -0.1 },
});
