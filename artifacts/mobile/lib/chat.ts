import { Alert, Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// A row of the Supabase `messages` table, plus client-only delivery state.
// DMs set `recipient_id`; group chats set `huddle_id` (the league id).
// `image_url` holds either a photo URL or, for shared predictions, a wager id.
export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id?: string | null;
  huddle_id?: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  users?: Record<string, any> | null;
  status?: "sending" | "failed";
};

type NewMessage = {
  sender_id: string;
  content: string | null;
  image_url: string | null;
  recipient_id?: string;
  huddle_id?: string;
};

export const DEFAULT_PREDICTION_TEXT = "Check out my prediction! 👀";

export async function insertMessage(row: NewMessage) {
  const { data, error } = await supabase.from("messages").insert(row).select().single();
  return { data: (data as ChatMessage | null) ?? null, error };
}

// Alert.alert does nothing on react-native-web, so fall back to the browser dialog there.
export function showError(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function makeTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendUnique(list: ChatMessage[], msg: ChatMessage) {
  return list.some((m) => m.id === msg.id) ? list : [...list, msg];
}

// Swap an optimistic message for the saved row. If realtime already delivered the
// saved row, just drop the optimistic copy so the message never shows twice.
export function confirmMessage(list: ChatMessage[], tempId: string, saved: ChatMessage) {
  if (list.some((m) => m.id === saved.id)) return list.filter((m) => m.id !== tempId);
  return list.map((m) => (m.id === tempId ? { ...saved, users: m.users ?? saved.users } : m));
}

export function setStatus(list: ChatMessage[], id: string, status: ChatMessage["status"]) {
  return list.map((m) => (m.id === id ? { ...m, status } : m));
}

// Keep unsent or failed local messages when the server list is reloaded.
export function mergeWithLocal(server: ChatMessage[], local: ChatMessage[]) {
  const ids = new Set(server.map((m) => m.id));
  return [...server, ...local.filter((m) => m.status && !ids.has(m.id))];
}

export function getAttachment(msg: ChatMessage): { photoUrl: string | null; wagerId: string | null } {
  const value = msg.image_url;
  if (!value) return { photoUrl: null, wagerId: null };
  return value.startsWith("http") ? { photoUrl: value, wagerId: null } : { photoUrl: null, wagerId: value };
}
