# Huddle Sports: store listing pack

Everything to copy into App Store Connect and Google Play Console. Answers are based on what the app does today. If a
feature changes (for example, adding ads, analytics or real-money prizes), the answers must change too.

## Basics

| Field | Value |
|---|---|
| App name (both stores) | Huddle Sports |
| Name under the icon | HUDDLE |
| App ID (bundle ID / package) | `com.huddleapp.huddle` |
| Category | Sports |
| Price | Free. No in-app purchases, no ads |
| Privacy policy | https://huddle-mobile.vercel.app/privacy |
| Terms of use | https://huddle-mobile.vercel.app/terms |
| Account deletion page | https://huddle-mobile.vercel.app/delete-account |
| Support email | huddleappsupport@gmail.com |
| Website / marketing URL | https://huddle-mobile.vercel.app |

## Text

**Apple subtitle** (30 characters max): `Predict matches with friends`

**Google short description** (80 max):
`Predict football results, compete with friends and climb the leaderboards.`

**Apple promotional text** (170 max):
`Call the score before kick-off. Make your picks on Premier League and Champions League games, start a huddle with your mates and see who really knows football.`

**Full description** (both stores):

```
Huddle is the free football prediction game you play with your friends.

PICK EVERY MATCH
Choose the winner of Premier League and Champions League games before kick-off. Back your call with points: the bolder the pick, the bigger the multiplier.

START A HUDDLE
Create a private huddle, share the code and compete with your mates on your own leaderboard. Chat, share your picks and celebrate the wins.

CLIMB THE RANKS
Every finished pick counts towards your win rate. Go from Rookie to All Star, Champion, GOAT and, if you're good enough, Oracle.

SHARE YOUR RECEIPTS
Called it? Share a prediction receipt to your feed, your huddle, a DM, or straight to WhatsApp, Instagram and Snapchat.

Points are just for fun. They have no cash value and can't be bought, sold or withdrawn. Huddle is free, with no ads and nothing to buy.

For sports fans aged 13 and over.
```

**Keywords** (Apple, 100 max, commas, no spaces):
`football,soccer,premier league,champions league,predictions,picks,friends,leaderboard,score,fans`

## Screenshots to take

Use a phone running the test build, signed in with a demo account that has a few picks and a huddle.
Apple needs at least a 6.7" or 6.9" iPhone set; Google needs at least 2 phone screenshots.

1. Predict: upcoming fixtures with the Your Rank and Your Points boxes.
2. The Place a Pick sheet with a team chosen.
3. A huddle leaderboard.
4. A won prediction receipt.
5. Home feed with posts.
6. How ranks work.

## Review notes (Apple "App Review Information")

Create a demo account in the app first, for example `review@<your domain or gmail>`, and give it a couple of picks.

```
Demo account: <email> / <password>

Huddle is a free football prediction game. Users pick match winners using in-app points that have no cash value
and cannot be purchased, sold or withdrawn. There are no real-money prizes or payments.
Posts, replies and profiles can be reported (and users blocked) from their ... menu; chat messages by long-pressing them.
Accounts can be deleted in Profile > Settings > Delete account.
```

## Apple: age rating questionnaire

Answer truthfully; these match the app today.

| Question | Answer |
|---|---|
| Simulated gambling | **Frequent/Intense**. Staking points on match results is the core loop. |
| Contests | Yes. Leaderboards and rankings. |
| User-generated content / Messaging and chat | Yes. Posts, replies, photos, DMs and huddle chat. |
| Unrestricted web access | No |
| Violence, sexual content, profanity, drugs, horror | None (from the app itself) |
| Real-money gambling | No |

Expect **18+** because of frequent simulated gambling. That's normal for prediction games. The app's own minimum
age stays 13 on the web and in the terms, but the App Store rating will be higher.

## Apple: App Privacy ("nutrition label")

Data collected, all **linked to the user**, **not used for tracking**, used for **App Functionality**:

| Data type | What it is in Huddle |
|---|---|
| Contact info: email address | Sign-in |
| User content: photos | Photos added to posts, replies and chats |
| User content: other user content | Posts, replies, messages, picks |
| Identifiers: user ID | Account ID |
| Other data: date of birth | Age check (13+) |
| Usage data: product interaction | Picks, likes, follows (needed for the game) |

Not collected: location, contacts, browsing history, health, financial info, diagnostics or crash data
(there's no crash reporting yet), advertising data. No third-party tracking.

## Google Play: Data safety form

- Data is **encrypted in transit**: yes (HTTPS everywhere).
- Users can **request deletion**: yes, in the app and at https://huddle-mobile.vercel.app/delete-account.
- **Shared** with third parties: no. Supabase and Render are service providers acting for Huddle, which doesn't count as sharing.
- Collected (required for the app, not optional): email address, name and username, date of birth, user ID,
  photos, messages (in-app), other user-generated content (posts, replies, picks), app interactions.
- Purpose for all: **App functionality** and **Account management**. Not advertising or analytics.

## Google Play: content rating (IARC) and target audience

- Category: "Game" isn't right. Choose **Social / Communication or "All other app types"**, and answer:
  - Simulated gambling: **Yes**.
  - Users can interact or exchange content: **Yes**.
  - Shares location: **No**. Digital purchases: **No**.
- Target audience: **13-15, 16-17 and 18+**. Not under 13.
- Ads: **No**.

## Google Play: first release path (new personal developer accounts)

1. Upload the first production build to **Internal testing** (the `eas submit` default here) and try it yourself.
2. Create a **Closed test** and add at least **12 testers** (their Gmail addresses). They must stay opted in for
   **14 days in a row**.
3. Then apply for **Production access** in the Play Console and publish.

## Known risks for review

- **Apple guideline 1.2 (user-generated content)** expects a way to filter objectionable content before it's posted,
  as well as report and block (which Huddle has). Huddle has no word filter yet. **Add a basic filter for posts,
  replies, messages and usernames before submitting to Apple.**
- **Photos on account deletion:** uploaded photos stay in storage until the user emails support. An automatic removal
  is a planned improvement.
- **Moderation:** reports go to the `reports` table in Supabase. Check them at least daily. Apple and Google both
  expect objectionable content to be acted on within 24 hours.
