import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/lib/alerts';
import { Feather } from '@expo/vector-icons';

// Generates a random color for new users
const getRandomColor = () => {
  const colors = ["#FF3B30", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register, completeProfile } = useAuth();

  // The exact order you requested
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleRegister = async () => {
    if (!email || !dob || !displayName || !username || !password) {
      return showError("Missing Fields", "Please fill out all fields to create your account.");
    }

    // Age Verification (Must be 18+)
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(dob)) return showError("Invalid Format", "Please use YYYY-MM-DD format for your birthday.");
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    
    if (age < 18) return showError("Age Restriction", "You must be at least 18 years old to join.");

    if (!agreed) {
      return showError("Please agree to continue", "Tick the box to confirm you're 18 or over and agree to the Terms of Use and Privacy Policy.");
    }

    setLoading(true);

    try {
      // 1. Create the Auth Account
      const { error: regError } = await register(email.trim(), password);
      if (regError) throw new Error(regError);

      // 2. Set the Name, Username, Birthday, and assign a random color
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      await completeProfile(displayName.trim(), cleanUsername, dob, getRandomColor());
      
      // The auth listener will automatically push them to Home now!
    } catch (err: any) {
      showError("Registration Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="name@example.com" placeholderTextColor={colors.mutedForeground} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={[styles.label, { color: colors.foreground }]}>Birthday (YYYY-MM-DD)</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="2000-12-31" placeholderTextColor={colors.mutedForeground} value={dob} onChangeText={setDob} maxLength={10} />

          <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="James Smith" placeholderTextColor={colors.mutedForeground} value={displayName} onChangeText={setDisplayName} />

          <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="mikey2x" placeholderTextColor={colors.mutedForeground} value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
          <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} placeholder="Secure password" placeholderTextColor={colors.mutedForeground} value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <View style={styles.consentRow}>
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="I'm 18 or over and agree to the Terms of Use and Privacy Policy"
            hitSlop={8}
            style={[styles.checkbox, { borderColor: colors.foreground, backgroundColor: agreed ? colors.foreground : "transparent" }]}
          >
            {agreed ? <Feather name="check" size={14} color={colors.background} /> : null}
          </Pressable>
          <Text style={[styles.consentText, { color: colors.foreground }]} onPress={() => setAgreed((v) => !v)}>
            I'm 18 or over and I agree to the{" "}
            <Text style={styles.consentLink} onPress={() => router.push('/terms' as any)}>Terms of Use</Text>
            {" "}and{" "}
            <Text style={styles.consentLink} onPress={() => router.push('/privacy' as any)}>Privacy Policy</Text>.
          </Text>
        </View>

        <Pressable style={[styles.submitBtn, { backgroundColor: loading || !agreed ? colors.mutedForeground : colors.foreground }]} onPress={handleRegister} disabled={loading}>
          <Text style={[styles.submitBtnText, { color: colors.background }]}>{loading ? "Creating Account..." : "Sign up"}</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/login')}>
            <Text style={[styles.footerLink, { color: colors.foreground }]}>Log in</Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1, marginBottom: 8 },
  form: { gap: 16, marginBottom: 32 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: -8, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: 'Inter_400Regular' },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: -12, marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  consentText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  consentLink: { fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline' },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  footerLink: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }
});