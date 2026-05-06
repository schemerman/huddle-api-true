import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface HuddleButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function HuddleButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
}: HuddleButtonProps) {
  const colors = useColors();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: isPrimary ? colors.primary : colors.secondary,
          opacity: pressed || disabled ? 0.6 : 1,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryForeground : colors.foreground} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: isPrimary ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  fullWidth: {
    width: "100%",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
