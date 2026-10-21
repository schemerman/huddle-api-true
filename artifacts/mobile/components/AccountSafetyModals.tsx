import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Avatar } from "@/components/Avatar";
import { showError } from "@/lib/alerts";
import { deleteMyAccount, loadBlockedUsers, unblockUser } from "@/lib/safety";

/** Profile → Settings → Blocked users. */
export function BlockedUsersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [users, setUsers] = useState<any[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    setUsers(null);
    loadBlockedUsers().then(setUsers).catch(() => setUsers([]));
  }, [visible]);

  const unblock = async (id: string) => {
    try {
      await unblockUser(id);
      setUsers((list) => (list ?? []).filter((u) => u.id !== id));
    } catch (e: any) {
      showError("Couldn't unblock", e?.message || "Please try again.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Blocked users</Text>
            <Pressable onPress={onClose} hitSlop={10}><Feather name="x" size={20} color={colors.foreground} /></Pressable>
          </View>
          {users === null ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={colors.mutedForeground as string} />
          ) : (
            <FlatList
              data={users}
              keyExtractor={(u) => u.id}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={<Text style={[styles.body, { color: colors.mutedForeground, textAlign: "center", marginVertical: 20 }]}>You haven't blocked anyone.</Text>}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: colors.border }]}>
                  <Avatar color={item.avatar_color || (colors.primary as string)} username={item.username || "player"} size={36} />
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>@{item.username}</Text>
                  <Pressable onPress={() => unblock(item.id)} style={[styles.smallBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.smallBtnText, { color: colors.foreground }]}>Unblock</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Profile → Settings → Delete account. Asks the user to type DELETE first. */
export function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) { setTyped(""); setBusy(false); } }, [visible]);

  const confirm = async () => {
    if (typed.trim().toUpperCase() !== "DELETE" || busy) return;
    setBusy(true);
    try {
      await deleteMyAccount();
      onClose();
      router.replace("/(auth)/login" as any);
    } catch (e: any) {
      showError("Couldn't delete your account", `${e?.message || "Please try again."} You can also email huddleappsupport@gmail.com.`);
      setBusy(false);
    }
  };

  const ready = typed.trim().toUpperCase() === "DELETE";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Delete account</Text>
            <Pressable onPress={onClose} hitSlop={10} disabled={busy}><Feather name="x" size={20} color={colors.foreground} /></Pressable>
          </View>
          <Text style={[styles.body, { color: colors.foreground }]}>
            This permanently deletes your account, points, predictions, posts, comments, likes, follows, messages and photos. It can't be undone.
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 12 }]}>Type DELETE to confirm.</Text>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            onPress={confirm}
            disabled={!ready || busy}
            style={[styles.deleteBtn, { backgroundColor: ready ? "#FF3B30" : colors.secondary }]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.deleteText, { color: ready ? "#FFFFFF" : colors.mutedForeground }]}>Delete my account</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, borderRadius: 18, borderWidth: 1, padding: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  name: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15 },
  smallBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  smallBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 8 },
  deleteBtn: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  deleteText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
