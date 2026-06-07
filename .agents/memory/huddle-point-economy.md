---
name: HUDDLE point economy
description: How HUDDLE's wager/point economy is enforced and the constraints to respect when touching it.
---

# Server-authoritative point economy

The point balance is enforced on the server, not the client. All point mutations (wager placement, settlement/payout, daily bonus, bailout) go through transactional endpoints under `/api/users/*` that use `SELECT ... FOR UPDATE` row locks and verify `balance >= amount` at the moment of the transaction. A DB CHECK constraint `users_points_non_negative` (`points >= 0`) is the last line of defense.

**Why:** the original MVP did point math client-side in AsyncStorage, which let balances be edited/forged and go negative. The user explicitly chose "Full migration" to make it tamper-resistant and double-spend-safe.

**How to apply:**
- Do NOT reintroduce client-side point arithmetic. The mobile `AuthContext` must adopt the server-returned user state (`mergeServerUser`) after every mutation; point mutations throw on network failure (no local fallback). Only identity sync (`syncToServer`) falls back to local on failure.
- Bankruptcy rule is duplicated intentionally in `nextBankrupt` (server) to mirror old client rules: bankrupt at `<=0`, clears only when `>500`, sticky in between. Keep both in lockstep if changed.
- joinedGroups / leagues / fixtures / chat are deliberately still local-first AsyncStorage (social/UI state), NOT economy state.

# Known limitation: no auth (IDOR)

Economy routes authorize by path `:id` only and are unauthenticated — the app has no auth system (login ignores the password). Any known user id can mutate that user's bankroll. Adding real auth (bind request to authenticated principal, reject mismatched `:id`) is the recommended follow-up before production. Flagged to the user; out of scope for the migration task.
