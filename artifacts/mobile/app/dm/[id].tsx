import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
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

export default function DirectMessageScreen() {
  const { id: targetUserId } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const scrollToEnd = (delay = 300) => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), delay);

  useEffect(() => {
    if (!targetUserId) return;
    const fetchTarget = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', targetUserId).single();
      if (data) setTargetUser(data);
    };
    fetchTarget();
  }, [targetUserId]);

  // Only listen for messages sent to me, and only keep the ones from this conversation.
  // My own sends are added from the insert response instead.
  useEffect(() => {
    if (!user?.id || !targetUserId) return;
    const channel = supabase
      .channel(`dm_${user.id}_${targetUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as ChatMessage;
        if (row.sender_id !== targetUserId || row.huddle_id) return;
        setMessages(prev => appendUnique(prev, row));
        scrollToEnd();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, targetUserId]);

  const fetchMessages = async () => {
    if (!user || !targetUserId) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .is("huddle_id", null)
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("Could not load messages:", error.message);
      return;
    }
    if (data) setMessages(prev => mergeWithLocal(data as ChatMessage[], prev));
  };

  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager_dm");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      await AsyncStorage.removeItem("pending_share_wager_dm");
    }
  };

  useFocusEffect(useCallback(() => { fetchMessages(); checkPendingShares(); }, [user?.id, targetUserId]));

  const deliver = async (draft: ChatMessage) => {
    if (!targetUserId) return;
    const { data, error } = await insertMessage({
      sender_id: draft.sender_id,
      recipient_id: targetUserId,
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
    if (sendingRef.current || (!newMessage.trim() && !attachedWagerId) || !user || !targetUserId) return;
    sendingRef.current = true;
    setIsSubmitting(true);

    const draft: ChatMessage = {
      id: makeTempId(),
      sender_id: user.id,
      recipient_id: targetUserId,
      huddle_id: null,
      content: newMessage.trim() || DEFAULT_PREDICTION_TEXT,
      image_url: attachedWagerId,
      created_at: new Date().toISOString(),
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.id;
    const { photoUrl, wagerId } = getAttachment(item);
    const failed = item.status === "failed";

    return (
      <View style={[styles.messageRow, isMe ? styles.messageMe : styles.messageThem]}>
        <Pressable
          disabled={!failed}
          onPress={() => retrySend(item)}
          style={[styles.messageColumn, { alignItems: isMe ? "flex-end" : "flex-start", opacity: item.status === "sending" ? 0.6 : 1 }]}
        >
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

  const safeColor = targetUser?.avatar_color || colors.primary;
  const safeName = targetUser?.display_name || targetUser?.displayName || targetUser?.username || "Player";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}><Feather name="arrow-left" size={22} color={colors.foreground} /></Pressable>
        <View style={styles.headerCenter}>
          {targetUser && <Avatar color={safeColor} username={targetUser.username} size={30} />}
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{safeName}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef} data={messages} keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 120 : insets.bottom + 40, flexGrow: 1 }}
          renderItem={renderMessage} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Send a message to get started.</Text>
            </View>
          }
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
            <TextInput style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} placeholder="Message..." placeholderTextColor={colors.mutedForeground} value={newMessage} onChangeText={setNewMessage} multiline />
            <Pressable onPress={handleSend} disabled={(!newMessage.trim() && !attachedWagerId) || isSubmitting} style={({pressed}) => [{ opacity: (!newMessage.trim() && !attachedWagerId) || pressed ? 0.5 : 1 }, styles.sendBtn]}>
              {isSubmitting ? <ActivityIndicator size="small" color={colors.foreground as string} /> : <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  headerName: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  messageMe: { justifyContent: "flex-end" },
  messageThem: { justifyContent: "flex-start" },
  messageColumn: { maxWidth: "85%" },
  wagerCard: { marginTop: 0, marginBottom: 6 },
  messageBubble: { maxWidth: "100%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4 },
  photo: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  attachmentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  attachmentText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: "#3B7BE5" },
});
