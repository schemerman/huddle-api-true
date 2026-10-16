import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LEADERBOARD_COLUMNS, useData, userRowToLeaderboardEntry } from "@/context/DataContext";
import { Avatar } from "@/components/Avatar";
import { RankingRow } from "@/components/RankingRow";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import { supabase } from "@/lib/supabase";
import { AttachedWager } from "@/components/AttachedWager";
import {
  type ChatMessage,
  appendUnique,
  confirmMessage,
  getAttachment,
  insertMessage,
  makeTempId,
  mergeWithLocal,
  patchMessage,
  setStatus,
  showError,
} from "@/lib/chat";
import { pickImage, uploadImage, type PickedImage } from "@/lib/upload";
import { USER_COLUMNS } from "@/lib/users";

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
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const sendingRef = useRef(false);
  const usersById = useRef<Record<string, any>>({});
  const triedLeagueRefresh = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const scrollToEnd = (delay = 300) => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), delay);
  const canSend = !!newMessage.trim() || !!selectedImage;

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
    const { data } = await supabase.from("users").select(USER_COLUMNS).in("id", missing);
    rememberUsers(data);
  };

  const memberKey = league ? Array.from(new Set(league.memberIds)).join(",") : "";
  const loadMembers = useCallback(() => {
    const ids = memberKey ? memberKey.split(",") : [];
    if (ids.length === 0) {
      setMembers([]);
      return () => {};
    }
    let cancelled = false;
    supabase.from("users").select(LEADERBOARD_COLUMNS).in("id", ids).then(({ data }) => {
      if (cancelled || !data) return;
      rememberUsers(data);
      setMembers([...data].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)));
    });
    return () => { cancelled = true; };
  }, [memberKey]);

  // Reload members whenever the screen is shown, so points and win rates are current.
  useFocusEffect(loadMembers);

  // Same rows, badges and win rates as Global Rankings.
  const standings = useMemo(() => members.map((row, i) => userRowToLeaderboardEntry(row, i + 1)), [members]);

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

  useFocusEffect(useCallback(() => { fetchMessages(); }, [id]));

  const handlePickImage = async () => {
    try {
      const image = await pickImage();
      if (image) setSelectedImage(image);
    } catch (e: any) {
      showError("Couldn't open photos", e?.message || "Please try again.");
    }
  };

  // Uploads the photo first (if any), then saves the message. Safe to call again on retry.
  const deliver = async (draft: ChatMessage) => {
    if (!id) return;
    let imageUrl = draft.image_url;
    if (draft.pending_upload && !imageUrl) {
      try {
        imageUrl = await uploadImage(draft.pending_upload, draft.sender_id, "chat");
        setMessages(prev => patchMessage(prev, draft.id, { image_url: imageUrl }));
      } catch (e: any) {
        setMessages(prev => setStatus(prev, draft.id, "failed"));
        showError("Photo not sent", e?.message || "Could not upload the photo. Tap it to try again.");
        return;
      }
    }

    const { data, error } = await insertMessage({
      huddle_id: id,
      sender_id: draft.sender_id,
      content: draft.content ?? "",
      image_url: imageUrl,
    });
    if (error || !data) {
      setMessages(prev => setStatus(prev, draft.id, "failed"));
      showError("Message not sent", error?.message || "Could not send message. Tap it to try again.");
      return;
    }
    setMessages(prev => confirmMessage(prev, draft.id, data));
  };

  const handleSend = async () => {
    if (sendingRef.current || !canSend || !user || !id) return;
    sendingRef.current = true;
    setIsSubmitting(true);

    const draft: ChatMessage = {
      id: makeTempId(),
      sender_id: user.id,
      huddle_id: id,
      content: newMessage.trim(),
      image_url: null,
      created_at: new Date().toISOString(),
      users: usersById.current[user.id] ?? null,
      status: "sending",
      local_image: selectedImage?.uri ?? null,
      pending_upload: selectedImage,
    };

    setMessages(prev => [...prev, draft]);
    setNewMessage("");
    setSelectedImage(null);
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
              {photoUrl ? <Image source={{ uri: photoUrl }} style={[styles.photo, !item.content && { marginBottom: 0 }]} /> : null}
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
            {selectedImage && (
              <View style={styles.previewWrap}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <Pressable onPress={() => setSelectedImage(null)} style={styles.previewRemove}><Feather name="x" size={14} color="#fff" /></Pressable>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "flex-end", width: "100%" }}>
              <Pressable onPress={handlePickImage} style={styles.imageBtn} accessibilityLabel="Add a photo">
                <Feather name="image" size={22} color={colors.foreground} />
              </Pressable>
              <TextInput style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} placeholder="Message group..." placeholderTextColor={colors.mutedForeground} value={newMessage} onChangeText={setNewMessage} multiline />
              <Pressable onPress={handleSend} disabled={!canSend || isSubmitting} style={({pressed}) => [{ opacity: !canSend || pressed ? 0.5 : 1 }, styles.sendBtn]}>
                {isSubmitting ? <ActivityIndicator size="small" color={colors.foreground as string} /> : <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={standings} keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          renderItem={({ item, index }) => (
            <RankingRow entry={item} position={index + 1} isMe={item.userId === user?.id} onPress={() => setProfileUser(item)} />
          )}
        />
      )}

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
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
  photo: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },
  messageName: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  imageBtn: { paddingRight: 12, paddingBottom: 9 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  previewWrap: { width: 80, height: 80, marginBottom: 12 },
  previewImage: { width: 80, height: 80, borderRadius: 10 },
  previewRemove: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
});
