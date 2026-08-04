# Majlis Web Player — Design + Implementation Plan

Date: 4 Aug 2026. Status: design locked, implementing.
Scope: PLAYER-ONLY on web. Hosting stays in the app (premium surface). Fixes a live broken funnel: the app's QR already encodes `https://irab.app/majlis?pin=XXXXXX` and that route 404s today.

## 1. Design thesis

Kahoot's phone screen is a dumb controller (colors/shapes only) because content lives on a projector. Majalis is different: the app's players see the full question on their own device, and mixed rooms (app players + web players) must feel identical and fair. So the web player is a full-content player, not a controller — same information, same timing, same scoring as the app.

What we take from Kahoot and the game-show genre:
- Zero-friction join: scan → name → in. No account, no install, no walls. Target under 15 seconds from scan to lobby.
- Anticipation loops: a lobby that fills with live avatars (social proof), a synced ٣-٢-١ countdown, speed-based scoring the player can feel, instant reveal feedback, a between-question top-5, and a podium ceremony.
- One-thumb play: everything answerable with a thumb on a phone held in one hand. Answer zone bottom-anchored, touch targets 56px+.

What we deliberately reject from Kahoot: childish shape-buttons, gradient confetti chaos, music-first pressure. Irab's brand is The Forge: editorial scholarship + tech precision, solid colors, no gradients. The web player must read as "a serious Arabic institute running a lively quiz night", not a toy.

## 2. Experience spec (states, in order)

All Arabic-only in v1 (players are Arabic students; the app player is Arabic-only). RTL. Fonts: Aref Ruqaa for the big moments (countdown numerals, podium), Thmanyah Text for everything else. Light + dark supported from day one (site toggle).

1. ENTRY `/majlis` (+ `?pin=NNNNNN`)
   - With pin param (QR scan): PIN pre-filled and locked-in visually; the only inputs are name + avatar. Headline: «انضم إلى المجلس».
   - Without pin: 6-box segmented PIN input (numeric keyboard, auto-advance, paste-aware), then name + avatar.
   - Name: 2–20 chars (mirrors server), inline validation. Avatar: grid of the same 64 Bottts avatars the app bundles, seeded random preselection.
   - Join errors mapped to friendly Arabic: ROOM_NOT_FOUND / ROOM_STARTED / ROOM_LOCKED / ROOM_FULL / NAME_LENGTH / NAME_REJECTED / RATE_LIMITED.
   - Below the fold: one quiet line «تريد استضافة مجلسك الخاص؟ حمّل التطبيق» (app cross-sell, not a nag).
2. LOBBY — «أنت في المجلس، انتظر بدء المضيف». Your name+avatar hero'd; other players appear live as chips (participants stream, joinedAt order); player count. Subtle idle animation, no music. Reassure: «ابقَ على هذه الصفحة».
3. COUNTDOWN — full-screen ٣ ٢ ١ in Aref Ruqaa, derived from `questionStartAt` minus `.info/serverTimeOffset` (never local clock). Optional tick SFX (muted by default; toggle persists).
4. QUESTION — header: question index/count + circular time ring (from `questionEndAt`); body: `questionText` (+ `sourceText` when present); answer zone by `type`:
   - `mcq`: stacked full-width option cards (not 2×2 — Arabic options are long).
   - `true_false`: two half-width cards صحيح / خطأ.
   - `tap_word`: the sentence as large tappable word chips.
   - `arrange_irab`: tap-to-order (tap chips in sequence, numbered as picked, tap again to undo) — no drag-and-drop on mobile web.
   - `fix_error`: two steps in one screen: tap the wrong word in the sentence, then its correction from the options; submit enabled when both chosen.
   - Payload shapes on submit (write-once RTDB): int / bool / int[] / {w,o}.
5. LOCKED-IN — after submit: «تم استلام إجابتك» + who-is-still-answering shimmer; no answer changes (server rule enforces write-once).
6. REVEAL (`answerReview`) — poll `reveal/{index}`: correct/wrong verdict, +points earned (300 base + speed bonus visualized as a small «سرعة» chip), correct answer + explanation, answer distribution bars, your rank delta.
7. LEADERBOARD — top-5 podium-style list + «ترتيبك: N من M» always visible even outside top-5.
8. PODIUM (`finished`) — top-3 ceremony (staggered reveal, gold/silver/bronze, restrained motion honoring prefers-reduced-motion), your final rank + score card, then the conversion moment: «أعجبك المجلس؟ حمّل تطبيق إعراب واستضف مجلسك الخاص» + store badges.
9. TERMINAL / RESILIENCE — room closed (meta null → janitor), connection banner (auto-reconnect; uid-anchored rejoin keeps score; localStorage remembers roomId+pin 90 min for one-tap «عد إلى المجلس» on reload).

## 3. Technical shape

- `src/pages/majlis.astro` — static shell + SEO (LearningResource/HowTo schema, «انضم إلى مجلس إعراب» landing copy for the no-pin visit), loads the island.
- `src/components/MajlisPlay.astro` — the island (pattern: PracticePlay.astro). All Firebase inside the island.
- Firebase: existing `src/lib/firebase.ts` app + `getDatabase(app, 'https://arabic-grammar-app-43de9-default-rtdb.firebaseio.com')` (databaseURL passed explicitly; config object lacks it) + `getFunctions(app, 'us-central1')` → `httpsCallable('majalisJoinRoom')` + `signInAnonymously` when no user (a signed-in web account also works — same uid identity as app).
- App Check: warm mode server-side; ship without it, revisit when enforcement flips (noted in app repo, functions/middleware/auth.ts).
- Game loop per protocol contract (docs source: irabapp agent extraction 2026-08-04): listen `rooms/{id}/meta` + `participants`; on `questionLive` one-shot read `publicQ/{index}`; submit write-once `answers/{index}/{uid} = {answer, ts: serverTimestamp}` inside [startAt, endAt]; on `answerReview` poll `reveal/{index}` (20×200ms); `leaderboard` and `finished` from meta.status. Players never touch Firestore.
- Avatars: reuse the app's Bottts set — copy the 64 SVGs to `public/majlis-avatars/` (avatar field is int 0-63; must map to the SAME artwork as the app so projector and phones agree).

## 4. Sequencing

1. Skeleton: page + island + join flow + lobby (real join, real participants stream).
2. Game loop: meta-driven state machine, countdown sync, mcq + true_false, locked-in, reveal, leaderboard, podium.
3. Remaining types: tap_word, arrange_irab, fix_error.
4. Resilience + polish: reconnect banner, rejoin memory, SFX toggle, reduced-motion, dark mode pass, cross-sell moments.
5. QA vs app: two-device live room (app host + web player), all 5 types, disconnect/rejoin, room-full/locked/started errors, janitor-closed room.

## 5. Measurement

Web-side GA4 (site already has analytics): majlis_web_join_attempt / joined / join_error{code}, answer_submitted{type}, game_completed, app_cta_click. Compare web joiner→finisher retention vs app.
