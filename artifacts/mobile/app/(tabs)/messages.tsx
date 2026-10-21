import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View, Pressable, ActivityIndicator, SectionList, Modal, TextInput, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import { previewText } from "@/lib/chat";
import { useBlockedIds } from "@/lib/safety";
import {
  loadConversations,
  loadDmContacts,
  loadFollowing,
  searchUsers,
  userDisplayName,
  type ChatUser,
  type Conversation,
} from "@/lib/conversations";

type Row = { kind: "chat"; conversation: Conversation } | { kind: "person"; user: ChatUser };

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const blocked = useBlockedIds();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [following, setFollowing] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [chats, follows] = await Promise.all([loadConversations(user.id), loadFollowing(user.id)]);
      const inChats = new Set(chats.map((c) => c.partner.id));
      setConversations(chats);
      setFollowing(follows.filter((u) => !inChats.has(u.id) && u.id !== user.id));
    } catch (e: any) {
      console.warn("Could not load messages:", e?.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadInbox(); }, [loadInbox]));

  // New DMs to me move that conversation to the top and show the unread dot.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`inbox_${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => { loadInbox(); }, 300);
      })
      .subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadInbox]);

  const openChat = (partnerId: string) => router.push(`/dm/${partnerId}` as any);

  const sections = [
    { title: "", data: conversations.filter((c) => !blocked.has(c.partner.id)).map((c): Row => ({ kind: "chat", conversation: c })) },
    ...(following.length ? [{ title: "People you follow", data: following.map((u): Row => ({ kind: "person", user: u })) }] : []),
  ].filter((s) => s.data.length > 0);

  const renderRow = ({ item }: { item: Row }) => {
    const person = item.kind === "chat" ? item.conversation.partner : item.user;
    const unread = item.kind === "chat" && item.conversation.unread;
    const safeColor = person.avatar_color || (colors.primary as string);
    return (
      <Pressable
        onPress={() => openChat(person.id)}
        style={({ pressed }) => [styles.userRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Avatar color={safeColor} username={person.username || "player"} size={48} />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }, unread && styles.unreadText]} numberOfLines={1}>{userDisplayName(person)}</Text>
            {item.kind === "chat" ? (
              <Text style={[styles.time, { color: unread ? colors.foreground : colors.mutedForeground }]}>{timeAgo(item.conversation.lastMessage.created_at)}</Text>
            ) : null}
          </View>
          {item.kind === "chat" ? (
            <Text style={[styles.preview, { color: unread ? colors.foreground : colors.mutedForeground }, unread && styles.unreadText]} numberOfLines={1}>
              {item.conversation.lastMessage.sender_id === user?.id ? "You: " : ""}
              {previewText(item.conversation.lastMessage)}
            </Text>
          ) : (
            <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{person.username}</Text>
          )}
        </View>
        {unread ? <View style={[styles.unreadDot, { backgroundColor: "#3B7BE5" }]} /> : <Feather name="chevron-right" size={18} color={colors.border} />}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <Pressable onPress={() => setComposeOpen(true)} hitSlop={10} accessibilityLabel="New message">
          <Feather name="edit" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => (item.kind === "chat" ? `c_${item.conversation.partner.id}` : `p_${item.user.id}`)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80, flexGrow: 1 }}
          renderItem={renderRow}
          renderSectionHeader={({ section }) =>
            section.title ? (
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, backgroundColor: colors.background }]}>{section.title}</Text>
            ) : null
          }
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap the pencil to find a player and start a chat.
              </Text>
            </View>
          }
        />
      )}

      <NewMessageModal visible={composeOpen} onClose={() => setComposeOpen(false)} onPick={(id) => { setComposeOpen(false); openChat(id); }} />
    </View>
  );
}

function NewMessageModal({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (userId: string) => void }) {
  const colors = useColors();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [results, setResults] = useState<ChatUser[] | null>(null);

  useEffect(() => {
    if (!visible || !user) return;
    setQuery("");
    setResults(null);
    loadDmContacts(user.id).then(setContacts);
  }, [visible, user?.id]);

  useEffect(() => {
    if (!user) return;
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => { searchUsers(query, user.id).then(setResults); }, 250);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const people = results ?? contacts;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New message</Text>
            <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={20} color={colors.foreground} /></Pressable>
          </View>
          <View style={[styles.searchRow, { borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search players"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={people}
            keyExtractor={(u) => u.id}
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.mutedForeground, marginVertical: 20 }]}>
                {results ? "No players match that search." : "Search for a player by username."}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => onPick(item.id)} style={({ pressed }) => [styles.pickRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <Avatar color={item.avatar_color || (colors.primary as string)} username={item.username || "player"} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.displayName, { color: colors.foreground, fontSize: 15 }]} numberOfLines={1}>{userDisplayName(item)}</Text>
                  <Text style={[styles.handle, { color: colors.mutedForeground, marginTop: 0 }]} numberOfLines={1}>@{item.username}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  displayName: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16, letterSpacing: -0.2 },
  time: { fontFamily: "Inter_400Regular", fontSize: 12 },
  preview: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  unreadText: { fontFamily: "Inter_700Bold" },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, borderRadius: 18, borderWidth: 1, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 15 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
});
