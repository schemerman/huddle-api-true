import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { MIN_AGE, ageFrom, isRealDate, toIsoDate } from "@/utils/age";

const AVATAR_COLORS = [
  "#E8533A", "#3A7DE8", "#3AE86A", "#E8C83A",
  "#9B3AE8", "#E83A8C", "#3AE8D4",
];

// Returns an error message, or the birth date as YYYY-MM-DD.
function validateDob(dob: string): { error: string } | { iso: string } {
  if (!dob.trim()) return { error: "Date of birth is required." };
  const parts = dob.trim().split("/");
  if (parts.length !== 3) return { error: "Please enter a valid date (DD/MM/YYYY)." };
  const [day, month, year] = parts.map((x) => parseInt(x, 10));
  if ([day, month, year].some(isNaN) || year < 1900 || !isRealDate(year, month, day)) {
    return { error: "Please enter a valid date (DD/MM/YYYY)." };
  }
  const age = ageFrom(year, month, day);
  if (age < MIN_AGE) return { error: `You must be ${MIN_AGE} or older to join Huddle.` };
  if (age > 100) return { error: "Please enter a valid date of birth." };
  return { iso: toIsoDate(year, month, day) };
}

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { completeProfile } = useAuth();
  
  // Added the missing displayName state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  // People who sign up with Google arrive here first: start with the name from their Google account.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const meta: any = data.session?.user?.user_metadata ?? {};
      const name = meta.full_name || meta.name;
      if (name) setDisplayName((current) => current || String(name));
    });
  }, []);

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
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
    const dobResult = validateDob(dob);
    if ("error" in dobResult) {
      setError(dobResult.error);
      return;
    }
    if (!agreed) {
      setError(`Please confirm you're ${MIN_AGE} or over and agree to the Terms of Use and Privacy Policy.`);
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await completeProfile(displayName.trim(), username.trim().toLowerCase(), dobResult.iso, selectedColor);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  const initials = displayName 
    ? displayName.substring(0, 2).toUpperCase() 
    : username 
      ? username.substring(0, 2).toUpperCase() 
      : "??";

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
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="James Smith"
              placeholderTextColor="#ABABAB"
              value={displayName}
              onChangeText={setDisplayName}
              autoCorrect={false}
            />
          </View>

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
              onChangeText={(raw) => {
                const digits = raw.replace(/\D/g, "").substring(0, 8);
                let masked = digits;
                if (digits.length > 4) {
                  masked = digits.substring(0, 2) + "/" + digits.substring(2, 4) + "/" + digits.substring(4);
                } else if (digits.length > 2) {
                  masked = digits.substring(0, 2) + "/" + digits.substring(2);
                }
                setDob(masked);
              }}
              keyboardType="numeric"
            />
            <Text style={styles.dobHint}>Must be {MIN_AGE} or older to join.</Text>
          </View>

          <View style={styles.consentRow}>
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel={`I'm ${MIN_AGE} or over and agree to the Terms of Use and Privacy Policy`}
              hitSlop={8}
              style={[styles.checkbox, agreed && styles.checkboxOn]}
            >
              {agreed ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
            </Pressable>
            <Text style={styles.consentText} onPress={() => setAgreed((v) => !v)}>
              I'm {MIN_AGE} or over and I agree to the{" "}
              <Text style={styles.consentLink} onPress={() => router.push("/terms" as any)}>Terms of Use</Text>
              {" "}and{" "}
              <Text style={styles.consentLink} onPress={() => router.push("/privacy" as any)}>Privacy Policy</Text>.
            </Text>
          </View>
          
          {!!error && <Text style={styles.error}>{error}</Text>}
          <HuddleButton label="Let's Go" onPress={handleComplete} loading={loading} fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#000000", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxOn: { backgroundColor: "#000000" },
  consentText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, color: "#000000" },
  consentLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 36,
  },
  header: { gap: 6 },
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
  avatarSection: { alignItems: "center", gap: 12 },
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
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: "#000000" },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#000000",
    letterSpacing: 0.1,
  },
  dobHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#ABABAB",
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