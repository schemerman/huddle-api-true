# HUDDLE

A minimalist social sports prediction platform for Gen Z university students — blending Twitter-style banter, gamified binary predictions, and private group leagues.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (backend ready, mobile uses AsyncStorage for MVP)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/` — screens (Expo Router file-based routing)
  - `app/(auth)/` — login, register, complete-profile
  - `app/(tabs)/` — home timeline, leagues, leaderboard, profile
  - `app/league/[id].tsx` — private league chat room
  - `components/` — PostCard, ChatBubble, LeaderboardRow, Avatar, HuddleButton
  - `context/AuthContext.tsx` — auth state + AsyncStorage persistence
  - `context/DataContext.tsx` — posts, leagues, messages, leaderboard state
  - `constants/colors.ts` — strict light mode monochrome design tokens
- `artifacts/api-server/` — Express backend
- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture decisions

- Mobile-first MVP uses AsyncStorage for all persistence (no backend calls yet) — backend is wired and ready for integration.
- Strict light mode only — pure white bg, black text, 1px grey borders, pill buttons. No gradients, no colored blocks.
- Design system: avatar initials with per-user colors provide the only color on screen (editorial monochrome aesthetic).
- Inverted FlatList for chat (league rooms) — handles auto-scroll and keyboard correctly.
- DataContext seeds mock posts/leagues/messages on first load from AsyncStorage.

## Product

- Auth & onboarding: email/password login, custom @username, DOB, avatar color picker
- Home social timeline: Twitter-style posts with embedded binary prediction polls (grey pill buttons → votes reveal %)
- Private Leagues: create/join groups with invite codes; each league has a real-time-style chat room
- Leaderboard: global rankings + per-league rankings toggled by tab
- Profile: win rate % + points display, account settings, sign out

## User preferences

- Strict monochrome light mode — pure white background only
- Clinical, editorial, modern aesthetic (not a sportsbook)
- No emoji in UI, no heavy colored blocks
- Pill-shaped buttons: solid black/white or light grey/black

## Gotchas

- Use AsyncStorage, not uuid package — uuid requires crypto.getRandomValues() which crashes on iOS/Android
- Do NOT add react-native-maps to plugins in app.json (crashes)
- Mobile workflow: restart only when dependencies change, not for code edits (HMR handles it)
- `userInterfaceStyle: "light"` enforced in app.json (strict light mode)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile patterns, routing, and keyboard handling
