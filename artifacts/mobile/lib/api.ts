// The Huddle API on Render. The generated API client uses it too (see app/_layout.tsx).
import { supabase } from "@/lib/supabase";

export const API_BASE_URL = "https://huddle-api-true.onrender.com";

/** The signed-in user's token, so the API knows who is asking (it refuses requests made "as" someone else). */
export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export type SettlementResult = { checked: number; settled: number; skipped?: boolean; failed?: boolean };

/**
 * Ask the server to settle matches that have finished. Wakes the server if it is
 * asleep, so it can take up to a minute. Returns null if the server can't be reached.
 */
export async function requestSettlement(): Promise<SettlementResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settlement/run`, { method: "POST", headers: await authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as SettlementResult;
  } catch {
    return null;
  }
}
