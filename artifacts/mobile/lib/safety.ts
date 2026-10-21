import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { USER_COLUMNS } from "@/lib/users";

// Report / block / delete account. The database rules are in
// supabase/sql/2026-10-21-profiles-and-safety.sql.

export type ReportTarget = "user" | "post" | "comment" | "message";
export const REPORT_REASONS = ["Spam", "Bullying or harassment", "Hate or abuse", "Sexual content", "Something else"] as const;

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error("Please log in again.");
  return id;
}

export async function reportContent(targetType: ReportTarget, targetId: string, reason: string): Promise<void> {
  const reporter = await myId();
  const { error } = await supabase.from("reports").insert({ reporter_id: reporter, target_type: targetType, target_id: targetId, reason });
  if (error) throw new Error(error.message);
}

// ---- Blocked users: one shared list, so blocking someone updates every screen at once. ----
let blockedIds = new Set<string>();
let loadedFor: string | null = null;
const listeners = new Set<(ids: Set<string>) => void>();
const publish = () => listeners.forEach((fn) => fn(new Set(blockedIds)));

export async function loadBlockedIds(force = false): Promise<Set<string>> {
  const me = await myId();
  if (!force && loadedFor === me) return blockedIds;
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", me);
  if (error) throw new Error(error.message);
  blockedIds = new Set((data ?? []).map((row: any) => row.blocked_id));
  loadedFor = me;
  publish();
  return blockedIds;
}

export async function blockUser(userId: string): Promise<void> {
  const me = await myId();
  const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: userId });
  if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
  blockedIds.add(userId);
  publish();
}

export async function unblockUser(userId: string): Promise<void> {
  const me = await myId();
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", userId);
  if (error) throw new Error(error.message);
  blockedIds.delete(userId);
  publish();
}

/** The ids of people you've blocked; updates live when you block or unblock someone. */
export function useBlockedIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set(blockedIds));
  useEffect(() => {
    listeners.add(setIds);
    loadBlockedIds().catch(() => {});
    return () => { listeners.delete(setIds); };
  }, []);
  return ids;
}

export async function loadBlockedUsers(): Promise<any[]> {
  const ids = [...(await loadBlockedIds(true))];
  if (ids.length === 0) return [];
  const { data } = await supabase.from("users").select(USER_COLUMNS).in("id", ids);
  return data ?? [];
}

/** Shown when the database refuses a DM because of a block or the under-18 rule. */
export function isMessagingRefused(message: string | undefined): boolean {
  return /row-level security/i.test(message ?? "");
}
export const MESSAGING_REFUSED_TEXT =
  "You can't message this person. They may have blocked you, or they only accept messages from people they follow.";

// ---- Delete account ----
async function removeFolder(prefix: string) {
  const { data } = await supabase.storage.from("uploads").list(prefix, { limit: 1000 });
  const paths = (data ?? []).filter((f: any) => f.id).map((f: any) => `${prefix}/${f.name}`);
  if (paths.length) await supabase.storage.from("uploads").remove(paths);
}

/** Deletes your photos, then everything else (profile, picks, posts, messages…), then signs you out. */
export async function deleteMyAccount(): Promise<void> {
  const me = await myId();
  for (const folder of ["posts", "chat"]) {
    try {
      await removeFolder(`${me}/${folder}`);
    } catch {
      // Photos are best-effort; the account itself is still deleted below.
    }
  }
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  blockedIds = new Set();
  loadedFor = null;
  await supabase.auth.signOut();
}
