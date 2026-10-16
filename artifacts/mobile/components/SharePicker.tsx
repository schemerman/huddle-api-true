import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Avatar } from "@/components/Avatar";
import { DEFAULT_PREDICTION_TEXT, insertMessage, showError } from "@/lib/chat";
import { loadDmContacts, searchUsers, userDisplayName, type ChatUser } from "@/lib/conversations";

type Row = { key: string; kind: "huddle" | "dm"; title: string; subtitle: string; avatarColor?: string; username?: string };

/**
 * Lets the user pick a huddle or a person and send a prediction receipt there.
 * On success it reports the chat's route so the caller can open it.
 */
export function SharePicker({
  mode,
  wagerId,
  onBack,
  onSent,
}: {
  mode: "huddle" | "dm";
  wagerId: string;
  onBack: () => void;
  onSent: (chatPath: string) => void;
}) {
  const colors = useColors();
  const { user } = useAuth();
  const { leagues, refreshLeagues } = useData();

  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [results, setResults] = useState<ChatUser[] | null>(null);
  const [loading, setLoading] = useState(mode === "dm");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const myHuddles = leagues.filter((l) => user && l.memberIds.includes(user.id));

  useEffect(() => {
    if (mode === "huddle" && myHuddles.length === 0) refreshLeagues();
  }, [mode]);

  useEffect(() => {
    if (mode !== "dm" || !user) return;
    let active = true;
    loadDmContacts(user.id)
      .then((list) => { if (active) setContacts(list); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, user?.id]);

  // Search any player by username or name once at least two characters are typed.
  useEffect(() => {
    if (mode !== "dm" || !user) return;
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => { searchUsers(query, user.id).then(setResults); }, 250);
    return () => clearTimeout(timer);
  }, [query, mode, user?.id]);

  const rows: Row[] =
    mode === "huddle"
      ? myHuddles.map((l) => ({
          key: l.id,
          kind: "huddle",
          title: l.name,
          subtitle: `${new Set(l.memberIds).size} members`,
        }))
      : (results ?? contacts).map((u) => ({
          key: u.id,
          kind: "dm",
          title: userDisplayName(u),
          subtitle: `@${u.username ?? "player"}`,
          avatarColor: u.avatar_color,
          username: u.username,
        }));

  const send = async (row: Row) => {
    if (!user || sendingTo) return;
    setSendingTo(row.key);
    const { error } = await insertMessage({
      sender_id: user.id,
      content: message.trim() || DEFAULT_PREDICTION_TEXT,
      image_url: wagerId,
      ...(row.kind === "huddle" ? { huddle_id: row.key } : { recipient_id: row.key }),
    });
    setSendingTo(null);
    if (error) {
      showError("Couldn't share", error.message || "Please try again.");
      return;
    }
    onSent(row.kind === "huddle" ? `/league/${row.key}` : `/dm/${row.key}`);
  };

  const emptyText =
    mode === "huddle"
      ? "You're not in any huddles yet. Create or join one from the Huddles tab."
      : results
        ? "No players match that search."
        : "No chats yet. Search for a player by username.";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Back to receipt">
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{mode === "huddle" ? "Share to a huddle" : "Send in a DM"}</Text>
        <View style={styles.backBtn} />
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]}
        placeholder="Add a message (optional)"
        placeholderTextColor={colors.mutedForeground}
        value={message}
        onChangeText={setMessage}
      />

      {mode === "dm" && (
        <View style={[styles.searchRow, { borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search players"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.mutedForeground as string} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>{emptyText}</Text>}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              {item.kind === "dm" ? (
                <Avatar color={item.avatarColor || (colors.primary as string)} username={item.username || "player"} size={36} />
              ) : (
                <View style={[styles.huddleIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={16} color={colors.foreground} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <Pressable
                onPress={() => send(item)}
                disabled={!!sendingTo}
                style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.foreground, opacity: pressed || (sendingTo && sendingTo !== item.key) ? 0.5 : 1 }]}
              >
                {sendingTo === item.key ? (
                  <ActivityIndicator size="small" color={colors.background as string} />
                ) : (
                  <Text style={[styles.sendText, { color: colors.background }]}>Send</Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 17 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 10 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontFamily: "Inter_400Regular", fontSize: 14 },
  list: { maxHeight: 340 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  huddleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  sendBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7, minWidth: 64, alignItems: "center" },
  sendText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginVertical: 20, lineHeight: 19 },
});
