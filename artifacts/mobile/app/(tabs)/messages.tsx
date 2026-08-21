import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/lib/supabase";

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  
  const [network, setNetwork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      
      const fetchNetwork = async () => {
        // Fetch people you are following
        const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        
        if (followsData && followsData.length > 0) {
          const userIds = followsData.map((f: any) => f.following_id);
          const { data: usersData } = await supabase.from('users').select('*').in('id', userIds);
          if (usersData) setNetwork(usersData);
        } else {
          setNetwork([]);
        }
        setLoading(false);
      };
      
      fetchNetwork();
    }, [user?.id])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <Feather name="edit" size={20} color={colors.foreground} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.mutedForeground} />
        </View>
      ) : (
        <FlatList
          data={network}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => {
            const safeColor = item.avatar_color || colors.primary;
            const safeName = item.display_name || item.displayName || item.username;
            
            return (
              <Pressable 
                onPress={() => router.push(`/dm/${item.id}` as any)}
                style={({pressed}) => [styles.userRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Avatar color={safeColor} username={item.username} size={48} />
                <View style={styles.userInfo}>
                  <Text style={[styles.displayName, { color: colors.foreground }]}>{safeName}</Text>
                  <Text style={[styles.handle, { color: colors.mutedForeground }]}>@{item.username}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.border} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Follow a player on the leaderboards to message them.
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
  topBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12
  },
  userInfo: { flex: 1 },
  displayName: { fontFamily: "Inter_600SemiBold", fontSize: 16, letterSpacing: -0.2 },
  handle: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});