import { AttachedWager } from "@/components/AttachedWager";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import { supabase } from "@/lib/supabase";

export const getRank = (winRate: number, totalPicks: number = 5) => {
  if (totalPicks < 5) return "Rookie";
  if (winRate >= 95 && totalPicks >= 30) return "Oracle";
  if (winRate >= 85 && totalPicks >= 25) return "GOAT";
  if (winRate >= 70 && totalPicks >= 15) return "Champion";
  if (winRate >= 60 && totalPicks >= 10) return "All Star";
  if (winRate >= 50) return "Starter";
  if (winRate >= 35) return "Coin Flipper";
  if (winRate >= 20) return "Beginner's Luck";
  return "Benchwarmer";
};

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  points: number;
  winRate: number;
  totalPicks: number;
  isYou: boolean;
}

export default function LeagueMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, leaderboard } = useData(); 
  const { user } = useAuth();
  
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const [tab, setTab] = useState<"chat" | "leaderboard">("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // NEW: State to hold the shared wager attachment
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);

  const league = leagues.find((l) => l.id === id);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchMessages = async () => {
    if (!id) return;
    try {
      const { data: msgsData, error } = await supabase
        .from("messages")
        .select("*")
        .eq("huddle_id", id)
        .order("created_at", { ascending: true });

      if (error || !msgsData) return;

      const userIds = [...new Set(msgsData.map(m => m.sender_id).filter(Boolean))];
      const { data: usersData } = await supabase.from("users").select("*").in("id", userIds);

      const fullyBuiltMessages = msgsData.map(m => ({
        ...m,
        users: usersData?.find(u => u.id === m.sender_id) || null
      }));

      setMessages(fullyBuiltMessages);
    } catch (error) {
      console.log("Error loading messages:", error);
    }
  };

  // THIS CATCHES THE WAGER WHEN YOU ENTER THE HUDDLE
  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager_huddle");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      await AsyncStorage.removeItem("pending_share_wager_huddle");
      setTab("chat");
    }
  };

  useFocusEffect(useCallback(() => { 
    fetchMessages(); 
    checkPendingShares(); 
  }, [id]));

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachedWagerId) || !user || !id) return;
    setIsSubmitting(true);
    
    // We send the prediction ID into the new image_url column temporarily to render it as a receipt in chat
    try {
      const { error } = await supabase.from("messages").insert({
        huddle_id: id,
        sender_id: user.id,
        content: newMessage.trim() || "Check out my prediction! 👀",
        image_url: attachedWagerId 
      });
      
      if (error) throw error;
      setNewMessage("");
      setAttachedWagerId(null);
      fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProfile = (m: Member | any) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileUser({
      userId: m.id || m.userId,
      username: m.username,
      displayName: m.displayName || m.display_name || m.username,
      avatarColor: m.avatarColor || m.avatar_color || colors.primary,
      points: m.points || 0,
      winRate: m.winRate || 0,
    });
  };

  if (!league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Huddle not found.</Text>
      </View>
    );
  }

  const members: Member[] = league.memberIds.map((uid) => {
    const globalData = leaderboard.find((l) => l.userId === uid);
    const picksCounter = (globalData as any)?.total_picks ?? (globalData as any)?.picksCount ?? 5;
    
    if (uid === user?.id || uid === "me") {
      return {
        id: uid,
        username: globalData?.username || "ceo",
        displayName: globalData?.displayName || "ceo",
        avatarColor: globalData?.avatarColor || user?.avatarColor || "#000000",
        points: globalData?.points ?? user?.points ?? 0,
        winRate: globalData?.winRate ?? user?.winRate ?? 0,
        totalPicks: picksCounter,
        isYou: true,
      };
    }
    return {
      id: uid,
      username: globalData?.username || "Player",
      displayName: globalData?.displayName || "Player",
      avatarColor: globalData?.avatarColor || "#8A8A8A",
      points: globalData?.points ?? 0,
      winRate: globalData?.winRate ?? 0,
      totalPicks: picksCounter,
      isYou: false,
    };
  });

  const sortedMembers = [...members].sort((a, b) => b.points - a.points);

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
          
          {item.image_url && (
            <View style={[styles.miniReceipt, { backgroundColor: isMe ? "rgba(255,255,255,0.15)" : colors.background }]}>
              <Feather name="file-text" size={14} color={isMe ? colors.background : colors.foreground} style={{ marginBottom: 4 }} />
              <Text style={[styles.miniReceiptLabel, { color: isMe ? colors.background : colors.foreground }]}>Prediction Attached</Text>
            </View>
          )}
          
          <Text style={[styles.messageText, { color: isMe ? colors.background : colors.foreground }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        
        <Pressable style={styles.headerCenter} onPress={() => setTab("leaderboard")}>
          <Text style={[styles.leagueName, { color: colors.foreground }]} numberOfLines={1}>
            {league.name}
          </Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {league.memberIds.length} {league.memberIds.length === 1 ? "member" : "members"}
          </Text>
        </Pressable>
        <View style={styles.headerBtn} />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => setTab("chat")} style={[styles.tabBtn, tab === "chat" && { borderBottomColor: colors.foreground }]}>
          <Text style={[styles.tabLabel, { color: tab === "chat" ? colors.foreground : colors.mutedForeground }]}>Group Chat</Text>
        </Pressable>
        <Pressable onPress={() => setTab("leaderboard")} style={[styles.tabBtn, tab === "leaderboard" && { borderBottomColor: colors.foreground }]}>
          <Text style={[styles.tabLabel, { color: tab === "leaderboard" ? colors.foreground : colors.mutedForeground }]}>Leaderboard</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {tab === "leaderboard" ? (
          <FlatList<Member>
            data={sortedMembers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) }}
            ListHeaderComponent={<Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MEMBERS</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openProfile(item)}
                style={({ pressed }) => [styles.memberRow, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
              >
                <Avatar color={item.avatarColor} username={item.username} size={44} />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.displayName}
                    {item.isYou ? " (you)" : ""}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={[styles.memberHandle, { color: colors.mutedForeground, marginTop: 0 }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                    <View style={[styles.rankBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.badgeText, { color: colors.foreground }]}>{getRank(item.winRate, item.totalPicks)}</Text>
                    </View>
                  </View>

                </View>
                <View style={styles.memberRight}>
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.memberPoints, { color: colors.foreground }]}>{item.points.toLocaleString()}</Text>
                    <Text style={[styles.memberPointsLabel, { color: colors.mutedForeground }]}>pts</Text>
                  </View>
                  <Text style={[styles.memberWinRate, { color: colors.mutedForeground }]}>{item.winRate}% win</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              renderItem={renderMessage}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Say what's up to the Huddle! 👋</Text>}
            />
            
            <View style={[styles.inputContainer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "ios" ? insets.bottom || 16 : 16, flexDirection: 'column' }]}>
              
              {/* THE BLUE ATTACHMENT BADGE */}
              {attachedWagerId && (
                <View style={[styles.attachmentBadge, { backgroundColor: "rgba(59, 123, 229, 0.1)" }]}>
                  <Feather name="paperclip" size={14} color="#3B7BE5" />
                  <Text style={styles.attachmentText}>Prediction Receipt Attached</Text>
                  <Pressable onPress={() => setAttachedWagerId(null)}>
                    <Feather name="x" size={16} color="#3B7BE5" />
                  </Pressable>
                </View>
              )}

              <View style={{ flexDirection: "row", alignItems: "flex-end", width: "100%" }}>
                <TextInput 
                  style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} 
                  placeholder="Message group..." 
                  placeholderTextColor={colors.mutedForeground} 
                  value={newMessage} 
                  onChangeText={setNewMessage} 
                  multiline 
                />
                <Pressable 
                  onPress={handleSend} 
                  disabled={(!newMessage.trim() && !attachedWagerId) || isSubmitting} 
                  style={({pressed}) => [{ opacity: (!newMessage.trim() && !attachedWagerId) || pressed ? 0.5 : 1 }, styles.sendBtn]}
                >
                  <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  leagueName: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: -0.2 },
  memberCount: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  sectionLabel: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: -0.2 },
  memberHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  rankBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  memberRight: { alignItems: "flex-end", marginRight: 4, gap: 2 },
  pointsContainer: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  memberPoints: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: -0.3 },
  memberPointsLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  memberWinRate: { fontFamily: "Inter_500Medium", fontSize: 11 },
  emptyText: { textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 15 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  messageMe: { justifyContent: "flex-end" },
  messageThem: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4, marginLeft: 8 },
  messageName: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 4 },
  messageText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  attachmentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
  attachmentText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: "#3B7BE5" },
  miniReceipt: { padding: 8, borderRadius: 8, marginBottom: 6 },
  miniReceiptLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});