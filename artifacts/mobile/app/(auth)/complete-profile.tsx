import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { HuddleButton } from "@/components/HuddleButton";

const AVATAR_COLORS = [
  "#E8533A", "#3A7DE8", "#3AE86A", "#E8C83A",
  "#9B3AE8", "#E83A8C", "#3AE8D4",
];

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { completeProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (username.includes(" ")) {
      setError("Username cannot contain spaces.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completeProfile(username.trim().toLowerCase(), dob, selectedColor);
      router.replace("/(tabs)");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const initials = username ? username.substring(0, 2).toUpperCase() : "??";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>Let your squad know who's talking trash.</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.avatarPreview, { backgroundColor: selectedColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.colorLabel}>Pick your colour</Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput]}
                placeholder="yourhandle"
                placeholderTextColor="#ABABAB"
                value={username}
                onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#ABABAB"
              value={dob}
              onChangeText={setDob}
              keyboardType="numeric"
            />
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <HuddleButton label="Let's Go" onPress={handleComplete} loading={loading} fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 36,
  },
  header: {
    gap: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#000000",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#8A8A8A",
  },
  avatarSection: {
    alignItems: "center",
    gap: 12,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
  },
  colorLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#8A8A8A",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#000000",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#000000",
    letterSpacing: 0.1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  atSign: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "#8A8A8A",
    marginRight: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 0,
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FF3B30",
  },
});
