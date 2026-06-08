---
name: HUDDLE terminology sweeps
description: How to safely rename user-facing vocabulary (Wager/Bet/Odds etc.) without breaking the build
---

# Terminology sweeps are UI-text-only

When asked to rename product vocabulary (e.g. Wager→Pick, Bet→Predict, Odds→Multiplier), change ONLY user-visible strings: JSX `<Text>` content, labels, placeholders, button titles, headings, error messages.

**Why:** "Wager" and "Odds" are pervasive as CODE IDENTIFIERS wired into contracts that codegen/build depend on — renaming them breaks things:
- `@workspace/api-client-react` (generated) exports `placeWager`, `listWagers`, and the `Wager` type.
- OpenAPI spec (`lib/api-spec/openapi.yaml`) and DB schema (`lib/db/src/schema/wagers.ts`, `users.previousWagers`) define the wager domain.
- Fixture fields `oddsHome/oddsDraw/oddsAway` → local `oddsA/oddsD/oddsB`; style keys like `oddsTag`, `wagersSection`, `wagerRow`.

**How to apply:** grep `rg -nw "Wager|Wagers|Odds"` then keep identifiers/types/API names/style keys/generated/schema untouched. The Receipt Modal (`ReceiptModal.tsx`) already uses prediction language. Lowercase `bet` matches are substrings ("space-between") — use word-boundary search.
