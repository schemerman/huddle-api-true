import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
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
import { markRead } from "@/lib/conversations";
import { pickImage, uploadImage, type PickedImage } from "@/lib/upload";

export default function DirectMessageScreen() {
  const { id: targetUserId } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const sendingRef = useRef(false);

  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const scrollToEnd = (delay = 300) => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), delay);
  const canSend = !!newMessage.trim() || !!selectedImage;

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
        markRead(user.id, targetUserId);
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
    markRead(user.id, targetUserId);
  };

  useFocusEffect(useCallback(() => { fetchMessages(); }, [user?.id, targetUserId]));

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
    if (!targetUserId) return;
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
      sender_id: draft.sender_id,
      recipient_id: targetUserId,
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
    if (sendingRef.current || !canSend || !user || !targetUserId) return;
    sendingRef.current = true;
    setIsSubmitting(true);

    const draft: ChatMessage = {
      id: makeTempId(),
      sender_id: user.id,
      recipient_id: targetUserId,
      huddle_id: null,
      content: newMessage.trim(),
      image_url: null,
      created_at: new Date().toISOString(),
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
              {photoUrl ? <Image source={{ uri: photoUrl }} style={[styles.photo, !item.content && { marginBottom: 0 }]} /> : null}
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
            <TextInput style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} placeholder="Message..." placeholderTextColor={colors.mutedForeground} value={newMessage} onChangeText={setNewMessage} multiline />
            <Pressable onPress={handleSend} disabled={!canSend || isSubmitting} style={({pressed}) => [{ opacity: !canSend || pressed ? 0.5 : 1 }, styles.sendBtn]}>
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
  photo: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },
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
