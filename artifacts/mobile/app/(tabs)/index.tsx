import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Alert, TextInput, Modal, KeyboardAvoidingView, RefreshControl, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";

const isWeb = Platform.OS === "web";

const getFlag = (team: string) => {
  const flags: Record<string, string> = { "Argentina": "🇦🇷", "Brazil": "🇧🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "France": "🇫🇷", "USA": "🇺🇸", "Draw": "⚖️", "Spain": "🇪🇸", "Belgium": "🇧🇪" };
  return flags[team] || ""; 
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; 
  const topPad = isWeb ? 20 : insets.top;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [composeOpen, setComposeOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);

  const [fireModalOpen, setFireModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [fireAmount, setFireAmount] = useState<string>("50");
  
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);

  const fetchPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase.from("posts").select(`*`).order("created_at", { ascending: false });
      if (postsError) return;
      if (!postsData || postsData.length === 0) { setPosts([]); return; }

      const userIds = [...new Set(postsData.map(p => p.user_id).filter(Boolean))];
      const postIds = postsData.map(p => p.id);

      const { data: usersData } = await supabase.from("users").select("*").in("id", userIds);
      const { data: likesData } = await supabase.from("post_likes").select("*").in("post_id", postIds);
      const { data: commentsData } = await supabase.from("comments").select("id, post_id").in("post_id", postIds);

      const wagerIds = postsData.map(p => p.wager_id).filter(Boolean);
      let wagersMap: Record<string, any> = {};

      if (wagerIds.length > 0) {
        const { data: wagersData } = await supabase.from("wagers").select("*").in("id", wagerIds);
        const fixtureIds = wagersData?.map(w => w.fixture_id || w.fixtureId).filter(Boolean) || [];
        
        let fixturesMap: Record<string, any> = {};
        if (fixtureIds.length > 0) {
          const { data: fixturesData } = await supabase.from("fixtures").select("*").in("id", fixtureIds);
          fixturesData?.forEach(f => fixturesMap[f.id] = f);
        }

        wagersData?.forEach(w => {
          const f = fixturesMap[w.fixture_id || w.fixtureId];
          wagersMap[w.id] = { ...w, homeScore: f?.homeScore ?? f?.home_score, awayScore: f?.awayScore ?? f?.away_score, homeTeam: f?.homeTeam ?? f?.home_team, awayTeam: f?.awayTeam ?? f?.away_team };
        });
      }

      const fullyBuiltPosts = postsData.map(post => {
        const author = usersData?.find(u => u.id === post.user_id) || null;
        const postLikes = likesData?.filter(l => l.post_id === post.id) || [];
        const postCommentsCount = commentsData?.filter(c => c.post_id === post.id).length || 0;
        const postWager = post.wager_id ? wagersMap[post.wager_id] : null;
        
        return { ...post, users: author, post_likes: postLikes, commentsCount: postCommentsCount, wager: postWager };
      });

      setPosts(fullyBuiltPosts);
    } catch (error: any) {} finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchPosts(); }, []);
  useFocusEffect(useCallback(() => { fetchPosts(); checkPendingShares(); }, []));

  const checkPendingShares = async () => {
    const pendingShare = await AsyncStorage.getItem("pending_share_wager");
    if (pendingShare) {
      setAttachedWagerId(pendingShare);
      await AsyncStorage.removeItem("pending_share_wager");
      setTimeout(() => { if (isDesktop) inputRef.current?.focus(); else setComposeOpen(true); }, 300);
    }
  };

  const handleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;
    if (!isDesktop && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setPosts(current => current.map(p => {
      if (p.id === postId) {
        const safeLikes = p.post_likes || [];
        const newLikes = hasLiked ? safeLikes.filter((l: any) => l.user_id !== user.id) : [...safeLikes, { user_id: user.id }];
        return { ...p, post_likes: newLikes };
      }
      return p;
    }));

    if (hasLiked) await supabase.from("post_likes").delete().match({ post_id: postId, user_id: user.id });
    else await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  };

  const openFireModal = (post: any) => {
    if (!user) return;
    if (!isDesktop && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPost(post); setFireAmount("50"); setFireModalOpen(true);
  };

  const submitFireAward = async () => {
    const amount = parseInt(fireAmount, 10);
    if (isNaN(amount) || amount < 1 || amount > 50) return Alert.alert("Invalid Amount", "Please enter a number between 1 and 50.");
    setFireModalOpen(false);

    try {
      await supabase.rpc('award_fire', { post_id_param: selectedPost.id, giver_id_param: user?.id, author_id_param: selectedPost.user_id, tip_amount: amount });
      setPosts(current => current.map(p => p.id === selectedPost.id ? { ...p, fire_count: (p.fire_count || 0) + 1 } : p));
      if (!isDesktop && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const submitPost = async () => {
    if (!user) return Alert.alert("Auth Error", "Are you logged in?");
    const finalContent = newPostText.trim() || (attachedWagerId ? "Check out my prediction! 👀" : "");
    if (!finalContent) return;
    
    try {
      await supabase.from("posts").insert({ user_id: user.id, content: finalContent, wager_id: attachedWagerId });
      setNewPostText(""); setAttachedWagerId(null); setComposeOpen(false); fetchPosts(); 
    } catch (error: any) { Alert.alert("Crash", error.message); }
  };

  const handleProfileClick = async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
      if (data) {
        let parsedWinRate = data.win_rate ?? data.winRate ?? 0;
        if (parsedWinRate > 0 && parsedWinRate <= 1) parsedWinRate = Math.round(parsedWinRate * 100);

        setProfileUser({
          userId: data.id,
          username: data.username,
          displayName: data.display_name || data.username,
          avatarColor: data.avatar_color || colors.primary,
          points: data.points || 0,
          winRate: parsedWinRate
        });
      }
    } catch (e) {}
  };

  const renderPost = useCallback(({ item }: { item: any }) => {
    const isLit = item.fire_count > 0;
    const activeUser = user as any; 
    let dbUser = item.users;
    
    const finalUserId = dbUser?.id || "";
    const finalUsername = dbUser?.username || activeUser?.username || "player";
    const finalDisplayName = dbUser?.display_name || dbUser?.displayName || dbUser?.username || "Player";
    const finalColor = dbUser?.avatar_color || activeUser?.avatar_color || activeUser?.avatarColor || colors.primary;
    
    const safeLikes = item.post_likes || [];
    const likesCount = safeLikes.length;
    const hasLiked = safeLikes.some((l: any) => l.user_id === user?.id);

    let miniReceipt = null;
    if (item.wager) {
      const won = item.wager.status === "won";
      const lost = item.wager.status === "lost";
      const predictionStr = item.wager.prediction || item.wager.choice;
      const fPrediction = getFlag(predictionStr);
      const displayPred = predictionStr === "Draw" ? "⚖️ Draw" : `${fPrediction ? fPrediction + " " : ""}${predictionStr}`;
      
      // NEW: Dynamic Match Header!
      let matchHeader = null;
      const homeTeam = item.wager.homeTeam || item.wager.home_team;
      const awayTeam = item.wager.awayTeam || item.wager.away_team;
      if (homeTeam && awayTeam) {
          const homeScore = item.wager.homeScore ?? item.wager.home_score;
          const awayScore = item.wager.awayScore ?? item.wager.away_score;
          let scoreText = "";
          if (homeScore !== undefined && awayScore !== undefined && homeScore !== null && awayScore !== null) {
              scoreText = ` (${homeScore} - ${awayScore})`;
          }
          matchHeader = <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 6, color: colors.foreground }}>{getFlag(homeTeam)} {homeTeam} vs {getFlag(awayTeam)} {awayTeam}{scoreText}</Text>;
      }

      miniReceipt = (
        <View style={[styles.miniReceipt, { borderColor: colors.border, backgroundColor: won ? "rgba(52, 199, 89, 0.05)" : lost ? "rgba(255, 59, 48, 0.05)" : colors.background }]}>
          <View style={styles.miniReceiptTop}>
            <Text style={[styles.miniReceiptLabel, { color: colors.mutedForeground }]}>Prediction</Text>
            <View style={[styles.miniReceiptBadge, { backgroundColor: won ? colors.primary : lost ? colors.secondary : colors.border }]}>
               <Text style={[styles.miniReceiptStatus, { color: won ? colors.primaryForeground : colors.foreground }]}>{won ? "WON" : lost ? "LOST" : "PENDING"}</Text>
            </View>
          </View>
          {matchHeader}
          <Text style={[styles.miniReceiptPred, { color: colors.foreground }]}>{displayPred}</Text>
          <Text style={[styles.miniReceiptPts, { color: colors.mutedForeground }]}>{won ? `+${item.wager.payout} pts` : lost ? `-${item.wager.amount} pts` : `${item.wager.amount} pts at stake`}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.postContainer, { borderBottomColor: colors.border }, isLit && styles.postLit]}>
        <Pressable onPress={() => handleProfileClick(finalUserId)}>
          <Avatar color={finalColor} username={finalUsername} size={48} />
        </Pressable>

        <Pressable style={styles.postContent} onPress={() => router.push(`/post/${item.id}`)}>
          <View style={styles.postHeader}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{finalDisplayName}</Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{finalUsername} · {formatTimeAgo(item.created_at)}</Text>
          </View>
          
          <Text style={[styles.postText, { color: colors.foreground }]}>{item.content}</Text>
          {miniReceipt}
          
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={(e) => { e.stopPropagation(); handleLike(item.id, hasLiked); }}>
              <FontAwesome5 name="heart" size={18} color={hasLiked ? "#FF3B30" : colors.mutedForeground} solid={hasLiked} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{likesCount}</Text>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={(e) => { e.stopPropagation(); router.push(`/post/${item.id}`); }}>
              <Feather name="message-circle" size={18} color={colors.mutedForeground} />
              <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{item.commentsCount}</Text>
            </Pressable>
            
            <Pressable style={styles.actionButton} onPress={(e) => { e.stopPropagation(); openFireModal(item); }}>
              <FontAwesome5 name="fire" size={18} color={isLit ? "#FF6B00" : colors.mutedForeground} solid={isLit} />
              {isLit && <Text style={[styles.actionText, { color: "#FF6B00" }]}>{item.fire_count}</Text>}
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }, [user, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Home</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            isDesktop ? (
              <View style={[styles.composeContainer, { borderBottomColor: colors.border }]}>
                <TextInput ref={inputRef} style={[styles.composeInput, { color: colors.foreground }]} placeholder="What's your latest prediction?" placeholderTextColor={colors.mutedForeground} multiline value={newPostText} onChangeText={setNewPostText} />
                {attachedWagerId && (
                  <View style={[styles.attachmentBadge, { backgroundColor: "rgba(59, 123, 229, 0.1)" }]}>
                    <Feather name="paperclip" size={14} color="#3B7BE5" />
                    <Text style={styles.attachmentText}>Prediction Receipt Attached</Text>
                    <Pressable onPress={() => setAttachedWagerId(null)}>
                      <Feather name="x" size={16} color="#3B7BE5" />
                    </Pressable>
                  </View>
                )}
                <View style={styles.composeFooter}>
                  <Pressable style={[styles.postBtn, { backgroundColor: newPostText.trim() || attachedWagerId ? colors.foreground : colors.mutedForeground }]} onPress={submitPost} disabled={!newPostText.trim() && !attachedWagerId}>
                    <Text style={[styles.postBtnText, { color: colors.background }]}>Post</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />}
          ListEmptyComponent={!loading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet. Start the conversation!</Text> : null}
        />
      </KeyboardAvoidingView>

      {!isDesktop && (
        <Pressable style={[styles.fab, { backgroundColor: colors.foreground }]} onPress={() => setComposeOpen(true)}>
          <Feather name="plus" size={26} color={colors.background} />
        </Pressable>
      )}

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />

      {!isDesktop && (
        <Modal visible={composeOpen} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlayBottom}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => { setComposeOpen(false); setAttachedWagerId(null); }}>
                  <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.postBtn, { backgroundColor: newPostText.trim() || attachedWagerId ? colors.foreground : colors.mutedForeground }]} onPress={submitPost} disabled={!newPostText.trim() && !attachedWagerId}>
                  <Text style={[styles.postBtnText, { color: colors.background }]}>Post</Text>
                </Pressable>
              </View>
              
              {attachedWagerId && (
                <View style={[styles.attachmentBadge, { backgroundColor: "rgba(59, 123, 229, 0.1)" }]}>
                  <Feather name="paperclip" size={14} color="#3B7BE5" />
                  <Text style={styles.attachmentText}>Prediction Receipt Attached</Text>
                  <Pressable onPress={() => setAttachedWagerId(null)}>
                    <Feather name="x" size={16} color="#3B7BE5" />
                  </Pressable>
                </View>
              )}

              <TextInput style={[styles.composeInput, { color: colors.foreground }]} placeholder="What's your latest prediction?" placeholderTextColor={colors.mutedForeground} multiline autoFocus value={newPostText} onChangeText={setNewPostText} />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <Modal visible={fireModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlayCenter}>
          <View style={[styles.fireModalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.fireModalTitle, { color: colors.foreground }]}>Award Fire 🔥</Text>
            <Text style={[styles.fireModalSub, { color: colors.mutedForeground }]}>Tip up to 50 pts. The house takes a 20% tax.</Text>
            <View style={styles.fireQuickButtons}>
              {["10", "25", "50"].map(val => (
                <Pressable key={val} style={[styles.fireQuickBtn, fireAmount === val ? { backgroundColor: "#FF6B00", borderColor: "#FF6B00" } : { borderColor: colors.border }]} onPress={() => setFireAmount(val)}>
                  <Text style={[styles.fireQuickText, { color: fireAmount === val ? "#FFF" : colors.foreground }]}>{val}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={[styles.fireInput, { color: colors.foreground, borderColor: colors.border }]} keyboardType="number-pad" maxLength={2} value={fireAmount} onChangeText={setFireAmount} placeholder="Custom 1-50" placeholderTextColor={colors.mutedForeground} />
            <View style={styles.fireModalActions}>
              <Pressable style={styles.fireCancelBtn} onPress={() => setFireModalOpen(false)}><Text style={[styles.fireCancelText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Pressable style={styles.fireSubmitBtn} onPress={submitFireAward}><Text style={styles.fireSubmitText}>Send Award</Text></Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  topBar: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)", flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: "Inter_700Bold", fontSize: 20 },
  composeContainer: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  composeFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  emptyText: { textAlign: "center", marginTop: 60, fontFamily: "Inter_400Regular", fontSize: 16 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 8, zIndex: 99999 },
  postContainer: { flexDirection: "row", padding: 16, borderBottomWidth: 1, gap: 12 },
  postLit: { backgroundColor: "rgba(255, 107, 0, 0.04)" },
  postContent: { flex: 1 },
  postHeader: { flexDirection: "column", alignItems: "flex-start", marginBottom: 6 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  username: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  postText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginBottom: 12 },
  actionRow: { flexDirection: "row", justifyContent: "flex-start", alignItems: "center", gap: 28 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  actionText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  modalOverlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { height: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 16 },
  postBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  postBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  composeInput: { fontFamily: "Inter_400Regular", fontSize: 18, minHeight: 120, textAlignVertical: "top" },
  attachmentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 16, gap: 8 },
  attachmentText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: "#3B7BE5" },
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  fireModalCard: { width: "100%", maxWidth: 340, borderRadius: 16, padding: 24, borderWidth: 1 },
  fireModalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center", marginBottom: 8 },
  fireModalSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  fireQuickButtons: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, gap: 10 },
  fireQuickBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 8, alignItems: "center" },
  fireQuickText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  fireInput: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 24 },
  fireModalActions: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  fireCancelBtn: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  fireCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  fireSubmitBtn: { flex: 1, paddingVertical: 14, backgroundColor: "#FF6B00", borderRadius: 999, alignItems: "center", justifyContent: "center" },
  fireSubmitText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFF" },
  miniReceipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  miniReceiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  miniReceiptLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  miniReceiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniReceiptStatus: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  miniReceiptPred: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  miniReceiptPts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});