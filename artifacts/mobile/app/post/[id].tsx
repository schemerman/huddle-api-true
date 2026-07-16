import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal"; // ADDED THE MISSING IMPORT!

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fireModalOpen, setFireModalOpen] = useState(false);
  const [fireAmount, setFireAmount] = useState<string>("50");

  // ADDED THE MISSING PROFILE STATE
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const { data: postData, error: postErr } = await supabase.from("posts").select("*").eq("id", id).single();
      if (postErr) throw postErr;

      const { data: authorData } = await supabase.from("users").select("*").eq("id", postData.user_id).single();
      const { data: likesData } = await supabase.from("post_likes").select("*").eq("post_id", id);
      
      setPost({ ...postData, users: authorData, post_likes: likesData || [] });

      const { data: commentsData, error: commentsErr } = await supabase.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: true });
      if (commentsErr) throw commentsErr;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const commentIds = commentsData.map(c => c.id);

        const { data: commentUsers } = await supabase.from("users").select("*").in("id", userIds);
        const { data: commentLikesData } = await supabase.from("comment_likes").select("*").in("comment_id", commentIds);
        
        const builtComments = commentsData.map(c => ({
          ...c,
          users: commentUsers?.find(u => u.id === c.user_id) || null,
          likes: commentLikesData?.filter(l => l.comment_id === c.id) || []
        }));
        setComments(builtComments);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.log("Error loading post:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  const handleSend = async () => {
    if (!newComment.trim() || !user || !id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({ post_id: id, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
      setNewComment(""); fetchData(); 
    } catch (error: any) { Alert.alert("Error", error.message || "Failed to post comment"); } 
    finally { setIsSubmitting(false); }
  };

  const handleLikeMainPost = async () => {
    if (!user || !post) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const safeLikes = post.post_likes || [];
    const hasLiked = safeLikes.some((l: any) => l.user_id === user.id);

    setPost((current: any) => {
      const newLikes = hasLiked ? safeLikes.filter((l: any) => l.user_id !== user.id) : [...safeLikes, { user_id: user.id }];
      return { ...current, post_likes: newLikes };
    });

    if (hasLiked) await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: user.id });
    else await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
  };

  const handleCommentLike = async (commentId: string, hasLiked: boolean) => {
    if (!user) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setComments(current => current.map(c => {
      if (c.id === commentId) {
        const safeLikes = c.likes || [];
        const newLikes = hasLiked ? safeLikes.filter((l: any) => l.user_id !== user.id) : [...safeLikes, { user_id: user.id }];
        return { ...c, likes: newLikes };
      }
      return c;
    }));

    if (hasLiked) await supabase.from("comment_likes").delete().match({ comment_id: commentId, user_id: user.id });
    else await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
  };

  const openFireModal = () => {
    if (!user) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFireAmount("50"); setFireModalOpen(true);
  };

  const submitFireAward = async () => {
    const amount = parseInt(fireAmount, 10);
    if (isNaN(amount) || amount < 1 || amount > 50) return Alert.alert("Invalid Amount", "Please enter a number between 1 and 50.");
    setFireModalOpen(false);

    try {
      await supabase.rpc('award_fire', { post_id_param: post.id, giver_id_param: user?.id, author_id_param: post.user_id, tip_amount: amount });
      
      setPost((current: any) => ({ ...current, fire_count: (current.fire_count || 0) + 1 }));
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  // ADDED MISSING PROFILE CLICK LOGIC
  const handleProfileClick = async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
      if (data) {
        setProfileUser({
          userId: data.id,
          username: data.username,
          displayName: data.display_name || data.username,
          avatarColor: data.avatar_color || colors.primary,
          points: data.points || 0
        });
      }
    } catch (e) {}
  };

  if (loading || !post) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  const activeUser = user as any;
  const postAuthor = post.users || {};
  const finalUserId = postAuthor.id || "";
  const finalUsername = postAuthor.username || activeUser?.username || "player";
  const finalDisplayName = postAuthor.display_name || postAuthor.displayName || finalUsername;
  const finalColor = postAuthor.avatar_color || activeUser?.avatar_color || activeUser?.avatarColor || colors.primary;

  const safeLikes = post.post_likes || [];
  const likesCount = safeLikes.length;
  const hasLikedMain = safeLikes.some((l: any) => l.user_id === user?.id);
  const commentsCount = comments.length;
  const isLit = post.fire_count > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View style={styles.mainPost}>
                <Pressable style={styles.authorRow} onPress={() => handleProfileClick(finalUserId)}>
                  <Avatar color={finalColor} username={finalUsername} size={48} />
                  <View style={styles.authorText}>
                    <Text style={[styles.displayName, { color: colors.foreground }]}>{finalDisplayName}</Text>
                    <Text style={[styles.username, { color: colors.mutedForeground }]}>@{finalUsername}</Text>
                  </View>
                </Pressable>
                
                <Text style={[styles.mainContent, { color: colors.foreground }]}>{post.content}</Text>
                <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>{formatTimeAgo(post.created_at)}</Text>
                
                <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.statText, { color: colors.foreground }]}><Text style={styles.statBold}>{likesCount}</Text> Likes</Text>
                  <Text style={[styles.statText, { color: colors.foreground, marginLeft: 16 }]}><Text style={styles.statBold}>{commentsCount}</Text> Comments</Text>
                </View>

                <View style={styles.actionRow}>
                  <Pressable onPress={handleLikeMainPost}>
                    <FontAwesome5 name="heart" size={22} color={hasLikedMain ? "#FF3B30" : colors.foreground} solid={hasLikedMain} />
                  </Pressable>
                  <Feather name="message-circle" size={22} color={colors.foreground} />
                  <Pressable onPress={openFireModal}>
                    <FontAwesome5 name="fire" size={22} color={isLit ? "#FF6B00" : colors.foreground} solid={isLit} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.commentsHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.commentsHeaderText, { color: colors.mutedForeground }]}>COMMENTS</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const commentAuthor = item.users || {};
            const finalCommentUserId = commentAuthor.id || "";
            const finalCommentUsername = commentAuthor.username || "player";
            const finalCommentName = commentAuthor.display_name || commentAuthor.displayName || finalCommentUsername;
            const finalCommentColor = commentAuthor.avatar_color || colors.primary;
            
            const safeCommentLikes = item.likes || [];
            const commentLikesCount = safeCommentLikes.length;
            const hasLikedComment = safeCommentLikes.some((l: any) => l.user_id === user?.id);

            return (
              <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => handleProfileClick(finalCommentUserId)}>
                  <Avatar color={finalCommentColor} username={finalCommentUsername} size={36} />
                </Pressable>
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentDisplayName, { color: colors.foreground }]}>{finalCommentName}</Text>
                    <Text style={[styles.commentUsername, { color: colors.mutedForeground }]}>@{finalCommentUsername} · {formatTimeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{item.content}</Text>
                  
                  <Pressable style={styles.commentActions} onPress={() => handleCommentLike(item.id, hasLikedComment)}>
                    <FontAwesome5 name="heart" size={14} color={hasLikedComment ? "#FF3B30" : colors.mutedForeground} solid={hasLikedComment} />
                    <Text style={[styles.commentActionText, { color: hasLikedComment ? "#FF3B30" : colors.mutedForeground }]}>{commentLikesCount}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to comment.</Text>}
        />

        <View style={[styles.inputContainer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "ios" ? insets.bottom || 16 : 16 }]}>
          <TextInput style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]} placeholder="Add a comment..." placeholderTextColor={colors.mutedForeground} value={newComment} onChangeText={setNewComment} multiline />
          <Pressable onPress={handleSend} disabled={!newComment.trim() || isSubmitting} style={({pressed}) => [{ opacity: !newComment.trim() || pressed ? 0.5 : 1 }, styles.sendBtn]}>
            <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* RENDER THE PROFILE MODAL HERE */}
      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />

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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  mainPost: { padding: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  authorText: { marginLeft: 12, flexDirection: "column", alignItems: "flex-start" },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  username: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  mainContent: { fontFamily: "Inter_400Regular", fontSize: 20, lineHeight: 28, marginBottom: 8 },
  timeAgo: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: "row", paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 16 },
  statText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  statBold: { fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", justifyContent: "flex-start", gap: 32, paddingBottom: 8 },
  commentsHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  commentsHeaderText: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 1 },
  commentRow: { flexDirection: "row", padding: 16, borderBottomWidth: 1 },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: { flexDirection: "column", alignItems: "flex-start", marginBottom: 6 },
  commentDisplayName: { fontFamily: "Inter_700Bold", fontSize: 14 },
  commentUsername: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  commentText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentActionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  emptyText: { textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 15 },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
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
});