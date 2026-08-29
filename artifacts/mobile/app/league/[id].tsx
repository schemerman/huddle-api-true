import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";
import { AttachedWager } from "@/components/AttachedWager";

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [league, setLeague] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [tab, setTab] = useState<"chat" | "leaderboard">("chat");
  const [newMessage, setNewMessage] = useState("");
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      const { data: huddle } = await supabase.from('huddles').select('*').eq('id', id).single();
      if (huddle) setLeague(huddle);
      const { data: membersData } = await supabase.from('huddle_members').select('*, users(*)').eq('huddle_id', id).order('points', { ascending: false });
      if (membersData) setMembers(membersData);
    };
    fetchDetails();

    const channel = supabase.channel(`huddle_${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `huddle_id=eq.${id}` }, (payload) => {
      setMessages(prev => {
        if (prev.find(m => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchMessages = async () => {
    if (!id) return;
    const { data } = await supabase.from("messages").select("*, users(*)").eq("huddle_id", id).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      setTab("chat");
      await AsyncStorage.removeItem("pending_share_wager");
    }
  };

  useFocusEffect(useCallback(() => { fetchMessages(); checkPendingShares(); }, [id]));

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachedWagerId) || !user || !id) return;
    const messageContent = newMessage.trim() || "Check out my prediction! 👀";
    const wagerAttachment = attachedWagerId;

    setNewMessage("");
    setAttachedWagerId(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);

    await supabase.from("messages").insert({
      huddle_id: id,
      sender_id: user.id,
      content: messageContent,
      image_url: wagerAttachment 
    });
  };

  const openProfile = (targetUser: any) => {
    if (targetUser.id === user?.id) router.push('/(tabs)/profile');
    else router.push(`/user/${targetUser.id}` as any);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    const author = item.users || {};
    const username = author.username || "player";
    const displayName = author.display_name || author.displayName || username;
    const avatarColor = author.avatar_color || colors.primary;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageMe : styles.messageThem]}>
        {!isMe && (
          <Pressable onPress={() => openProfile({ ...author, id: item.sender_id })}>
            <Avatar color={avatarColor} username={username} size={32} />
          </Pressable>
        )}
        <View style={[styles.messageBubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.foreground }] : [styles.bubbleThem, { backgroundColor: "rgba(0,0,0,0.05)" }]]}>
          {!isMe && <Text style={[styles.messageName, { color: colors.foreground }]}>{displayName}</Text>}
          
          {item.image_url && <AttachedWager wagerId={item.image_url} />}
          
          <Text style={[styles.messageText, { color: isMe ? colors.background : colors.foreground }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}><Feather name="arrow-left" size={22} color={colors.foreground} /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{league?.name || "Group"}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{members.length} members</Text>
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
              <Pressable onPress={handleSend} disabled={!newMessage.trim() && !attachedWagerId} style={({pressed}) => [{ opacity: (!newMessage.trim() && !attachedWagerId) || pressed ? 0.5 : 1 }, styles.sendBtn]}>
                <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          data={members} keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          renderItem={({ item, index }) => {
            const mUser = item.users || {};
            const isMe = mUser.id === user?.id;
            return (
              <View style={[styles.leaderboardRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rank, { color: colors.foreground }]}>{index + 1}</Text>
                <Pressable onPress={() => openProfile({ ...mUser, id: mUser.id })} style={styles.memberInfo}>
                  <Avatar color={mUser.avatar_color || colors.primary} username={mUser.username || "user"} size={40} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{mUser.display_name || mUser.displayName || mUser.username || "Player"} {isMe ? "(you)" : ""}</Text>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>@{mUser.username}</Text>
                  </View>
                </Pressable>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.memberPts, { color: colors.foreground }]}>{item.points.toLocaleString()} pts</Text>
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
  messageBubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4 },
  messageName: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
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