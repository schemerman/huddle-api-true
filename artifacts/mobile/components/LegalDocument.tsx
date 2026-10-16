import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL, type LegalDoc } from "@/constants/legal";

// Full-screen legal page. It is a normal route (not a modal) with a flexible ScrollView,
// so long text never gets cut off, and it works signed out (e.g. from the sign-up screen).
export function LegalDocument({ doc, other }: { doc: LegalDoc; other: { label: string; href: "/privacy" | "/terms" } }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 24 : insets.top;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.headerBtn} accessibilityLabel="Back">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{doc.title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{doc.title}</Text>
        <Text style={[styles.updated, { color: colors.mutedForeground }]}>Last updated {LEGAL_EFFECTIVE_DATE}</Text>
        <Text style={[styles.paragraph, { color: colors.foreground }]}>{doc.intro}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]} accessibilityRole="header">{section.heading}</Text>
            {section.body.map((part, i) =>
              typeof part === "string" ? (
                <Text key={i} style={[styles.paragraph, { color: colors.foreground }]}>{part}</Text>
              ) : (
                <View key={i} style={styles.list}>
                  {part.bullets.map((item) => (
                    <View key={item} style={styles.bulletRow}>
                      <Text style={[styles.bullet, { color: colors.mutedForeground }]}>•</Text>
                      <Text style={[styles.bulletText, { color: colors.foreground }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              )
            )}
          </View>
        ))}

        <Pressable
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          style={({ pressed }) => [styles.contactBtn, { backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="mail" size={16} color={colors.background} />
          <Text style={[styles.contactText, { color: colors.background }]}>Email {SUPPORT_EMAIL}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace(other.href as any)} style={styles.otherLink}>
          <Text style={[styles.otherText, { color: colors.mutedForeground }]}>{other.label}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingBottom: 10, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 16 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, maxWidth: 720, width: "100%", alignSelf: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  updated: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4, marginBottom: 16 },
  section: { marginTop: 18 },
  heading: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 8 },
  paragraph: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 8 },
  list: { marginBottom: 8, gap: 6 },
  bulletRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  bullet: { fontFamily: "Inter_700Bold", fontSize: 15, lineHeight: 22 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, paddingVertical: 14, marginTop: 28 },
  contactText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  otherLink: { alignItems: "center", paddingVertical: 16 },
  otherText: { fontFamily: "Inter_500Medium", fontSize: 14, textDecorationLine: "underline" },
});
