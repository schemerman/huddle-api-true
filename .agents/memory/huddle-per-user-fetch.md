---
name: Per-user fetched data must clear on user change
description: Screen-focus fetch effects keyed on user id must also reset their state when the id changes, or a prior account's data flashes after logout/account switch.
---

# Per-user fetched data must clear on user change

In HUDDLE, screens that fetch per-user data on focus (e.g. Profile Wagers via
`GET /users/{id}/wagers`) hold that data in local component state. A focus-fetch
keyed on `user?.id` is not enough by itself: when the user logs out (`id` → null)
or a different account logs in, the previous user's rows stay in state until the
next fetch resolves — and on logout no fetch runs at all.

**Rule:** pair the focus-fetch with a separate `useEffect(() => { reset state }, [user?.id])`
that clears the fetched list + its "loaded" flag whenever the id changes.

**Why:** the product requirement is that this data belongs strictly to the
currently logged-in user; a cross-user flash violates that and leaks one user's
activity to another on shared devices.

**How to apply:** use a dedicated id-keyed effect to clear, NOT a clear at the top
of the focus callback — clearing on every focus would blank-then-repopulate the
list each time the tab regains focus (bad UX). The same pattern applies to any
future per-user screens (leagues, messages, leaderboard-by-user).
