import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/chat";

export type ChatUser = Record<string, any> & { id: string };

export type Conversation = {
  partner: ChatUser;
  lastMessage: ChatMessage;
  unread: boolean;
};

export function userDisplayName(u: Partial<ChatUser> | null | undefined): string {
  return u?.display_name || u?.displayName || u?.username || "Player";
}

// When this device last opened each DM, used for unread dots. Kept per signed-in user.
const lastReadKey = (me: string) => `dm_last_read_${me}`;

async function getLastRead(me: string): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(lastReadKey(me));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function markRead(me: string, partnerId: string): Promise<void> {
  const map = await getLastRead(me);
  map[partnerId] = new Date().toISOString();
  try {
    await AsyncStorage.setItem(lastReadKey(me), JSON.stringify(map));
  } catch {
    // Unread dots are a convenience; ignore storage failures.
  }
}

/** Everyone you've exchanged DMs with, newest conversation first, with the latest message. */
export async function loadConversations(me: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("huddle_id", null)
    .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const latest = new Map<string, ChatMessage>();
  for (const message of (data ?? []) as ChatMessage[]) {
    const partnerId = message.sender_id === me ? message.recipient_id : message.sender_id;
    if (partnerId && !latest.has(partnerId)) latest.set(partnerId, message);
  }
  if (latest.size === 0) return [];

  const { data: users } = await supabase.from("users").select("*").in("id", [...latest.keys()]);
  const lastRead = await getLastRead(me);
  return [...latest.entries()].map(([partnerId, message]) => {
    const readAt = lastRead[partnerId];
    return {
      partner: (users?.find((u: any) => u.id === partnerId) as ChatUser) ?? { id: partnerId },
      lastMessage: message,
      unread: message.sender_id !== me && (!readAt || new Date(message.created_at) > new Date(readAt)),
    };
  });
}

export async function loadFollowing(me: string): Promise<ChatUser[]> {
  const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", me);
  const ids = (follows ?? []).map((f: any) => f.following_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data: users } = await supabase.from("users").select("*").in("id", ids);
  return (users ?? []) as ChatUser[];
}

export async function searchUsers(query: string, me: string): Promise<ChatUser[]> {
  // Keep letters, numbers, spaces and . _ ' - only; anything else could break the PostgREST filter syntax.
  const q = query.trim().replace(/[^\p{L}\p{N} ._'-]/gu, "");
  if (q.length < 2) return [];
  const { data } = await supabase
    .from("users")
    .select("*")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("id", me)
    .limit(15);
  return (data ?? []) as ChatUser[];
}

/** People to offer when starting a DM: recent chats first, then people you follow. */
export async function loadDmContacts(me: string): Promise<ChatUser[]> {
  const [conversations, following] = await Promise.all([
    loadConversations(me).catch(() => [] as Conversation[]),
    loadFollowing(me).catch(() => [] as ChatUser[]),
  ]);
  const seen = new Set<string>();
  const contacts: ChatUser[] = [];
  for (const u of [...conversations.map((c) => c.partner), ...following]) {
    if (!u?.id || u.id === me || seen.has(u.id)) continue;
    seen.add(u.id);
    contacts.push(u);
  }
  return contacts;
}
