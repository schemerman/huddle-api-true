import { AntDesign, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";

const USERNAME_TO_USERID: Record<string, string> = {
  kingsleyobi: "u1",
  sarahchidi: "u2",
  tomaszwiecek: "u3",
  ameliavoss: "u4",
  joshadeleke: "u5",
  mikeokoro: "u6",
  priyapatel: "u7",
};

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  text: string;
  createdAt: string;
  likes: number;
}

const MOCK_COMMENTS: Record<string, Comment[]> = {
  p1: [
    { id: "c1", userId: "u2", username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8", text: "City are genuinely unstoppable this season tbh", createdAt: "1h", likes: 14 },
    { id: "c2", userId: "u3", username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8", text: "Arsenal have been shaky away from home all season. City by 2", createdAt: "1h", likes: 9 },
    { id: "c3", userId: "u5", username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A", text: "Never count out Arsenal. Classic 1-0 Arteta grind", createdAt: "45m", likes: 6 },
  ],
  p2: [
    { id: "c4", userId: "u1", username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A", text: "Curry has scored 35+ in 6 of the last 8 vs Lakers. It's basically guaranteed lol", createdAt: "3h", likes: 21 },
    { id: "c5", userId: "u4", username: "ameliavoss", displayName: "Amelia Voss", avatarColor: "#3AE86A", text: "LeBron always shows up in these games though let's not sleep", createdAt: "3h", likes: 7 },
    { id: "c6", userId: "u3", username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8", text: "Warriors at home? Easy money on Curry", createdAt: "2h", likes: 12 },
    { id: "c7", userId: "u5", username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A", text: "Both teams are actually mid rn, unpopular opinion", createdAt: "2h", likes: 3 },
  ],
  p3: [
    { id: "c8", userId: "u2", username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8", text: "Mbappé is playing more as a team player at Real. The numbers will come", createdAt: "5h", likes: 18 },
    { id: "c9", userId: "u1", username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A", text: "Atletico's defence will absolutely shut him down, it's their thing", createdAt: "5h", likes: 11 },
  ],
  p4: [
    { id: "c10", userId: "u3", username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8", text: "England away? I can't see it happening, Australia are too good at home", createdAt: "7h", likes: 8 },
    { id: "c11", userId: "u4", username: "ameliavoss", displayName: "Amelia Voss", avatarColor: "#3AE86A", text: "England need to start performing in these big games", createdAt: "7h", likes: 5 },
    { id: "c12", userId: "u5", username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A", text: "Always England moment", createdAt: "6h", likes: 22 },
  ],
};

const FALLBACK_COMMENTS: Comment[] = [
  { id: "fb1", userId: "u2", username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8", text: "This is the take of the week honestly", createdAt: "30m", likes: 8 },
  { id: "fb2", userId: "u1", username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A", text: "Hard disagree but respect the conviction", createdAt: "25m", likes: 4 },
  { id: "fb3", userId: "u5", username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A", text: "Someone had to say it", createdAt: "20m", likes: 12 },
];

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

interface CommentRowProps {
  comment: Comment;
  onProfilePress: (userId: string, username: string, displayName: string, avatarColor: string) => void;
}

function CommentRow({ comment, onProfilePress }: CommentRowProps) {
  const colors = useColors();
  const openProfile = () => onProfilePress(comment.userId, comment.username, comment.displayName, comment.avatarColor);

  return (
    <View style={[styles.commentRow, { borderBottomColor: colors.border }]}>
      <Avatar
        color={comment.avatarColor}
        username={comment.username}
        size={34}
        onPress={openProfile}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Pressable onPress={openProfile}>
            <Text style={[styles.commentName, { color: colors.foreground }]}>{comment.displayName}</Text>
          </Pressable>
          <Text style={[styles.commentHandle, { color: colors.mutedForeground }]}>
            @{comment.username} · {comment.createdAt}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: colors.foreground }]}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Feather name="heart" size={14} color={colors.mutedForeground} />
          <Text style={[styles.commentLikes, { color: colors.mutedForeground }]}>{comment.likes}</Text>
        </View>
      </View>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { posts, likePost, getUserStats } = useData();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const post = posts.find((p) => p.id === id);
  const seedComments = MOCK_COMMENTS[id ?? ""] ?? FALLBACK_COMMENTS;

  const [comments, setComments] = useState<Comment[]>(seedComments);
  const [inputText, setInputText] = useState("");
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const openProfile = (userId: string, username: string, displayName: string, avatarColor: string) => {
    if (userId === user?.id) return;
    const stats = getUserStats(userId) ?? getUserStats(USERNAME_TO_USERID[username] ?? "") ?? { points: 0, winRate: 0 };
    setProfileUser({ userId, username, displayName, avatarColor, points: stats.points, winRate: stats.winRate });
  };

  const openPostProfile = () => {
    if (!post) return;
    openProfile(post.userId, post.username, post.displayName, post.avatarColor);
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newComment: Comment = {
      id: generateId(),
      userId: user.id,
      username: user.username || "me",
      displayName: user.displayName || "You",
      avatarColor: user.avatarColor,
      text,
      createdAt: "now",
      likes: 0,
    };
    setComments((prev) => [...prev, newComment]);
    setInputText("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { paddingTop: topPad + 8 }]}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, padding: 24 }}>Post not found.</Text>
      </View>
    );
  }

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    likePost(post.id);
  };

  const HEADER_HEIGHT = topPad + 56;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? HEADER_HEIGHT : 0}
    >
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList<Comment>
        ref={listRef}
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={[styles.originalPost, { borderBottomColor: colors.border }]}>
              <View style={styles.postHeader}>
                <Avatar
                  color={post.avatarColor}
                  username={post.username}
                  size={44}
                  onPress={openPostProfile}
                />
                <Pressable style={styles.postHeaderText} onPress={openPostProfile}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{post.displayName}</Text>
                  <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{post.username}</Text>
                </Pressable>
              </View>
              <Text style={[styles.postText, { color: colors.foreground }]}>{post.text}</Text>
              <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.createdAt} ago</Text>
              <View style={[styles.postStats, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                <Text style={[styles.statText, { color: colors.foreground }]}>
                  <Text style={styles.statNum}>{post.likes}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}> Likes</Text>
                </Text>
                <Text style={[styles.statText, { color: colors.foreground }]}>
                  <Text style={styles.statNum}>{comments.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}> Comments</Text>
                </Text>
              </View>
              <View style={styles.postActions}>
                <Pressable style={styles.actionBtn} onPress={handleLike}>
                  {post.liked ? (
                    <AntDesign name="heart" size={22} color="#E8533A" />
                  ) : (
                    <Feather name="heart" size={22} color={colors.mutedForeground} />
                  )}
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => inputRef.current?.focus()}>
                  <Feather name="message-circle" size={22} color={colors.mutedForeground} />
                </Pressable>
                <Pressable style={styles.actionBtn}>
                  <Feather name="share" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
            <Text
              style={[
                styles.commentsLabel,
                { color: colors.mutedForeground, borderBottomColor: colors.border },
              ]}
            >
              COMMENTS
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CommentRow comment={item} onProfilePress={openProfile} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
      />

      {/* Fixed comment input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 12 : 8),
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.secondary,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="done"
          blurOnSubmit
          multiline={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={({ pressed }) => [{ opacity: pressed || !inputText.trim() ? 0.5 : 1 }]}
        >
          <Text
            style={[
              styles.sendBtn,
              { color: inputText.trim() ? colors.foreground : colors.mutedForeground },
            ]}
          >
            Send
          </Text>
        </Pressable>
      </View>

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  originalPost: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0, borderBottomWidth: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  postHeaderText: { flex: 1 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  postText: { fontFamily: "Inter_400Regular", fontSize: 17, lineHeight: 25, marginBottom: 12 },
  postTime: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 14 },
  postStats: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 14 },
  statLabel: { fontFamily: "Inter_400Regular" },
  postActions: { flexDirection: "row", paddingVertical: 10, gap: 28 },
  actionBtn: { padding: 4 },
  commentsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  commentContent: { flex: 1 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  commentName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  commentHandle: { fontFamily: "Inter_400Regular", fontSize: 12 },
  commentText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 6 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentLikes: { fontFamily: "Inter_400Regular", fontSize: 12 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    borderWidth: 1,
  },
  sendBtn: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingHorizontal: 4,
  },
});
