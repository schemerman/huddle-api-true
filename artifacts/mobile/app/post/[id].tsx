import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Image } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal"; 

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const getFlag = (team: string) => {
  const flags: Record<string, string> = {
    "Argentina": "🇦🇷", "Australia": "🇦🇺", "Belgium": "🇧🇪", "Brazil": "🇧🇷",
    "Canada": "🇨🇦", "Colombia": "🇨🇴", "Croatia": "🇭🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "France": "🇫🇷", "Ghana": "🇬🇭", "Morocco": "🇲🇦", "Norway": "🇳🇴",
    "Panama": "🇵🇦", "Portugal": "🇵🇹", "Qatar": "🇶🇦", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "Senegal": "🇸🇳", "Spain": "🇪🇸", "Switzerland": "🇨🇭", "USA": "🇺🇸",
    "Uzbekistan": "🇺🇿", "Algeria": "🇩🇿", "Bosnia & Herzegovina": "🇧🇦",
    "DR Congo": "🇨🇩", "Haiti": "🇭🇹", "Iraq": "🇮🇶", "Jordan": "🇯🇴",
    "Saudi Arabia": "🇸🇦", "South Africa": "🇿🇦", "Uruguay": "🇺🇾",
    "Czech Republic": "🇨🇿", "Draw": "⚖️"
  };
  return flags[team] || ""; 
};

