import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/context/DataContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { posts, likePost, voteOnPrediction, getUserStats } = useData();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.wordmark, { color: colors.foreground }]}>HUDDLE</Text>
        <Feather name="bell" size={22} color={colors.foreground} />
      </View>

      <FlatList<Post>
        data={posts}
        keyExtractor={(item) => item.id}
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
});
