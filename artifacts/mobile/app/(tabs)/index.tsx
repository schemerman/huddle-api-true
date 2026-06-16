import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, FlatList, Text, StyleSheet, RefreshControl, Platform } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar"; 

export default function HomeIndex() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // Safely redirect if logged out, otherwise show the feed
  return session ? <HomeFeed /> : <Redirect href="/(auth)/login" />;
}

function HomeFeed() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      // Grabbing all posts from the database
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setPosts(data);
      }
    } catch (error) {
      console.error("Feed error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  // THE FIX: Defensive rendering to prevent white screen crashes
  const renderPost = ({ item }: { item: any }) => {
    const safeUsername = item?.user?.username || item?.username || "Anonymous";
    const safeContent = item?.content || item?.text || "No content available.";
    const safeAvatarColor = item?.user?.avatarColor || item?.avatarColor || colors.primary;

    return (
      <View style={[styles.postCard, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.postHeader}>
          <Avatar color={safeAvatarColor} username={safeUsername} size={40} highlight={false} />
          <View style={styles.headerText}>
            <Text style={[styles.username, { color: colors.foreground }]}>@{safeUsername}</Text>
          </View>
        </View>
        <Text style={[styles.content, { color: colors.foreground }]}>{safeContent}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Home</Text>
      </View>

      {isLoading ? (
         <View style={styles.center}>
           <ActivityIndicator size="large" color={colors.primary} />
         </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          renderItem={renderPost}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <View style={styles.centerEmpty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No posts yet. The feed is looking a little quiet!
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, paddingHorizontal: 20 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5 },
  postCard: { padding: 16, borderBottomWidth: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerText: { marginLeft: 12, justifyContent: "center" },
  username: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  content: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16, textAlign: "center", lineHeight: 24 }
});