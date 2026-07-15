import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "now ago";
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
        const { data: commentUsers } = await supabase.from("users").select("*").in("id", userIds);
        
        const builtComments = commentsData.map(c => ({
          ...c,
          users: commentUsers?.find(u => u.id === c.user_id) || null
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const handleSend = async () => {
    if (!newComment.trim() || !user || !id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: id,
        user_id: user.id,
        content: newComment.trim()
      });
      if (error) throw error;
      setNewComment("");
      fetchData(); 
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
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

    if (hasLiked) {
      await supabase.from("post_likes").delete().match({ post_id: post.id, user_id: user.id });
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
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
  const finalUsername = postAuthor.username || activeUser?.username || "player";
  const finalDisplayName = postAuthor.display_name || postAuthor.displayName || finalUsername;
  const finalColor = postAuthor.avatar_color || activeUser?.avatar_color || activeUser?.avatarColor || colors.primary;

  const safeLikes = post.post_likes || [];
  const likesCount = safeLikes.length;
  const hasLikedMain = safeLikes.some((l: any) => l.user_id === user?.id);
  const commentsCount = comments.length;

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
                <View style={styles.authorRow}>
                  <Avatar color={finalColor} username={finalUsername} size={48} />
                  <View style={styles.authorText}>
                    <Text style={[styles.displayName, { color: colors.foreground }]}>{finalDisplayName}</Text>
                    <Text style={[styles.username, { color: colors.mutedForeground }]}>@{finalUsername}</Text>
                  </View>
                </View>
                
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
                  <Feather name="share" size={22} color={colors.foreground} />
                </View>
              </View>

              <View style={[styles.commentsHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.commentsHeaderText, { color: colors.mutedForeground }]}>COMMENTS</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const commentAuthor = item.users || {};
            const finalCommentUsername = commentAuthor.username || "player";
            const finalCommentName = commentAuthor.display_name || commentAuthor.displayName || finalCommentUsername;
            const finalCommentColor = commentAuthor.avatar_color || colors.primary;

            return (
              <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
                <Avatar color={finalCommentColor} username={finalCommentUsername} size={36} />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentDisplayName, { color: colors.foreground }]}>{finalCommentName}</Text>
                    <Text style={[styles.commentUsername, { color: colors.mutedForeground }]}>@{finalCommentUsername} · {formatTimeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{item.content}</Text>
                  <View style={styles.commentActions}>
                    <FontAwesome5 name="heart" size={14} color={colors.mutedForeground} solid={false} />
                    <Text style={[styles.commentActionText, { color: colors.mutedForeground }]}>0</Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to comment.</Text>
          }
        />

        <View style={[styles.inputContainer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "ios" ? insets.bottom || 16 : 16 }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: "rgba(0,0,0,0.05)", color: colors.foreground }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.mutedForeground}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <Pressable 
            onPress={handleSend} 
            disabled={!newComment.trim() || isSubmitting}
            style={({pressed}) => [{ opacity: !newComment.trim() || pressed ? 0.5 : 1 }, styles.sendBtn]}
          >
            <Text style={[styles.sendText, { color: colors.foreground }]}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  authorText: { marginLeft: 12 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  username: { fontFamily: "Inter_400Regular", fontSize: 14 },
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
  commentHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 4 },
  commentDisplayName: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginRight: 6 },
  commentUsername: { fontFamily: "Inter_400Regular", fontSize: 13 },
  commentText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentActionText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  
  emptyText: { textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular", fontSize: 15 },
  
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  sendBtn: { marginLeft: 16, paddingBottom: 10 },
  sendText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});