import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import React, { useRef, useState } from "react";
import {
  FlatList,
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
import { ChatBubble } from "@/components/ChatBubble";
import type { Message } from "@/context/DataContext";

export default function LeagueChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, messages, sendMessage } = useData();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList<Message>>(null);

  const league = leagues.find((l) => l.id === id);
  const chatMessages = messages[id ?? ""] ?? [];

  const handleSend = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id ?? "", text.trim());
    setText("");
  };

  const reversed = [...chatMessages].reverse();

  if (!league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>League not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.leagueName, { color: colors.foreground }]}>{league.name}</Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {league.memberIds.length} members
          </Text>
        </View>
        <Pressable style={styles.backBtn}>
          <Feather name="users" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <FlatList<Message>
        ref={flatListRef}
        data={reversed}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          const isOwn = item.userId === user?.id;
          const nextItem = reversed[index + 1];
          const showAvatar = !nextItem || nextItem.userId !== item.userId;
          return (
            <View style={{ marginBottom: showAvatar ? 12 : 2, marginTop: 2 }}>
              <ChatBubble
                text={item.text}
                username={item.username}
                avatarColor={item.avatarColor}
                isOwn={isOwn}
                time={item.createdAt}
                showAvatar={showAvatar && !isOwn}
              />
            </View>
          );
        }}
        contentContainerStyle={styles.messageList}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground }]}
          placeholder="Message the league..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: text.trim() ? colors.primary : colors.secondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="send" size={16} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </View>
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
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  leagueName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  memberCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  messageList: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
