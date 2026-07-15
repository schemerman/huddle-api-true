import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, Alert, TextInput, Modal, KeyboardAvoidingView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const isWeb = Platform.OS === "web";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768; 
  const topPad = isWeb ? 20 : insets.top;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [composeOpen, setComposeOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [attachedWagerId, setAttachedWagerId] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      // Stripped down to the absolute bare minimum to bypass relationship errors
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Supabase Error", error.message);
        throw error;
      }

      setPosts(postsData || []);
      Alert.alert("Diagnostic", `Found ${postsData?.length || 0} posts in the database.`);

    } catch (error) {
      console.log("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  const submitPost = async () => {
    const finalContent = newPostText.trim() || (attachedWagerId ? "Check out my prediction! 👀" : "");
    if (!finalContent || !user) return;
    
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: finalContent,
        wager_id: attachedWagerId 
      });
      if (error) throw error;
      
      setNewPostText("");
      setAttachedWagerId(null);
      setComposeOpen(false);
      fetchPosts(); 
    } catch (error: any) {
      Alert.alert("Insert Error", error.message || "Could not create post.");
    }
  };

  const renderPost = useCallback(({ item }: { item: any }) => {
    // Failsafe for missing user data during this test
    const author = item.users || { username: "player", display_name: "Player" };

    return (
      <View style={[styles.postContainer, { borderBottomColor: colors.border }]}>
        <Avatar color={colors.primary} username={author.username} size={44} />
        <View style={styles.postContent}>
          <View style={styles.postHeader}>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{author.display_name}</Text>
            <Text style={[styles.username, { color: colors.mutedForeground }]}>@{author.username}</Text>
          </View>
          <Text style={[styles.postText, { color: colors.foreground }]}>{item.content}</Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Home</Text>
        
        {/* MANUAL REFRESH BUTTON */}
        <Pressable 
          onPress={fetchPosts}
          style={{ backgroundColor: colors.foreground, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
        >
          <Text style={{ color: colors.background, fontFamily: "Inter_600SemiBold" }}>Force Refresh</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            isDesktop ? (
              <View style={[styles.composeContainer, { borderBottomColor: colors.border }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.composeInput, { color: colors.foreground }]}
                  placeholder="What's your latest prediction?"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  value={newPostText}
                  onChangeText={setNewPostText}
                />
                <View style={styles.composeFooter}>
                  <Pressable 
                    style={[styles.postBtn, { backgroundColor: newPostText.trim() ? colors.foreground : colors.mutedForeground }]} 
                    onPress={submitPost} 
                    disabled={!newPostText.trim()}
                  >
                    <Text style={[styles.postBtnText, { color: colors.background }]}>Post</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!loading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts found in database.</Text> : null}
        />
      </KeyboardAvoidingView>

      {!isDesktop && (
        <Pressable style={[styles.fab, { backgroundColor: colors.foreground }]} onPress={() => setComposeOpen(true)}>
          <Feather name="plus" size={26} color={colors.background} />
        </Pressable>
      )}

      {!isDesktop && (
        <Modal visible={composeOpen} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlayBottom}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setComposeOpen(false)}>
                  <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.postBtn, { backgroundColor: newPostText.trim() ? colors.foreground : colors.mutedForeground }]} 
                  onPress={submitPost} 
                  disabled={!newPostText.trim()}
                >
                  <Text style={[styles.postBtnText, { color: colors.background }]}>Post</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.composeInput, { color: colors.foreground }]}
                placeholder="What's your latest prediction?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoFocus
                value={newPostText}
                onChangeText={setNewPostText}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%" },
  topBar: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)", flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, letterSpacing: -0.5 },
  composeContainer: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  composeFooter: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  emptyText: { textAlign: "center", marginTop: 60, fontFamily: "Inter_400Regular", fontSize: 16 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 8, zIndex: 99999 },
  postContainer: { flexDirection: "row", padding: 16, borderBottomWidth: 1, gap: 12 },
  postContent: { flex: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  displayName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  username: { fontFamily: "Inter_400Regular", fontSize: 14 },
  postText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 12 },
  modalOverlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { height: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 16 },
  postBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  postBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  composeInput: { fontFamily: "Inter_400Regular", fontSize: 18, minHeight: 120, textAlignVertical: "top" },
});