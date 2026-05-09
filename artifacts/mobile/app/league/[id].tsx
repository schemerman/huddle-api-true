import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Modal,
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
import { Avatar } from "@/components/Avatar";
import { PublicProfileModal, type PublicProfileUser } from "@/components/PublicProfileModal";
import type { Message } from "@/context/DataContext";

const MOCK_USERS: Record<string, { username: string; displayName: string; avatarColor: string }> = {
  u1: { username: "kingsleyobi", displayName: "Kingsley Obi", avatarColor: "#E8533A" },
  u2: { username: "sarahchidi", displayName: "Sarah Chidi", avatarColor: "#3A7DE8" },
  u3: { username: "tomaszwiecek", displayName: "Tomasz Wiecek", avatarColor: "#9B3AE8" },
  u4: { username: "ameliavoss", displayName: "Amelia Voss", avatarColor: "#3AE86A" },
  u5: { username: "joshadeleke", displayName: "Josh Adeleke", avatarColor: "#E8C83A" },
  u6: { username: "mikeokoro", displayName: "Mike Okoro", avatarColor: "#E83A8C" },
  u7: { username: "priyapatel", displayName: "Priya Patel", avatarColor: "#3AE8D4" },
};

export default function LeagueChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { leagues, messages, sendMessage, getUserStats } = useData();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [profileUser, setProfileUser] = useState<PublicProfileUser | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const league = leagues.find((l) => l.id === id);
  const chatMessages = messages[id ?? ""] ?? [];
  const reversed = [...chatMessages].reverse();

  const handleSend = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id ?? "", text.trim());
    setText("");
  };

  const openProfile = (userId: string, username: string, displayName: string, avatarColor: string) => {
    const stats = getUserStats(userId);
    setProfileUser({
      userId,
      username,
      displayName,
      avatarColor,
      points: stats?.points ?? 0,
      winRate: stats?.winRate ?? 0,
    });
  };

  if (!league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Huddle not found.</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const members = league.memberIds.map((uid) => {
    if (uid === user?.id || uid === "me") {
      return {
        id: uid,
        username: user?.username || "me",
        displayName: user?.displayName || "You",
        avatarColor: user?.avatarColor || "#000000",
        isYou: true,
      };
    }
    const mock = MOCK_USERS[uid];
    return mock
      ? { id: uid, ...mock, isYou: false }
      : { id: uid, username: uid, displayName: uid, avatarColor: "#8A8A8A", isYou: false };
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.leagueName, { color: colors.foreground }]}>{league.name}</Text>
          <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
            {league.memberIds.length} members
          </Text>
        </View>
        <Pressable
          style={styles.headerBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMembers(true);
          }}
        >
          <Feather name="users" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <FlatList<Message>
        ref={flatListRef}
        data={reversed}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          const isOwn = item.userId === user?.id || item.userId === "me";
          const nextItem = reversed[index + 1];
          const showAvatar = !nextItem || nextItem.userId !== item.userId;
          const handleChatAvatarPress = () => {
            if (isOwn) return;
            openProfile(item.userId, item.username, item.username, item.avatarColor);
          };
          return (
            <View style={{ marginBottom: showAvatar ? 12 : 2, marginTop: 2 }}>
              <ChatBubble
                text={item.text}
                username={item.username}
                avatarColor={item.avatarColor}
                isOwn={isOwn}
                time={item.createdAt}
                showAvatar={showAvatar && !isOwn}
                onAvatarPress={!isOwn ? handleChatAvatarPress : undefined}
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
          placeholder="Message the huddle..."
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
          <Feather
            name="send"
            size={16}
            color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>

      {/* Members Modal */}
      <Modal
        visible={showMembers}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMembers(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMembers(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Members</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {league.name} · {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
            {members.map((m, i) => (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  { borderBottomColor: colors.border },
                  i === members.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Avatar
                  color={m.avatarColor}
                  username={m.username}
                  size={40}
                  onPress={
                    !m.isYou
                      ? () => {
                          setShowMembers(false);
                          setTimeout(() => openProfile(m.id, m.username, m.displayName, m.avatarColor), 300);
                        }
                      : undefined
                  }
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {m.displayName}
                    {m.isYou ? " (you)" : ""}
                  </Text>
                  <Text style={[styles.memberHandle, { color: colors.mutedForeground }]}>
                    @{m.username}
                  </Text>
                </View>
                {m.id === league.ownerId && (
                  <View style={[styles.ownerBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.ownerText, { color: colors.foreground }]}>Admin</Text>
                  </View>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => setShowMembers(false)}
              style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.closeBtnText, { color: colors.foreground }]}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <PublicProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 4,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  modalSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  memberHandle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  ownerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ownerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  closeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
