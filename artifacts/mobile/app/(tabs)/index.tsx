import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/context/DataContext";

const MAX_POST = 280;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { posts, addPost, likePost, voteOnPrediction, getUserStats } = useData();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const openProfile = (post: Post) => {
    if (post.userId === user?.id) return;
    const stats = getUserStats(post.userId);
    setProfileUser({
      userId: post.userId,
      username: post.username,
      displayName: post.displayName,
      avatarColor: post.avatarColor,
      points: stats?.points ?? 0,
      winRate: stats?.winRate ?? 0,
    });
  };

  const closeCompose = () => {
    setComposeOpen(false);
    setDraft("");
  };

  const handlePost = () => {
    if (!draft.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addPost(draft);
    closeCompose();
  };

  const initial = (user?.displayName || user?.username || "Y").charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.wordmark, { color: colors.foreground }]}>HUDDLE</Text>
        <Feather name="bell" size={22} color={colors.foreground} />
      </View>

      <FlatList<Post>
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Pressable
            onPress={() => setComposeOpen(true)}
            style={({ pressed }) => [
              styles.composer,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.composerAvatar, { backgroundColor: user?.avatarColor ?? colors.foreground }]}>
              <Text style={styles.composerAvatarText}>{initial}</Text>
            </View>
            <Text style={[styles.composerPlaceholder, { color: colors.mutedForeground }]}>
              Share a take...
            </Text>
            <View style={[styles.composerPill, { borderColor: colors.border }]}>
              <Text style={[styles.composerPillText, { color: colors.foreground }]}>Post</Text>
            </View>
          </Pressable>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => likePost(item.id)}
            onVote={(choice) => voteOnPrediction(item.id, choice)}
            onPress={() => router.push(`/post/${item.id}`)}
            onAvatarPress={() => openProfile(item)}
            onUsernamePress={() => openProfile(item)}
            currentUserId={user?.id}
            hidePrediction
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
      />

      <Modal visible={composeOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalDismiss} onPress={closeCompose} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHead}>
              <Pressable onPress={closeCompose}>
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New post</Text>
              <Pressable
                onPress={handlePost}
                disabled={!draft.trim()}
                style={[
                  styles.postBtn,
                  {
                    backgroundColor: draft.trim() ? colors.primary : colors.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.postBtnText,
                    { color: draft.trim() ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  Post
                </Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.composerAvatar, { backgroundColor: user?.avatarColor ?? colors.foreground }]}>
                <Text style={styles.composerAvatarText}>{initial}</Text>
              </View>
              <TextInput
                style={[styles.modalInput, { color: colors.foreground }]}
                placeholder="What's the take?"
                placeholderTextColor={colors.mutedForeground}
                value={draft}
                onChangeText={(t) => setDraft(t.slice(0, MAX_POST))}
                multiline
                autoFocus
                maxLength={MAX_POST}
              />
            </View>
            <Text style={[styles.counter, { color: colors.mutedForeground }]}>
              {draft.length}/{MAX_POST}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PublicProfileModal
        user={profileUser}
        onClose={() => setProfileUser(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  wordmark: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  composerAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  composerPlaceholder: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  composerPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  composerPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalCancel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  modalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  postBtn: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  postBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  modalBody: {
    flexDirection: "row",
    gap: 12,
  },
  modalInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 6,
  },
  counter: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
});
