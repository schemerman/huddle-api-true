import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import { AttachedWager } from "@/components/AttachedWager";

export default function DirectMessageScreen() {
  const { id: targetUserId } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (!targetUserId) return;
    const fetchTarget = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', targetUserId).single();
      if (data) setTargetUser(data);
    };
    fetchTarget();

    const channel = supabase
      .channel(`dm_${targetUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [targetUserId]);

  const fetchMessages = async () => {
    if (!user || !targetUserId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .is("huddle_id", null)
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager_dm");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      await AsyncStorage.removeItem("pending_share_wager_dm");
    }
  };

  useFocusEffect(useCallback(() => { fetchMessages(); checkPendingShares(); }, [user?.id, targetUserId]));

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachedWagerId) || !user || !targetUserId) return;
    setIsSubmitting(true);
    
    const messageContent = newMessage.trim() || "Check out my prediction! 👀";
    const wagerAttachment = attachedWagerId;
    
    const optimisticMessage = {
      id: Math.random().toString(),
      sender_id: user.id,
      recipient_id: targetUserId,
      content: messageContent,
      image_url: wagerAttachment,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    setAttachedWagerId(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: targetUserId,
        content: messageContent,
        image_url: wagerAttachment 
      });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Delivery Failed", e.message || "Could not send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageMe : styles.messageThem]}>
        <View style={[styles.messageBubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.foreground }] : [styles.bubbleThem, { backgroundColor: "rgba(0,0,0,0.05)" }]]}>
          {item.image_url && <AttachedWager wagerId={item.image_url} />}
          <Text style={[styles.messageText, { color: isMe ? colors.background : colors.foreground }]}>{item.content}</Text>
        </View>
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
  messageBubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  attachmentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  attachmentText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: "#3B7BE5" },
});