const getCrestUrl = (team: string): string | null => {
  const crests: Record<string, string> = {
    "Arsenal": "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    "Aston Villa": "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
    "Bournemouth": "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
    "Brentford": "https://a.espncdn.com/i/teamlogos/soccer/500/139026.png",
    "Brighton": "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
    "Chelsea": "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    "Crystal Palace": "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
    "Everton": "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
    "Fulham": "https://a.espncdn.com/i/teamlogos/soccer/500/370.png",
    "Liverpool": "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    "Man City": "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    "Man United": "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
    "Newcastle": "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
    "Nottm Forest": "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
    "Southampton": "https://a.espncdn.com/i/teamlogos/soccer/500/376.png",
    "Spurs": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "Tottenham": "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
    "West Ham": "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
    "Wolves": "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
    "Leicester": "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
    "Ipswich": "https://a.espncdn.com/i/teamlogos/soccer/500/374.png",
  };
  return crests[team] || null; 
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
  const [fireTarget, setFireTarget] = useState<{ id: string, type: 'post' | 'comment', authorId: string } | null>(null);

  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});

  const fetchData = async () => {
    if (!id) return;
    try {
      const { data: postData, error: postErr } = await supabase.from("posts").select("*").eq("id", id).single();
      if (postErr) throw postErr;

      const { data: authorData } = await supabase.from("users").select("*").eq("id", postData.user_id).single();
      const { data: likesData } = await supabase.from("post_likes").select("*").eq("post_id", id);
      
      let wagersMap: Record<string, any> = {};
      if (postData.wager_id) {
         const { data: wagerData } = await supabase.from("wagers").select("*").eq("id", postData.wager_id).single();
         if (wagerData && (wagerData.fixture_id || wagerData.fixtureId)) {
            const { data: fixtureData } = await supabase.from("fixtures").select("*").eq("id", wagerData.fixture_id || wagerData.fixtureId).single();
            wagersMap[postData.wager_id] = { ...wagerData, homeScore: fixtureData?.homeScore ?? fixtureData?.home_score, awayScore: fixtureData?.awayScore ?? fixtureData?.away_score, homeTeam: fixtureData?.homeTeam ?? fixtureData?.home_team, awayTeam: fixtureData?.awayTeam ?? fixtureData?.away_team };
         }
      }

      setPost({ ...postData, users: authorData, post_likes: likesData || [], wager: postData.wager_id ? wagersMap[postData.wager_id] : null });

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

  const handleMainPostPress = () => {
    const now = Date.now();
    const lastTap = lastTapRef.current['main'] || 0;
    if (now - lastTap < 300) {
      handleLikeMainPost();
    }
    lastTapRef.current['main'] = now;
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

  const handleCommentPress = (commentId: string, hasLiked: boolean) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[commentId] || 0;
    if (now - lastTap < 300) {
      handleCommentLike(commentId, hasLiked);
    }
    lastTapRef.current[commentId] = now;
  };

  const handleDeleteMainPost = () => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("posts").delete().eq("id", id);
          router.back();
      }}
    ]);
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert("Delete Reply", "Are you sure you want to delete this reply?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await supabase.from("comments").delete().eq("id", commentId);
          setComments(prev => prev.filter(c => c.id !== commentId));
      }}
    ]);
  };

  const openPostFireModal = () => {
    if (!user || !post) return;
    if (post.user_id === user.id) {
      Alert.alert("Nice try!", "You cannot award fire to your own posts.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFireTarget({ id: post.id, type: 'post', authorId: post.user_id });
    setFireAmount("50"); setFireModalOpen(true);
  };

  const openCommentFireModal = (commentId: string, authorId: string) => {
    if (!user) return;
    if (authorId === user.id) {
      Alert.alert("Nice try!", "You cannot award fire to your own replies.");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFireTarget({ id: commentId, type: 'comment', authorId });
    setFireAmount("50"); setFireModalOpen(true);
  };

  const submitFireAward = async () => {
    const amount = parseInt(fireAmount, 10);
    if (isNaN(amount) || amount < 1 || amount > 50) return Alert.alert("Invalid Amount", "Please enter a number between 1 and 50.");
    setFireModalOpen(false);

    try {
      if (fireTarget?.type === 'post') {
        await supabase.rpc('award_fire', { post_id_param: fireTarget.id, giver_id_param: user?.id, author_id_param: fireTarget.authorId, tip_amount: amount });
        setPost((current: any) => ({ ...current, fire_count: (current.fire_count || 0) + 1 }));
      } else if (fireTarget?.type === 'comment') {
        await supabase.rpc('award_comment_fire', { comment_id_param: fireTarget.id, giver_id_param: user?.id, author_id_param: fireTarget.authorId, tip_amount: amount });
        setComments(current => current.map(c => c.id === fireTarget.id ? { ...c, fire_count: (c.fire_count || 0) + 1 } : c));
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const handleProfileClick = async (userId: string) => {
    if (!userId) return;
    try {
      const { data } = await supabase.from("users").select("*").eq("id", userId).single();
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
  const isMyPost = finalUserId === user?.id;

  let mainMatchHeader: React.ReactNode = null;
  if (post.wager) {
      const homeTeam = post.wager.homeTeam || post.wager.home_team;
      const awayTeam = post.wager.awayTeam || post.wager.away_team;
      
      if (homeTeam && awayTeam) {
          const homeScore = post.wager.homeScore ?? post.wager.home_score;
          const awayScore = post.wager.awayScore ?? post.wager.away_score;
          let scoreText = "";
          if (homeScore !== undefined && awayScore !== undefined && homeScore !== null && awayScore !== null) {
              scoreText = ` (${homeScore} - ${awayScore})`;
          }
          const hUrl = getCrestUrl(homeTeam);
          const hFlag = getFlag(homeTeam);
          const aUrl = getCrestUrl(awayTeam);
          const aFlag = getFlag(awayTeam);
          
          // SAFE WRAPPER: Replaces Text so Image is completely safely nested 
          mainMatchHeader = (
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              {hUrl ? <Image source={{ uri: hUrl }} style={{ width: 14, height: 14, marginRight: 4 }} /> : <Text style={{ fontSize: 13, color: colors.foreground }}>{hFlag || "⚽"} </Text>}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground }}>{homeTeam} vs </Text>
              {aUrl ? <Image source={{ uri: aUrl }} style={{ width: 14, height: 14, marginRight: 4, marginLeft: 2 }} /> : <Text style={{ fontSize: 13, color: colors.foreground }}>{aFlag || "⚽"} </Text>}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground }}>{awayTeam}{scoreText}</Text>
            </View>
          );
      }
  }

  const predStr = post.wager?.prediction || post.wager?.choice || "";
  const isDraw = predStr === "Draw";
  const pUrl = getCrestUrl(predStr);
  const pFlag = getFlag(predStr);

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
              <Pressable style={styles.mainPost} onPress={() => handleMainPostPress()}>
                <Pressable style={styles.authorRow} onPress={() => handleProfileClick(finalUserId)}>
                  <Avatar color={finalColor} username={finalUsername} size={48} />
                  <View style={styles.authorText}>
                    <Text style={[styles.displayName, { color: colors.foreground }]}>{finalDisplayName}</Text>
                    <Text style={[styles.username, { color: colors.mutedForeground }]}>@{finalUsername}</Text>
                  </View>
                </Pressable>
                
                <Text style={[styles.mainContent, { color: colors.foreground }]}>{post.content}</Text>
                <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>{formatTimeAgo(post.created_at)}</Text>
                
                {post.wager && (
                  <View style={[styles.miniReceipt, { borderColor: colors.border, backgroundColor: post.wager.status === "won" ? "rgba(52, 199, 89, 0.05)" : post.wager.status === "lost" ? "rgba(255, 59, 48, 0.05)" : colors.background }]}>
                    <View style={styles.miniReceiptTop}>
                      <Text style={[styles.miniReceiptLabel, { color: colors.mutedForeground }]}>Prediction</Text>
                      <View style={[styles.miniReceiptBadge, { backgroundColor: post.wager.status === "won" ? colors.primary : post.wager.status === "lost" ? colors.secondary : colors.border }]}>
                        <Text style={[styles.miniReceiptStatus, { color: post.wager.status === "won" ? colors.primaryForeground : colors.foreground }]}>{post.wager.status === "won" ? "WON" : post.wager.status === "lost" ? "LOST" : "PENDING"}</Text>
                      </View>
                    </View>
                    {mainMatchHeader}
                    
                    {/* SAFE WRAPPER: Replaces Text so Image is completely safely nested */}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      {isDraw ? (
                        <Text style={[styles.miniReceiptPred, { color: colors.foreground, marginBottom: 0 }]}>⚖️ Draw</Text>
                      ) : (
                        <>
                          {pUrl ? <Image source={{ uri: pUrl }} style={{ width: 16, height: 16, marginRight: 6 }} /> : <Text style={{ fontSize: 16, marginRight: 4, color: colors.foreground }}>{pFlag || "⚽"}</Text>}
                          <Text style={[styles.miniReceiptPred, { color: colors.foreground, marginBottom: 0 }]}>{predStr}</Text>
                        </>
                      )}
                    </View>

                    <Text style={[styles.miniReceiptPts, { color: colors.mutedForeground }]}>{post.wager.status === "won" ? `+${post.wager.payout} pts` : post.wager.status === "lost" ? `-${post.wager.amount} pts` : `${post.wager.amount} pts at stake`}</Text>
                  </View>
                )}

                <View style={[styles.statsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                  <Text style={[styles.statText, { color: colors.foreground }]}><Text style={styles.statBold}>{likesCount}</Text> Likes</Text>
                  <Text style={[styles.statText, { color: colors.foreground, marginLeft: 16 }]}><Text style={styles.statBold}>{commentsCount}</Text> Comments</Text>
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.commentActionGroup} onPress={() => handleLikeMainPost()}>
                    <FontAwesome5 name="heart" size={22} color={hasLikedMain ? "#FF3B30" : colors.foreground} solid={hasLikedMain} />
                  </Pressable>
                  <View style={styles.commentActionGroup}>
                    <Feather name="message-circle" size={22} color={colors.foreground} />
                  </View>
                  <Pressable style={styles.commentActionGroup} onPress={() => openPostFireModal()}>
                    <FontAwesome5 name="fire" size={22} color={isLit ? "#FF6B00" : colors.foreground} solid={isLit} />
                  </Pressable>

                  {isMyPost && (
                    <Pressable style={[styles.commentActionGroup, { marginLeft: 'auto' }]} onPress={() => handleDeleteMainPost()}>
                      <Feather name="trash-2" size={20} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              </Pressable>

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
            const commentLit = (item.fire_count || 0) > 0;
            const isMyComment = finalCommentUserId === user?.id;

            return (
              <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => handleProfileClick(finalCommentUserId)}>
                  <Avatar color={finalCommentColor} username={finalCommentUsername} size={36} />
                </Pressable>
                
                <Pressable style={styles.commentContent} onPress={() => handleCommentPress(item.id, hasLikedComment)}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentDisplayName, { color: colors.foreground }]}>{finalCommentName}</Text>
                    <Text style={[styles.commentUsername, { color: colors.mutedForeground }]}>@{finalCommentUsername} · {formatTimeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{item.content}</Text>
                  
                  <View style={styles.commentActions}>
                    <Pressable style={styles.commentActionGroup} onPress={() => handleCommentLike(item.id, hasLikedComment)}>
                      <FontAwesome5 name="heart" size={14} color={hasLikedComment ? "#FF3B30" : colors.mutedForeground} solid={hasLikedComment} />
                      <Text style={[styles.commentActionText, { color: hasLikedComment ? "#FF3B30" : colors.mutedForeground }]}>{commentLikesCount}</Text>
                    </Pressable>
                    
                    <Pressable style={styles.commentActionGroup} onPress={() => openCommentFireModal(item.id, item.user_id)}>
                      <FontAwesome5 name="fire" size={14} color={commentLit ? "#FF6B00" : colors.mutedForeground} solid={commentLit} />
                      {commentLit && <Text style={[styles.commentActionText, { color: "#FF6B00" }]}>{item.fire_count}</Text>}
                    </Pressable>

                    {isMyComment && (
                      <Pressable style={[styles.commentActionGroup, { marginLeft: 'auto' }]} onPress={() => handleDeleteComment(item.id)}>
                        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    )}
                  </View>
                </Pressable>
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
  commentText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20, marginBottom: 10 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  commentActionGroup: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
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
  miniReceipt: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  miniReceiptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  miniReceiptLabel: { fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  miniReceiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniReceiptStatus: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  miniReceiptPred: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 0 },
  miniReceiptPts: { fontFamily: "Inter_400Regular", fontSize: 13 },
});