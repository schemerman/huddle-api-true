---
name: HUDDLE callouts & economy
description: Non-obvious decisions for Direct Callouts, heater streak, and performance titles in the HUDDLE mobile app.
---

## Callout target identity uses a "me" sentinel
Seeded incoming callouts store `callout.targetUserId: "me"` instead of the real current-user id, because the device user's id is not known at seed-definition time. `isTarget` matches when `targetUserId === user.id || targetUserId === "me"`.

**Why:** HUDDLE is a single-user-per-device MVP (AsyncStorage, no multi-account). "me" reliably means "this device's user" without threading the id into seed data.
**How to apply:** If the app ever becomes multi-user on one device or syncs to a backend, replace the "me" sentinel with a resolved canonical userId everywhere `isTarget` is computed (DataContext.respondToCallout and PostCard).

## respondToCallout guards
Accept path must: be pending-only, target-only, and check sufficient funds before the single `updatePoints(-amount)` deduction. Pot is locked at `amount * 2` (display total for winner-takes-all). The author side is never deducted because the author is typically a seed user, not the device user.

**Why:** earlier version deducted inside a `posts.map` side-effect with no funds/target guard, risking double-deduction and pot exceeding deducted funds.

## Streak & performance titles are mock data
`currentStreak` is seeded to 3 on profile completion (like `winRate: 62`); there is no prediction-resolution flow that increments/resets it. Heater ring shows at `currentStreak >= 3`. Performance title thresholds: Benchwarmer <30, Coin Flipper 30–65, The Oracle >65 (see utils/performance.ts).

**Why:** predictions/wagers don't resolve in the MVP, so real streaks can't be computed — values are presentational only.

## Crimson is the only non-monochrome token
`colors.light.crimson` (#DC2626) is reserved strictly for the BANKRUPT label/tag/border. Pre-existing reds (#E8533A liked-heart, #FF3B30 sign-out) predate this rule and were left as-is; do not add new colored UI.
