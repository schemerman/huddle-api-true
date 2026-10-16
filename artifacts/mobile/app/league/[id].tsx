import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import { AttachedWager } from "@/components/AttachedWager";
import {
  type ChatMessage,
  DEFAULT_PREDICTION_TEXT,
  appendUnique,
  confirmMessage,
  getAttachment,
  insertMessage,
  makeTempId,
  mergeWithLocal,
  setStatus,
  showError,
} from "@/lib/chat";

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Huddles are stored in the API's `leagues` table; this is the same list the Huddles tab shows.
  const { leagues, refreshLeagues } = useData();
  const league = leagues.find((l) => l.id === id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<"chat" | "leaderboard">("chat");
  const [newMessage, setNewMessage] = useState("");
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sendingRef = useRef(false);
  const usersById = useRef<Record<string, any>>({});
  const triedLeagueRefresh = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const scrollToEnd = (delay = 300) => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), delay);

  // Opened directly (e.g. after a reload) before the Huddles list loaded: fetch it once.
  useEffect(() => {
    if (!league && !triedLeagueRefresh.current) {
      triedLeagueRefresh.current = true;
      refreshLeagues();
    }
  }, [league, refreshLeagues]);

  const rememberUsers = (rows: any[] | null | undefined) => {
    rows?.forEach((u) => { if (u?.id) usersById.current[u.id] = u; });
  };

  const loadUsers = async (ids: string[]) => {
    const missing = Array.from(new Set(ids)).filter((uid) => uid && !usersById.current[uid]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("users").select("*").in("id", missing);
    rememberUsers(data);
  };

  const memberKey = league ? Array.from(new Set(league.memberIds)).join(",") : "";
  useEffect(() => {
    const ids = memberKey ? memberKey.split(",") : [];
    if (ids.length === 0) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    supabase.from("users").select("*").in("id", ids).then(({ data }) => {
      if (cancelled || !data) return;
      rememberUsers(data);
      setMembers([...data].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)));
    });
    return () => { cancelled = true; };
  }, [memberKey]);

  // Realtime rows don't include the sender, so look them up before showing the message.
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`huddle_${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `huddle_id=eq.${id}` }, async (payload) => {
      const row = payload.new as ChatMessage;
      await loadUsers([row.sender_id]);
      setMessages(prev => appendUnique(prev, { ...row, users: usersById.current[row.sender_id] ?? null }));
      scrollToEnd();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchMessages = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("messages").select("*").eq("huddle_id", id).order("created_at", { ascending: true });
    if (error) {
      console.warn("Could not load group messages:", error.message);
      return;
    }
    const rows = (data ?? []) as ChatMessage[];
    await loadUsers(rows.map((m) => m.sender_id));
    const hydrated = rows.map((m) => ({ ...m, users: usersById.current[m.sender_id] ?? null }));
    setMessages(prev => mergeWithLocal(hydrated, prev));
  };

  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager_huddle");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      setTab("chat");
      await AsyncStorage.removeItem("pending_share_wager_huddle");
    }
  };

  useFocusEffect(useCallback(() => { fetchMessages(); checkPendingShares(); }, [id]));

  const deliver = async (draft: ChatMessage) => {
    if (!id) return;
    const { data, error } = await insertMessage({
      huddle_id: id,
      sender_id: draft.sender_id,
      content: draft.content,
      image_url: draft.image_url,
    });
    if (error || !data) {
      setMessages(prev => setStatus(prev, draft.id, "failed"));
      showError("Message not sent", error?.message || "Could not send message. Tap it to try again.");
      return;
    }
    setMessages(prev => confirmMessage(prev, draft.id, data));
  };

  const handleSend = async () => {
    if (sendingRef.current || (!newMessage.trim() && !attachedWagerId) || !user || !id) return;
    sendingRef.current = true;
    setIsSubmitting(true);

    const draft: ChatMessage = {
      id: makeTempId(),
      sender_id: user.id,
      huddle_id: id,
      content: newMessage.trim() || DEFAULT_PREDICTION_TEXT,
      image_url: attachedWagerId,
      created_at: new Date().toISOString(),
      users: usersById.current[user.id] ?? null,
      status: "sending",
    };

    setMessages(prev => [...prev, draft]);
    setNewMessage("");
    setAttachedWagerId(null);
    scrollToEnd(100);

    try {
      await deliver(draft);
    } finally {
      sendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const retrySend = (msg: ChatMessage) => {
    if (msg.status !== "failed") return;
    setMessages(prev => setStatus(prev, msg.id, "sending"));
    deliver(msg);
  };

  const openProfile = (targetUser: any) => {
    if (targetUser.id === user?.id) router.push('/(tabs)/profile');
    else router.push(`/user/${targetUser.id}` as any);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.id;
    const author = item.users || {};
    const username = author.username || "player";
    const displayName = author.display_name || author.displayName || username;
    const avatarColor = author.avatar_color || colors.primary;
    const { photoUrl, wagerId } = getAttachment(item);
    const failed = item.status === "failed";

    return (
      <View style={[styles.messageRow, isMe ? styles.messageMe : styles.messageThem]}>
        {!isMe && (
          <Pressable onPress={() => openProfile({ ...author, id: item.sender_id })}>
            <Avatar color={avatarColor} username={username} size={32} />
          </Pressable>
        )}
        <Pressable
          disabled={!failed}
          onPress={() => retrySend(item)}
          style={[styles.messageColumn, { alignItems: isMe ? "flex-end" : "flex-start", opacity: item.status === "sending" ? 0.6 : 1 }]}
        >
          {!isMe && <Text style={[styles.messageName, { color: colors.mutedForeground }]}>{displayName}</Text>}

          {wagerId ? <AttachedWager wagerId={wagerId} style={styles.wagerCard} /> : null}

          {photoUrl || item.content ? (
            <View style={[styles.messageBubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.foreground }] : [styles.bubbleThem, { backgroundColor: "rgba(0,0,0,0.05)" }]]}>
              {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
              {item.content ? <Text style={[styles.messageText, { color: isMe ? colors.background : colors.foreground }]}>{item.content}</Text> : null}
            </View>
          ) : null}

          {failed ? <Text style={[styles.statusText, { color: colors.destructive }]}>Not delivered. Tap to retry</Text> : null}
        </Pressable>
      </View>
    );
  };

  const memberCount = league ? new Set(league.memberIds).size : members.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}><Feather name="arrow-left" size={22} color={colors.foreground} /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{league?.name || "Group"}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{memberCount} {memberCount === 1 ? "member" : "members"}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(["chat", "leaderboard"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.foreground : colors.mutedForeground }]}>{t === "chat" ? "Group Chat" : "Leaderboard"}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "chat" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef} data={messages} keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 120 : insets.bottom + 40, flexGrow: 1 }}
            renderItem={renderMessage} showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
          <View style={[styles.inputContainer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "ios" ? insets.bottom || 16 : 16, flexDirection: 'column' }]}>
            {attachedWagerId && (
              <View style={[styles.attachmentBadge, { backgroundColor: "rgba(59, 123, 229, 0.1)" }]}>
                <Feather name="paperclip" size={14} color="#3B7BE5" />
                <Text style={styles.attachmentText}>Prediction Receipt Attached</Text>
                <Pressable onPress={() => setAttachedWagerId(null)}><Feather name="x" size={16} color="#3B7BE5" /></Pressable>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "flex-end", width: "100%" }}>
              <TextInput style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} placeholder="Message group..." placeholderTextColor={colors.mutedForeground} value={newMessage} onChangeText={setNewMessage} multiline />
              <Pressable onPress={handleSend} disabled={(!newMessage.trim() && !attachedWagerId) || isSubmitting} style={({pressed}) => [{ opacity: (!newMessage.trim() && !attachedWagerId) || pressed ? 0.5 : 1 }, styles.sendBtn]}>
                {isSubmitting ? <ActivityIndicator size="small" color={colors.foreground as string} /> : <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={members} keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          renderItem={({ item, index }) => {
            const isMe = item.id === user?.id;
            return (
              <View style={[styles.leaderboardRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rank, { color: colors.foreground }]}>{index + 1}</Text>
                <Pressable onPress={() => openProfile(item)} style={styles.memberInfo}>
                  <Avatar color={item.avatar_color || colors.primary} username={item.username || "user"} size={40} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{item.display_name || item.displayName || item.username || "Player"} {isMe ? "(you)" : ""}</Text>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>@{item.username}</Text>
                  </View>
                </Pressable>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.memberPts, { color: colors.foreground }]}>{(item.points ?? 0).toLocaleString()} pts</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end", gap: 8 },
  messageMe: { justifyContent: "flex-end" },
  messageThem: { justifyContent: "flex-start" },
  messageColumn: { maxWidth: "80%" },
  wagerCard: { marginTop: 0, marginBottom: 6, minWidth: 240 },
  messageBubble: { maxWidth: "100%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4 },
  photo: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageName: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  attachmentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  attachmentText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: "#3B7BE5" },
  leaderboardRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  rank: { fontFamily: "Inter_700Bold", fontSize: 16, width: 24 },
  memberInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  memberHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  memberPts: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
