import type { NextFunction, Request, Response } from "express";

// Checks who is calling, using the Supabase sign-in token the app sends ("Authorization: Bearer <token>").
// The token is verified by asking Supabase who it belongs to. These are the same public project address and
// public key the app ships with; override them with SUPABASE_URL / SUPABASE_ANON_KEY if they change.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vpmpsgpjkitjoyumgvir.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbXBzZ3Bqa2l0am95dW1ndmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjM2OTcsImV4cCI6MjA5NjY5OTY5N30.9F0Su7mw8QEAgbURqM1xgPapQS6OBp-89ijnMR_B0KU";

const CACHE_MS = 60_000;
const cache = new Map<string, { userId: string; until: number }>();

async function userIdForToken(token: string): Promise<string | null> {
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.userId;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: string };
    if (!body.id) return null;
    if (cache.size > 5000) cache.clear();
    cache.set(token, { userId: body.id, until: Date.now() + CACHE_MS });
    return body.id;
  } catch {
    return null;
  }
}

/** Rejects requests without a valid sign-in. Puts the caller's id in res.locals.userId. */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const userId = token ? await userIdForToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  res.locals.userId = userId;
  next();
}

/**
 * Only lets the signed-in user act as themselves. `pick` reads the account id the request wants to change
 * (from the URL or the body). Use after requireUser.
 */
export function asSelf(pick: (req: Request) => unknown) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const target = pick(req);
    if (typeof target !== "string" || target !== res.locals.userId) {
      res.status(403).json({ error: "You can only do that for your own account." });
      return;
    }
    next();
  };
}
