# Majalis Host Parity — Verified Contracts (extracted 2026-08-04, adversarially verified)

Corrections/omissions from verification are in the companion verdicts section at the end and OVERRIDE the contract text where they conflict.

═══════════════════════════════════════════
# Majalis HOST CREATION FLOW: Web Parity Contract

Source repo: `/Users/mansoor/Flutter Projects/irabapp`. All paths below are relative to it unless absolute.

---

## 1. Firestore: `majalis_drafts/{uid}/drafts/{draftId}`

Security: owner-only read/write, direct client writes allowed (`firestore.rules:361-363`).

### 1.1 Draft document (`lib/features/majalis/models/majalis_models.dart:566-572`, write site `lib/features/majalis/providers/majalis_create_provider.dart:99-127`)

| Field | Type | Notes |
|---|---|---|
| `title` | string | Auto-derived, NOT user-entered: first question's `sourceText` (trimmed) if non-empty, else its `questionText`; truncated to 60 chars (`majalis_create_provider.dart:107-112`) |
| `questions` | array<map> | Question objects (below). **Array order IS play order**; reorder mutates the array (`majalis_create_provider.dart:90-95`) |
| `createdAt` | Timestamp | Client-side `Timestamp.fromDate(DateTime.now())`, NOT serverTimestamp (`majalis_models.dart:569`). On update the field is removed from the payload so the original survives (`majalis_create_provider.dart:123-125`) |
| `updatedAt` | Timestamp | Client-side now on every save (`majalis_models.dart:570`) |
| `hasAiQuestions` | bool | `questions.any(q => q.aiGenerated)` (`majalis_create_provider.dart:37`, `116`) |

There is **no status field** on drafts. Doc ID: Firestore auto-ID from `ref.add(data)` on first save; subsequent saves use `set(..., SetOptions(merge: true))` on the same doc (`majalis_create_provider.dart:119-126`).

### 1.2 Question object wire shape (`majalis_models.dart:181-195`)

Every key is always present (nulls written explicitly):

```json
{
  "id": "mq_1720500000000000",          // manual: "mq_" + microsecondsSinceEpoch (editor:308); AI: crypto.randomUUID() (worker:2699)
  "type": "mcq|true_false|tap_word|fix_error|arrange_irab",   // wire keys, majalis_models.dart:38-57
  "questionText": "string (required)",
  "sourceText": "string|null",          // only for tap_word/fix_error/arrange_irab; forced null for mcq/tf (editor:300-305)
  "options": ["string"],                 // [] for true_false and tap_word
  "correctAnswer": {                     // ALL four keys always present (majalis_models.dart:91-96)
    "optionIndex": 0,                    // int|null
    "boolValue": true,                   // bool|null
    "wordIndex": 2,                      // int|null
    "arrangement": [2, 0, 1]             // int[]|null
  },
  "explanation": "string|null",          // null when blank (editor:322-324)
  "grammarTopic": "string|null",         // AI metadata; manual questions: null
  "difficulty": "beginner|intermediate|advanced|null",  // AI metadata
  "timeLimitSeconds": 30,                // int, default 30
  "sourceReference": "string|null",      // Quranic ref; cleared on edit if sourceText changed (editor:332-334)
  "aiGenerated": false,                  // bool; provenance must survive edits (editor:335)
  "saveToBank": false                    // bool
}
```

### 1.3 Per-type `correctAnswer` semantics (`majalis_models.dart:74-77`) and options semantics

| Type | Answer | Options |
|---|---|---|
| `mcq` | `optionIndex` into `options` | 2 to 4 non-empty strings, order as typed (NOT shuffled client-side); selected index re-derived after filtering blank rows so an interior blank cannot shift it (`majalis_manual_editor_screen.dart:251-269`) |
| `true_false` | `boolValue` | `[]` |
| `tap_word` | `wordIndex` into whitespace tokens of `sourceText` (`sourceWords` = split on `\s+`, empties dropped, `majalis_models.dart:150-153`) | `[]`. RETIRED from authoring + AI; must still render/play old data (`majalis_models.dart:42-44`) |
| `fix_error` | `wordIndex` = flawed word in `sourceText` tokens; `optionIndex` = correct form inside `options` | `[correctForm + 1-2 decoys]`, **shuffled once at build time** so stored order leaks nothing (`editor:273-278`) |
| `arrange_irab` | `arrangement` = list of indices into `options` giving the correct sequence (`arrangement[k]` = index in options of the k-th correct fragment) | Fragments **shuffled once at build with a guaranteed non-identity permutation**; `arrangement = [perm.indexOf(k) for k]` (`editor:283-295`) |

`sourceText` for `arrange_irab` is the target word/phrase being parsed (label "الكلمة المستهدفة", `editor:702-703`).

---

## 2. Firestore: `majalis_bank/{uid}/questions/{questionId}`

Security: owner-only read/write, direct client writes (`firestore.rules:366-368`).

- **Document shape**: exactly the question wire shape of section 1.2 (`q.toMap()`); **doc ID = `q.id`** (`majalis_create_provider.dart:129-138`).
- **Write path**: during every `saveDraft()`, each question with `saveToBank == true` is upserted fire-and-forget with `set(merge: true)` (`majalis_create_provider.dart:131-138`). There is no separate "save to bank" call.
- **Read/reuse in editor** ("من البنك" sheet, `majalis_manual_editor_screen.dart:396-507`): query `.limit(100)` with no ordering (`:400-405`); on pick, a **NEW question object** is added to the draft with a fresh `mq_<micros>` id, copying only `type, questionText, sourceText, options, correctAnswer, explanation, timeLimitSeconds`; `saveToBank`, `aiGenerated`, `grammarTopic`, `difficulty`, `sourceReference` are dropped/reset to defaults (`:480-489`).
- **Bank management** (sessions screen "مجالسي"): list `.limit(100)` (`majalis_sessions_screen.dart:146-157`), delete doc by `q.id` with optimistic UI (`:193-208`).

---

## 3. Draft lifecycle

### 3.1 Calls (all DIRECT Firestore writes via client SDK, no functions)

| Operation | Where | Details |
|---|---|---|
| Create | `saveDraft()` first call | `add(draft.toMap())`, keeps returned id (`majalis_create_provider.dart:119-121`) |
| Update | `saveDraft()` later calls | remove `createdAt`, `set(merge:true)` (`:123-126`); refuses when `questions.isEmpty` (`:101`) |
| Load/resume | `loadDraft(id)` single `get()` (`:49-70`); resume path opens the REVIEW screen, not the editor (`majalis_sessions_screen.dart:159-174`) |
| List | `orderBy('updatedAt', descending: true).limit(30)` (`majalis_sessions_screen.dart:106-117`) |
| Delete | direct `doc.delete()` with optimistic removal (`majalis_sessions_screen.dart:176-191`) |

**No autosave.** Saves happen at exactly two moments: (a) manual flow "continue to review" (`majalis_manual_editor_screen.dart:533`), (b) immediately before launch on the review screen (`majalis_review_screen.dart:43`). Drafts never consume quota (`majalis_models.dart:548-549`, note copy `lib/translations/ar.dart:1625`).

### 3.2 Client-side validation (`majalis_manual_editor_screen.dart:192-236`)

- All types: `questionText` non-empty.
- `mcq`: >= 2 non-empty options AND the selected correct row must be non-empty.
- `true_false`: verdict chosen (`_tfVerdict != null`).
- `tap_word`: sentence >= 2 words; `wordIndex` chosen and in range.
- `fix_error`: sentence >= 2 words; flawed word chosen; correct form non-empty AND different from the flawed word; >= 1 decoy; {correct + decoys} all distinct.
- `arrange_irab`: `sourceText` non-empty; >= 2 non-empty fragments; fragments distinct.

### 3.3 Editor field bounds

- MCQ options: 2 initial rows, "add option" up to **4** (`editor:875-887`).
- Arrange fragments: 3 initial fields, removable down to **2**, addable up to **6** (`editor:1136-1166`).
- Fix decoys: exactly 2 input fields, >= 1 required (`editor:98-99, 131-135`).
- Time limit: stepper **5 to 120 s in steps of 5**, default 30 (`editor:744-750`). Server re-clamps to 5..120 at question start (`functions/src/majalis/live.ts:197` area: `Math.min(Math.max(q.timeLimitSeconds ?? 30, 5), 120)`).

### 3.4 Free vs premium limits (creation)

| Limit | Free | Premium | Where enforced |
|---|---|---|---|
| Questions per majlis | 10 | 50 | Client `maxQuestions` via `SubscriptionService().isPremium` (`majalis_create_provider.dart:34-35`); server again at launch (`functions/src/majalis/rooms.ts:21-22, 139-145`) |
| Question types | `mcq`, `true_false` only | all | `MajlisQuestionType.isPremiumType` = anything else (`majalis_models.dart:70-71`); editor lock chips (`editor:600-613`); server throws `failed-precondition "PREMIUM_TYPES"` at launch (`rooms.ts:129-137`) |
| Players per room | 20 | 100 | `rooms.ts:19-20, 146` |
| Majalis per rolling 24h | 1 | 10 | consumed at FIRST question start, not creation (`live.ts:17-19, 105-139`) |

Editor type chips offered: `mcq, trueFalse, fixError, arrangeIrab` (tap_word absent, `editor:592-597`). Selecting `fix_error` with an empty question box prefills the fixed instruction `'في الجملة خطأ إعرابي واحد، اضغط الكلمة الخاطئة ثم اختر صوابها'` (`editor:43-44, 617-620`).

---

## 4. Launch end to end

### 4.1 Client sequence (`majalis_review_screen.dart:36-73`)

1. `saveDraft()` (draft must be current; the server reads the DRAFT, not client state).
2. Navigate to host flow with `draftId`; the flow calls callable **`majalisCreateRoom`** with `{draftId: string}` (`lib/features/majalis/services/majalis_room_service.dart:25-36`, `lib/features/majalis/providers/majalis_host_provider.dart:43-76`).
3. Client consumes `{roomId, pin, maxPlayers}` from the response (`quizId` is also returned but unused client-side).
4. Error handling: `FirebaseFunctionsException.message == 'PREMIUM_TYPES'` triggers the upgrade sheet instead of a generic error (`majalis_host_provider.dart:62-68`, `lib/features/majalis/widgets/majalis_host_flow_screen.dart:48-70`).

### 4.2 `majalisCreateRoom` callable (`functions/src/majalis/rooms.ts:99-177`; region `us-central1`, `functions/src/index.ts:64-66`)

- Input: `{ draftId: string }`. Auth required.
- Rate limit: 12 creates / rolling hour, ledger `majalis_ratelimits/{uid}` (admin-only), error `resource-exhausted "RATE_LIMITED"` (`rooms.ts:30, 33-50, 106`).
- Reads the caller's OWN `majalis_drafts/{uid}/drafts/{draftId}`; `not-found` if missing; `failed-precondition "Draft has no questions."` if empty (`:108-122`).
- Premium gates: type gate (`PREMIUM_TYPES`) and count gate (10/50) as in 3.4 (`:124-145`).
- **Snapshot to `majalis_quizzes` (Function-only writes, owner-only reads, `firestore.rules:372-377`)**: `add({ hostUid, draftId, questions: <verbatim draft array WITH answers>, createdAt: serverTimestamp })` (`rooms.ts:149-154`).
- RTDB room: `rooms` push id, 6-digit PIN claimed atomically in `/pins/{pin}` (`:74-85`), then `rooms/{roomId}/meta` set to `{ pin, hostUid, quizId, status: "lobby", joinLocked: false, maxPlayers, qCount, currentQuestionIndex: "0" (STRING deliberately), createdAt: ServerValue.TIMESTAMP }` (`:156-173`).
- Output: `{ roomId, pin, quizId, maxPlayers }` (`:176`).
- Creating a room does NOT consume the daily majlis quota; `consumeQuotaOnce` runs on every `majalisStartQuestion` (idempotent per room via `majalis_quota/{uid}.starts: [{t, r}]` rolling-24h ledger + `meta/quotaConsumedAt` cache) (`live.ts:105-139, 193-196`).

### 4.3 Adjacent callables the host flow uses

- `majalisQuotaStatus` `{}` -> `{used, limit, remaining, nextFreeAtMs|null, isPremium}` (`live.ts:548-575`; client `majalis_room_service.dart:41-62`). Entry screen shows the pill from it (`majalis_entry_screen.dart:103-111`).
- `majalisStartQuestion {roomId, questionIndex}` -> `{startAt, endAt}`; `majalisCloseQuestion {roomId, questionIndex}` -> `{answeredCount}`; `majalisFinish {roomId}` (`majalis_room_service.dart:161-182`). Out of scope here but same region/auth.

---

## 5. Manual editor UX structure

Screen graph (all under `lib/features/majalis/widgets/`):

```
majalis_entry_screen.dart  ("المجالس" tab)
 ├─ create CTA → MajalisManualEditorScreen (fresh; OWNS MajalisCreateProvider)   (entry:249-257)
 └─ "مجالسي" → MajalisSessionsScreen (drafts / history / bank tabs)              (entry:266-273)
      └─ draft "متابعة" → loadDraft → MajalisReviewScreen                        (sessions:159-174)

MajalisManualEditorScreen (majalis_manual_editor_screen.dart)  three modes (:74-83):
 - fresh flow (owns provider; shows Manual/AI segmented control, AI segment pushReplacement → MajalisAiSetupScreen, :572-583)
 - editing (provider + editing question passed from review; CTA = save edit, pops)
 - appending (provider only, pushed from review footer; CTA = add question, pops)

MajalisReviewScreen (majalis_review_screen.dart)
 - expandable question cards: type badge, questionText, sourceText quote, correct-answer preview per type (:512-564), explanation, time chip
 - actions per card: edit (push editor in editing mode), delete, drag reorder (ReorderableListView, provider.reorder)
 - footer "add question" (hybrid path) when not full (:209-248)
 - AI-responsibility notice banner iff provider.hasAiQuestions (:146-190)
 - pinned CTA "launch live" → saveDraft + majalisCreateRoom (see section 4)
```

Editor form order (`editor:585-798`): type chips → inline type explainer (sentence types only) → question text (+ 6 one-tap tap_word templates `editor:24-31`) → source sentence (sentence types only, per-type labels/hints) → per-type answer section → explanation (optional, single line) → duration stepper → save-to-bank switch → "add another" (with count badge) → "from bank" → CTA.

Per-type answer section (`editor:845-1227`):
- **mcq**: option rows with radio-select of the correct one; add option to 4.
- **true_false**: two chips "صحيح/خطأ" setting `boolValue`.
- **tap_word**: sentence rendered as tappable word buttons (purple accent); selection echo line.
- **fix_error**: stage 1 tap the FLAWED word (red accent); stage 2 correct-form field + 2 decoy fields.
- **arrange_irab**: numbered fragment fields typed in CORRECT order, plus a live scrambled preview (deterministic seed; real shuffle only at commit, `editor:1233-1240`).

Commit semantics (`editor:371-388, 509-540`): "continue" commits any non-empty form; empty form with existing questions proceeds; full draft blocks with `majalis_draft_full`; then `saveDraft()` and push review.

---

## 6. AI generation flow (where AI questions enter)

Screen: `MajalisAiSetupScreen` (`lib/features/majalis/widgets/majalis_ai_setup_screen.dart`), owns its own `MajalisCreateProvider`.

### 6.1 Inputs

- Sources (`_SourceKind`, `:42, 547-612`): `topic` (free), `text` (premium, <=1000 chars, min 10), `photo` (premium; camera/gallery → `POST /api/ocr {imageBase64, mimeType}` → `data.text`, `lib/core/services/cloud_api_service.dart:150-163`; requires an actual OCR pass, `:270-273`), `review` (premium; weak points mined client-side from `majalis_reports` where `hostUid == uid`, last 5 reports, questions with `correctRate <= 0.6`, top 6 by wrong pct, `:201-246`; serialized as `focus` notes capped ~580 chars, `:250-259`).
- Topic mode: multi-select from 8 suggested topics + free text, joined with `'، '` (`:119-125`).
- Difficulty: `beginner | intermediate | advanced` (advanced premium-locked, `:912-943`).
- Count: stepper 1..10 (`:966-989`).
- Types: subset of `{mcq, true_false, fix_error}` (fix_error premium-locked; at least one required) (`:1002-1034`). `tap_word`/`arrange_irab` are never AI-generated.
- Quota probe on open: `POST /api/majalis-generate {probe: true}` -> `data.quota {used, limit, remaining}` (`cloud_api_service.dart:293-303`); client pre-gates and offers "generate remaining" when count > remaining (`:296-305, 386-446`).

### 6.2 Worker endpoint `POST /api/majalis-generate` (`cloudflare-workers/src/index.ts:2896-3053`)

- Base URL: primary `https://api.irab.app`, fallback `https://irab-api-v2.mansourhassan783.workers.dev`, staging in debug (`lib/core/constants.dart:24-39`). Headers: `Authorization: Bearer <Firebase ID token>`, optional `X-Firebase-AppCheck` (warm mode) (`cloud_api_service.dart:381-386`).
- Request: `{ topic?, sourceText?, focus?, count: int, types: string[], difficulty: string }` (client sender `cloud_api_service.dart:249-291`; timeout 60 s, no retries).
- Server validation: at least one of topic/sourceText/focus (`:2941-2943`); `sourceText` <= 1000 (`:2944`); topic sliced to 240, focus to 600 (`:2937-2940`); free + (sourceText || focus) -> **403 `majalis_premium_source`** (`:2953-2958`); free + fix_error -> **403 `majalis_premium_type`** (`:2972-2977`); free + advanced -> silently downgraded to intermediate (`:2984`); count clamped to `[1, 10, remaining]` (`MAJALIS_MAX_PER_CALL=10`, `:2474, 2960-2961`).
- Quota: per QUESTION delivered, KV `usage:{uid}:{date}:majalis_ai`, free 10/day, premium 100/day (`:3103-3129` area: `FREE_DAILY_LIMITS.majalis_ai: 10`, `PREMIUM_DAILY_LIMITS.majalis_ai: 100`); exhausted -> **429 `{error:'majalis_ai_quota', used, limit, tier}`** (`:2922-2933`); charged post-generation for the actual delivered count (`:3039`).
- Response: `{ success: true, data: { questions: [<wire question, section 1.2, aiGenerated:true, id:uuid, saveToBank:false, sourceReference:null, grammarTopic:<topic|null>, difficulty>], quota: {used, limit, remaining, tier} } }` (`:3041-3052`). AI time limits: mcq 30 s, true_false 20 s, fix_error 40 s (`:2625, 2650, 2693`).
- Generation internals (web does NOT need to replicate; server-side): per-type Gemini chunks with per-type responseSchema, sub-batches of 4, 2 top-up rounds, hard validators (`majalisToWireQuestion` `:2596-2713`) incl. option dedup/shuffle, fix_error same-word-different-case check, unique-token guard, from-source grounding >= 50% content-word overlap.
- Client error mapping: 429 `majalis_ai_quota` -> `MajalisAiQuotaException(used, limit)`; 403 `majalis_premium_type|majalis_premium_source` -> `PremiumRequiredException` (`cloud_api_service.dart:418-446`).

### 6.3 Where AI questions land

Generated maps are parsed with `MajlisQuestion.fromMap` and **added to the in-memory create provider only** (`majalis_ai_setup_screen.dart:331-333`), then the MANDATORY review screen is pushed (`:357-361`; PRD §5.3, never launched unreviewed). **The Firestore draft is created only when the review screen's launch button runs `saveDraft()`** (`majalis_review_screen.dart:43`) or when the user appends via the manual editor path. Partial delivery (< requested) shows a "generated N" snackbar (`:348-356`). `hasAiQuestions` then rides into the draft doc, and editing an AI question must preserve `aiGenerated`/`grammarTopic`/`difficulty` (`majalis_manual_editor_screen.dart:326-336`).

---

## Cross-cutting parity requirements for the web client

1. Write question maps with ALL keys present including explicit nulls inside `correctAnswer` (the app's `fromMap` tolerates absence, but the Worker and Functions write full shapes; match `majalis_models.dart:181-195` exactly).
2. `currentQuestionIndex` in RTDB meta is a string; never write it as a number (RTDB rules compare it to path keys, `rooms.ts:169-170`).
3. Never write to `majalis_quizzes` or `majalis_reports` from the client (rules deny, `firestore.rules:372-382`).
4. Keep `id` uniqueness scheme: any unique string is safe, but bank doc IDs equal question IDs, so reused bank questions MUST get a fresh id when added to a draft (`editor:480-489`).
5. Shuffle `fix_error` and `arrange_irab` options at authoring time (stored order is later exposed publicly to players unstripped of order).
6. Cloud Functions region: `us-central1` (`functions/src/index.ts:64-66`); callables used by this flow: `majalisCreateRoom`, `majalisQuotaStatus`.
7. Owner copy rule: no em-dashes in any user-facing strings.
═══════════════════════════════════════════
# Majalis HOST Live Console: Web Parity Contract

Backend: Firebase project `arabic-grammar-app-43de9`, RTDB `https://arabic-grammar-app-43de9-default-rtdb.firebaseio.com` (lib/firebase_options.dart:54), all callables v2 `onCall` in region `us-central1` (functions/src/index.ts:64-69). Exported callables: `majalisCreateRoom`, `majalisJoinRoom`, `majalisStartQuestion`, `majalisCloseQuestion`, `majalisFinish`, `majalisQuotaStatus` (functions/src/index.ts:48-55). Auth: every callable requires a signed-in Firebase user (`verifyAuth`, functions/src/middleware/auth.ts:13-29); App Check is WARM mode (logged, not enforced) as of now (auth.ts:20-27). Error protocol: `HttpsError` where the machine code is in the **message** field (e.g. `e.message == 'MAJLIS_QUOTA'`), not the code field; the code field carries the gRPC status (`failed-precondition` etc.).

---

## 1. majalisCreateRoom (functions/src/majalis/rooms.ts:99-177)

**Request** `{ draftId: string }` (rooms.ts:102). Draft is read server-side from Firestore `majalis_drafts/{uid}/drafts/{draftId}` (rooms.ts:108-114); the web must have written the draft there first (owner-only rules, firestore.rules:361-363).

**Response** `{ roomId: string, pin: string, quizId: string, maxPlayers: number }` (rooms.ts:176).

**Preconditions / errors** (in order):
- `invalid-argument` "draftId is required." (rooms.ts:103-105)
- Rate limit: max 12 creates per rolling 60 min per uid, Firestore `majalis_ratelimits/{uid}` transaction; throws `resource-exhausted` / `RATE_LIMITED` (rooms.ts:30, 33-50, 106)
- `not-found` "Draft not found." (rooms.ts:115-117)
- `failed-precondition` "Draft has no questions." (rooms.ts:120-122)
- Premium check `isPremiumUser(uid)` (rooms.ts:124): Firestore `users/{uid}.subscriptionTier == "premium"` first, then live RevenueCat V2 fallback (functions/src/majalis/premium.ts:43-103)
- Free plan + any question type other than `mcq`/`true_false` → `failed-precondition` with message `PREMIUM_TYPES` (rooms.ts:129-137); app maps this to an upgrade sheet (majalis_host_provider.dart:63, majalis_host_flow_screen.dart:54-62)
- Question count cap: free 10 / premium 50 → `failed-precondition` "Plan allows at most N questions per majlis." (rooms.ts:21-22, 139-145)
- Player cap in response: free 20 / premium 100 (rooms.ts:19-20, 146)

**Server side effects** (web never writes these): snapshots questions to Firestore `majalis_quizzes` `{hostUid, draftId, questions, createdAt}` (rooms.ts:149-154; host-only read, function-only write, firestore.rules:372-377); pushes RTDB `rooms/{roomId}` and atomically claims 6-digit `pins/{pin} = roomId` (rooms.ts:73-85, 156-158). Initial meta written (rooms.ts:160-173):

```json
{ "meta": { "pin": "123456", "hostUid": "<uid>", "quizId": "<id>",
  "status": "lobby", "joinLocked": false, "maxPlayers": 20,
  "qCount": 5, "currentQuestionIndex": "0", "createdAt": <server ts> } }
```
Note `currentQuestionIndex` is a **STRING** by design; rules compare it to path keys (rooms.ts:169-170, models mirror this at majalis_models.dart:259-260). Creating a room does NOT consume the daily quota (rooms.ts:96-97).

## 2. Host lobby (lib/features/majalis/widgets/majalis_lobby_screen.dart)

- **PIN**: from the createRoom response, rendered as 6 LTR digit boxes (lobby lines 118-177). Share text includes the PIN (lines 184-192).
- **QR payload**: `https://irab.app/majlis?pin=<PIN>` exactly (majalis_qr.dart:14). Scanners accept any string containing `pin=(\d{6})` or a bare 6-digit run (majalis_qr.dart:17-22). The web join page should accept this URL format.
- **Player list source**: RTDB stream `rooms/{roomId}/participants` sorted ascending by `profile/joinedAt` (majalis_room_service.dart:96-106). Participant node shape (written by majalisJoinRoom, rooms.ts:273-278): `{profile: {displayName, avatar, joinedAt}, presence: {connected}, score: 0, correctCount: 0}`. Parse per majalis_models.dart:302-314 (connected = `presence.connected == true`). Avatar: bundled DiceBear Bottts pack index 0..63; fallback index = FNV-1a(uid) % 64, must match server (functions/src/majalis/avatar.ts:12-32).
- **joinLocked toggle**: direct RTDB write `rooms/{roomId}/meta/joinLocked = !current` (majalis_room_service.dart:156-157, provider majalis_host_provider.dart:92-100). Button label flips between open/close (lobby lines 452-456).
- **Meta stream**: `rooms/{roomId}/meta` (majalis_room_service.dart:89-94); the flow screen switches lobby → console → podium purely on `meta.status` (majalis_host_flow_screen.dart:136-169).
- **Start conditions**: NO minimum player count. Start button calls `provider.startQuestion(0)`; disabled only while `busy` (lobby lines 376-405). On failure with `MAJLIS_QUOTA` it fetches `majalisQuotaStatus` and shows a full quota screen (lines 382-397). Quota status response: `{used, limit, remaining, nextFreeAtMs: number|null, isPremium}` (live.ts:548-574).
- **UX**: play `star_pop` sound + light haptic each time participant count increases (lobby lines 44-51).
- Host presence heartbeat is attached at launch, immediately after createRoom resolves (majalis_host_provider.dart:54-58).

## 3. Question lifecycle (host side)

### majalisStartQuestion (functions/src/majalis/live.ts:150-223)
**Request** `{ roomId: string, questionIndex: number }` (integer >= 0). **Response** `{ startAt: number, endAt: number }` (epoch ms, live.ts:222).

Errors: `invalid-argument`; `not-found ROOM_NOT_FOUND` / `permission-denied NOT_HOST` (requireHost, live.ts:47-57); state machine on `meta.status`: `ROOM_FINISHED` if finished, `QUESTION_IN_PROGRESS` if questionLive, `BAD_STATE` unless lobby/answerReview/leaderboard (live.ts:163-174); `not-found QUESTION_NOT_FOUND` (live.ts:180-183); `failed-precondition QUESTION_ALREADY_PLAYED` if `reveal/{index}` exists (live.ts:186-191); quota `resource-exhausted MAJLIS_QUOTA` on the FIRST question of the room regardless of index, rolling 24h: free 1 / premium 10, ledger Firestore `majalis_quota/{uid}` with `meta/quotaConsumedAt` cache (live.ts:17-20, 104-140, 193-195).

Server writes (live.ts:197-219): `startAt = now + 3000` (countdown), `endAt = startAt + clamp(timeLimitSeconds, 5, 120)*1000`; multi-path update setting `publicQ/{index}` = stripped question `{type, questionText, sourceText|null, options, timeLimitSeconds}`, `meta/status = "questionLive"`, `meta/currentQuestionIndex = String(index)`, `meta/questionStartAt`, `meta/questionEndAt`.

### Host UI during questionLive (majalis_host_game_screen.dart)
After the callable resolves, the host client:
1. Reads `.info/serverTimeOffset` for a clock offset (majalis_host_provider.dart:178, majalis_room_service.dart:229-236).
2. Fetches its own question text from `rooms/{roomId}/publicQ/{index}` (provider:184-185, service:184-190) since hosts get no answer key on device.
3. Subscribes to `rooms/{roomId}/answers/{index}` (HOST-ONLY readable, database.rules.json:34); stream maps each child to its `answer` value (service:200-209). **Live answer count** = size of that map; **connected count** = participants where `presence.connected` (provider:199, game screen:101). Shown as an "answered x of y" pill (game screen:242-288).
4. Early close: when `answers.length >= connectedCount` (and connected > 0), call closeQuestion automatically (provider:197-203).
5. Auto-close timer at `endAt - serverNow`, clamped 500ms..300000ms (provider:206-212).
6. During the pre-question window (`serverNow < questionStartAt`) show the ٣-٢-١ overlay; `countdownValue = ceil((startAt - serverNow)/1000).clamp(1,3)` (provider:154-162), countdown sound each tick (game screen:46-52).
7. Timer badge shows `remainingSeconds = ceil((endAt - serverNow)/1000).clamp(0, timeLimit)` (provider:143-147); color thresholds >10 teal, >5 gold, else red (game screen:594-598).
8. Live distribution bars built client-side from the answers map; key formats MUST mirror the server: lists join `','`, fix_error maps become `'w|o'`, scalars stringify (`'true'`/`'false'`/`'2'`) (game screen:349-471, mirroring live.ts:345-353). Manual "end question" button calls closeQuestion (game screen:292-317).

### majalisCloseQuestion (live.ts:286-398)
**Request** `{ roomId, questionIndex }`. **Response** `{ answeredCount: number }` (live.ts:397).
Errors: `invalid-argument`; requireHost errors; `failed-precondition QUESTION_NOT_LIVE` if `meta.currentQuestionIndex != index` (live.ts:295-297) or if the atomic status transaction finds status != questionLive (single-scorer election, live.ts:310-317); `not-found QUESTION_NOT_FOUND`.
Server: flips status → `answerReview` atomically FIRST, then scores: points = `round(300 + 700 * clamp((endAt - ts)/(endAt - startAt), 0, 1))` if correct else 0 (live.ts:23-24, 355-357); updates `participants/{uid}/score` and `correctCount`; writes `reveal/{index}`:

```json
{ "correctAnswer": {"optionIndex":..,"boolValue":..,"wordIndex":..,"arrangement":..},
  "correctDisplay": "…", "explanation": "…",
  "distribution": {"<key>": count}, "awarded": {"<uid>": {"points": n, "correct": bool}},
  "answeredCount": n, "top5": [{"uid","name","score","avatar"}] }
```
(live.ts:385-393). WARNING: RTDB/Firestore render contiguous-integer-keyed maps as arrays (possibly sparse with nulls); coerce distributions defensively on read (majalis_models.dart:3-32, live.ts:69-90).

### answerReview screen (host)
After close resolves, the host fetches `rooms/{roomId}/reveal/{index}` (provider:241, service:192-197; readable by any auth'd user once status is not questionLive for that index, database.rules.json:54-57). The console re-renders the same bars with the correct bar in green, matched by KEY computed from `reveal.correctAnswer` (not the Arabic display string) (game screen:420-471); zero-count correct bar injected for fix_error/arrange if nobody chose it (game screen:426-434); plus explanation panel when non-empty (game screen:187-236).

### answerReview → leaderboard (manual status flip)
Direct RTDB write, no callable: `set('rooms/{roomId}/meta/status', 'leaderboard')` (provider:249-261). Rules allow ONLY host, ONLY `'answerReview' -> 'leaderboard'` (database.rules.json:13-15).

### Advancing
`showLeaderboardThenNext()`: write leaderboard, hold exactly 3 s, then `startQuestion(index + 1)`; stays busy the whole time; aborts if disposed or finished (provider:266-279). The "next" button appears whenever status is not questionLive; on the last question (`questionIndex >= qCount - 1`, provider:136) it calls finish instead (game screen:75-86).

### majalisFinish (live.ts:529-537 → writeMajalisReportAndClose 405-524)
**Request** `{ roomId }`. **Response** `{ participantCount: number }`.
Errors: `invalid-argument`, requireHost errors. Idempotent: status→`finished` election transaction; second caller returns current count (live.ts:417-425). Server writes Firestore `majalis_reports/{roomId}` `{hostUid, quizId, qCount, participantCount, avgAccuracy, topScore, podium(top3), participants(all rows: uid/name/score/correctCount/avatar), perQuestion[], hardestIndex, easiestIndex, partial, finishedAt}` (live.ts:493-507), stamps `meta/finishedAt`, and releases `pins/{pin}` via compare-and-null transaction (live.ts:509-519).

## 4. Host RTDB writes allowed by rules (database.rules.json)

Default deny all (lines 3-4). Host-writable paths only:
- `rooms/$roomId/meta/joinLocked`: host only, boolean (lines 9-12).
- `rooms/$roomId/meta/status`: host only, EXCLUSIVELY the `answerReview` → `leaderboard` transition (lines 13-15). All other status flips are Admin-SDK only.
- `rooms/$roomId/hostPresence`: host only; must have exactly `{connected: bool, lastSeen: number <= now}` (lines 20-24). **Shape/cadence** (majalis_room_service.dart:136-153): on every `.info/connected == true` event, register `onDisconnect().set({connected: false, lastSeen: SERVER_TIMESTAMP})` then `set({connected: true, lastSeen: SERVER_TIMESTAMP})`. There is NO periodic heartbeat timer; it is event-driven (connect/reconnect + onDisconnect). Web equivalent: `onValue(ref(db,'.info/connected'))` + `onDisconnect(ref).set(...)` + `set(...)` with `serverTimestamp()`.
- Host READ grant: `rooms/$roomId/answers` full subtree, host only (line 34). Everything else the host reads (`meta`, `publicQ`, `participants`, `hostPresence`, post-close `reveal/$qIndex`) is any-authenticated read (lines 8, 18, 21, 26, 56).

## 5. Host reconnect / resume

- **Network blip while app alive**: the `.info/connected` listener re-registers onDisconnect and re-sets `connected: true` on every reconnect (majalis_room_service.dart:136-153); RTDB streams resume automatically. Provider state (roomId, questionIndex, timers) lives in memory only.
- **App kill / tab close**: there is NO host resume path. `MajalisHostFlowScreen` is only constructed with a `draftId` from the review screen (majalis_review_screen.dart:69) and always creates a NEW room in `launch()` (majalis_host_flow_screen.dart:40-41, provider:43-76). The SharedPreferences active-room memory exists only for PLAYERS (majalis_player_provider.dart:52-119). The sessions/history tab lists finished `majalis_reports` only (majalis_sessions_screen.dart:128).
- **Janitor grace** (functions/src/majalis/janitor.ts, runs every 5 min, line 34-35): in-game room with `hostPresence.connected == false` and `lastSeen` older than 2 min → force-finish with a PARTIAL report (`partial: true`) preserving scores (lines 26, 84-101); rooms without hostPresence fall back to "question ended > 30 min ago" (lines 27, 89-91); lobby idle > 4 h → delete (lines 25, 67-69); finished rooms pruned from RTDB after 6 h (report survives in Firestore) (lines 28, 72-78); absolute in-game cap 12 h (lines 32, 93-95); orphan PIN sweep (lines 107-118). Web hosts MUST implement hostPresence or their rooms die 2 min after... actually without a hostPresence node the fallback gives 30 min of stale-question grace, but with correct parity write hostPresence.
- **Host leave**: back press shows a confirm dialog and, on confirm, calls `majalisFinish` (forced even mid-hold) so players are not stranded and the PIN releases immediately (majalis_host_flow_screen.dart:80-112).

## 6. Timing / UX constants to mirror

| Constant | Value | Source |
|---|---|---|
| Pre-question countdown | 3000 ms server-side, derived on clients from `questionStartAt` vs server clock | live.ts:29, 204; provider:154-162 |
| Per-question time limit | `clamp(question.timeLimitSeconds ?? 30, 5, 120)` seconds | live.ts:198; default 30 in model majalis_models.dart:122 |
| Points | 300 base + 700 × remaining-time ratio; 0 if wrong | live.ts:23-24, 357 |
| Leaderboard hold before next question | 3 s | provider:271 |
| Auto-close timer clamp | 500 ms .. 300 000 ms | provider:210 |
| Console tick | 200 ms poll, rebuild only on visible change | game screen:41-66 |
| Early close | all connected players answered | provider:197-203 |
| PIN | 6 digits | rooms.ts:77 |
| Player reconnect memory (player side) | 90 min | majalis_player_provider.dart:57 |
| Sounds (assets/sounds/*.mp3) | lobby join arrival: `star_pop` + light haptic; countdown tick: `countdown` (each of 3-2-1); finish/podium: `victory` + heavy haptic; buttons: medium impact / selectionClick haptics | lobby:44-51; game screen:50; flow screen:195-197; challenge_audio.dart:13-22 |
| Timer badge colors | >10 s teal, >5 s gold, else red | game screen:594-598 |
| Question numbering | Arabic-Indic digits via `majlisDigits` | game screen:139-140 |

## 7. Podium / finish view + report

- Podium (`_HostFinishView`, majalis_host_flow_screen.dart:178-322): top-3 computed client-side from the still-streamed `participants` sorted by score desc (lines 209-214), confetti 3 s + victory sound + heavy haptic (lines 188-198). "Finished" is sticky client-side; the janitor may delete the RTDB node while the host reads the report (provider:113-117, flow screen:145-153).
- Report: Firestore `majalis_reports/{roomId}` written by majalisFinish (live.ts:493-507), readable ONLY where `hostUid == auth.uid` (firestore.rules:379-383). App fetches with a 12 s server read falling back to a 4 s cache read (majalis_report_screen.dart:46-67); parse shape per `MajlisReport.fromDoc` (majalis_models.dart:487-545) including the array-coercion hazard on `perQuestion[].distribution` (majalis_models.dart:460-465). History tab queries `majalis_reports` where `hostUid == uid` (majalis_sessions_screen.dart:128).

**Key absolute paths**: /Users/mansoor/Flutter Projects/irabapp/functions/src/majalis/rooms.ts, live.ts, janitor.ts, premium.ts, avatar.ts; /Users/mansoor/Flutter Projects/irabapp/database.rules.json; /Users/mansoor/Flutter Projects/irabapp/firestore.rules (361-383); /Users/mansoor/Flutter Projects/irabapp/lib/features/majalis/providers/majalis_host_provider.dart; services/majalis_room_service.dart; widgets/majalis_host_flow_screen.dart, majalis_lobby_screen.dart, majalis_host_game_screen.dart, majalis_qr.dart; models/majalis_models.dart.
═══════════════════════════════════════════
# Majalis AI Generation + Quotas — Web Parity Contract

Extracted from `/Users/mansoor/Flutter Projects/irabapp` (app repo). All paths absolute; line numbers from current working tree.

---

## 1. Worker endpoint: `POST {base}/api/majalis-generate`

### 1.1 Base URL + override mechanism

| Layer | Value | Source |
|---|---|---|
| Primary (prod) | `https://api.irab.app` | `lib/core/constants.dart:24` |
| Fallback (network-level failure only) | `https://irab-api-v2.mansourhassan783.workers.dev` | `lib/core/constants.dart:25-26` |
| Staging (debug builds) | `https://irab-api-staging.mansourhassan783.workers.dev` | `lib/core/constants.dart:30-32` |
| Remote Config override key | `api_base_url` (Firebase Remote Config), applied via `ApiHost.applyRemoteOverride` | `lib/core/services/remote_config_service.dart:41,107`; `lib/core/services/api_host.dart:56-69` |

Resolution order (`lib/core/services/api_host.dart:36-43`): if primary marked network-unreachable this session → fallback URL; else RC override if a valid `https` URL (trailing slash stripped, invalid values ignored, `api_host.dart:59-66`); else compile-time primary. Only DNS/socket failures trigger failover, never 4xx/5xx (`api_host.dart:23-24`). **Web should read the same `api_base_url` RC key and default to `https://api.irab.app`.**

### 1.2 Required headers

Worker side (`cloudflare-workers/src/index.ts:158-198`):

- `Authorization: Bearer <Firebase ID token>` — **required**; verified against Google securetoken JWKS with `issuer=https://securetoken.google.com/{FIREBASE_PROJECT_ID}`, `audience={FIREBASE_PROJECT_ID}` (`index.ts:167-175`). Missing/invalid → `401 {"error":"Authentication required"|"Invalid or expired token","success":false}`.
- `X-Firebase-AppCheck: <App Check JWT>` — **optional in current "warm mode"**: absent or invalid tokens are logged and allowed; only when env `APP_CHECK_ENFORCE=strict` does missing/invalid → 401 (`index.ts:185-198`, verification at `index.ts:3079-3096`). Flutter sends it best-effort (`lib/core/services/cloud_api_service.dart:373-386`).
- `Content-Type: application/json; charset=utf-8` (`cloud_api_service.dart:382`).
- Method must be `POST` (`index.ts:147-149`); CORS is wide open: `Access-Control-Allow-Origin: *`, methods `GET, POST, OPTIONS`, headers `Content-Type, Authorization` (`index.ts:123-127`). Note `X-Firebase-AppCheck` is NOT in `Access-Control-Allow-Headers` — a browser sending it will fail preflight; web should omit it (warm mode allows this) or the worker CORS list needs extending.

Premium status is resolved server-side per request from RevenueCat by uid (5-min per-isolate cache, `index.ts:200-201, 3098-3100`). The web client never sends a premium flag.

### 1.3 Request JSON (generate mode)

Handler `handleMajalisGenerate` at `cloudflare-workers/src/index.ts:2896-3053`; Flutter caller `generateMajalisQuestions` at `lib/core/services/cloud_api_service.dart:249-291`.

```json
{
  "topic": "المبتدأ والخبر، كان وأخواتها",   // optional string; server trims + slices to 240 chars (index.ts:2937)
  "sourceText": "…pasted or OCR'd text…",   // optional string; max 1000 chars else 400 (index.ts:2938,2944-2946)
  "focus": "أخطأ 80% في: …؛ أخطأ 65% في: …", // optional string; smart-review weakness notes; sliced to 600 (index.ts:2940)
  "count": 5,                                // number; default 5; clamped to [1, 10, remaining] (index.ts:2960-2961, MAJALIS_MAX_PER_CALL=10 at 2474)
  "types": ["mcq", "true_false", "fix_error"], // array; unknown values filtered; empty → default: premium=all 3, free=["mcq","true_false"] (index.ts:2963-2968)
  "difficulty": "beginner" | "intermediate" | "advanced" // default "intermediate"; advanced silently downgraded to intermediate for free (index.ts:2979-2984)
}
```

- At least one of `topic` / `sourceText` / `focus` required, else `400 {"error":"topic, sourceText or focus is required","success":false}` (`index.ts:2941-2943`).
- Client sends **exactly one** source: topic mode → `topic`; text/photo modes → `sourceText`; review mode → `focus` (`lib/features/majalis/widgets/majalis_ai_setup_screen.dart:319-328`). Client only includes non-empty keys (`cloud_api_service.dart:267-270`).
- There are no per-type counts; the server splits `count` evenly across `types` (e.g. 8 over 3 → 3/3/2) (`index.ts:2995-3000`).
- فرعية options: there is NO separate request flag; the فرعية (subsidiary-sign) content is baked into the `difficulty` level definitions (intermediate introduces المثنى/جمع المذكر السالم/الأسماء الخمسة/الأفعال الخمسة; advanced adds مقدّرة/محلّية) in `MAJALIS_DIFFICULTY_AR` (`index.ts:2585-2589`), and the fix_error validator accepts فرعية letter-swap corrections (`majalisSameWordDifferentCase`, `index.ts:2564-2583`).

### 1.4 Request JSON (probe mode — quota readout, spends nothing)

`{"probe": true}` → `200`:

```json
{ "success": true, "data": { "quota": { "used": 3, "limit": 10, "remaining": 7, "tier": "free" | "premium" } } }
```

(`index.ts:2909-2916`; Flutter `fetchMajalisAiQuota` at `cloud_api_service.dart:293-303`.)

### 1.5 Success response (generate)

`200`:

```json
{
  "success": true,
  "data": {
    "questions": [ /* MajlisQuestion wire objects, see 1.6 */ ],
    "quota": { "used": 8, "limit": 10, "remaining": 2, "tier": "free" }
  }
}
```

(`index.ts:3041-3052`.) Quota is charged **per question actually delivered** (`incrementUsageCount(uid,'majalis_ai',env, questions.length)`, `index.ts:3038-3039`). `questions.length` may be **less than `count`** (validation drops + two top-up rounds that stop on no progress, `index.ts:3010-3031`); client must handle a short delivery (see 2.5).

### 1.6 Question wire shape (identical to what drafts store)

Built by `majalisToWireQuestion` (`index.ts:2698-2712`):

```json
{
  "id": "<uuid v4>",
  "type": "mcq" | "true_false" | "fix_error",
  "questionText": "…",
  "sourceText": "…" | null,            // null when the model returned none (mcq/true_false may omit)
  "options": ["…"],                     // see per-type below
  "correctAnswer": {                    // ALL four keys always present
    "optionIndex": 2 | null,
    "boolValue": true | null,
    "wordIndex": 4 | null,
    "arrangement": null
  },
  "explanation": "…",
  "grammarTopic": "<topic string sent>" | null,
  "difficulty": "beginner"|"intermediate"|"advanced",
  "timeLimitSeconds": 30,               // mcq 30, true_false 20, fix_error 40 (index.ts:2625,2650,2693)
  "sourceReference": null,
  "aiGenerated": true,
  "saveToBank": false
}
```

Per type:
- **mcq**: 3-4 deduped options, pre-shuffled server-side; `correctAnswer.optionIndex` set (`index.ts:2627-2646`).
- **true_false**: `options: []`; `correctAnswer.boolValue` set (`index.ts:2647-2650`).
- **fix_error**: `sourceText` contains the flawed sentence; `correctAnswer.wordIndex` = whitespace-token index of the wrong word in `sourceText`; `options` = correct form + 1-2 decoy forms (shuffled); `correctAnswer.optionIndex` = index of the correct form in `options` (`index.ts:2651-2693`).

This exact map goes straight into Firestore drafts unchanged (see §2.4) — **web must write the identical shape**.

### 1.7 Error responses

| Status | Body | Condition | Source |
|---|---|---|---|
| 429 | `{"error":"majalis_ai_quota","success":false,"used":10,"limit":10,"tier":"free"}` | daily question allowance spent; enforced even when `DISABLE_USAGE_LIMITS` is set on staging | `index.ts:2918-2933` |
| 403 | `{"error":"majalis_premium_source","success":false}` | free user sent `sourceText` or `focus` | `index.ts:2949-2958` |
| 403 | `{"error":"majalis_premium_type","success":false}` | free user requested `fix_error` | `index.ts:2970-2977` |
| 400 | `{"error":"topic, sourceText or focus is required","success":false}` | no source | `index.ts:2941-2943` |
| 400 | `{"error":"sourceText too long (max 1000 chars)","success":false}` | | `index.ts:2944-2946` |
| 500 | `{"error":"generation_failed","success":false}` | 0 questions survived all rounds | `index.ts:3033-3035` |
| 503 | `{"error":"Generation service unavailable","success":false}` | no Gemini keys configured | `index.ts:2991-2993` |
| 401 | `{"error":"Authentication required" \| "Invalid or expired token","success":false}` | auth | `index.ts:160-174` |

Error envelope always `{error: string, success: false}` (`errorResponse`, `index.ts:3503-3515`); success envelope always `{success: true, data: …}` (`jsonResponse`, `index.ts:3491-3501`).

Flutter mapping (`cloud_api_service.dart:418-446`): 403 with `majalis_premium_type`/`majalis_premium_source`/`premium_required` → `PremiumRequiredException` (upgrade sheet); 429 with `majalis_ai_quota` → `MajalisAiQuotaException(used, limit)` (quota screen); 429 `daily_limit_reached` → paywall; other 429 → generic rate-limit. On 401 the client force-refreshes the ID token and retries the whole call once (`cloud_api_service.dart:400-409`).

Client transport settings for this endpoint: **timeout 60 s, maxRetries 0** (no auto-retry; generation is expensive) (`cloud_api_service.dart:275-277`). Probe uses defaults (60 s, 2 retries on 5xx/timeout, `cloud_api_service.dart:118-120,295`).

### 1.8 Server generation internals web does NOT reimplement (context only)

One Gemini call per type, sub-batched ≤4 questions/call, parallel (`index.ts:2876-2894`); model `gemini-3.1-flash-lite`, temp 0.3, `thinkingLevel: medium`, `maxOutputTokens: 8192`, structured `responseSchema` per type (`index.ts:2507-2538, 2811-2822`); truncation-salvage parser (`index.ts:2732-2769`); validation: diacritic-spam guard, from-source ≥50% content-word overlap when `sourceText` given, mcq dedupe/shuffle, fix_error same-word-different-case + unique-token + decoy checks (`index.ts:2596-2713`). All server-side; the web gets only the validated wire questions.

---

## 2. Client-side AI setup contract (to replicate on web)

Screen: `lib/features/majalis/widgets/majalis_ai_setup_screen.dart`.

### 2.1 Source modes (exactly one active; enum `_SourceKind` at line 42)

| Mode | Free? | Sends | Notes |
|---|---|---|---|
| `topic` («موضوع») | FREE | `topic` = selected chips + free-text field, joined with `، ` (`:119-125`) | 8 suggestion chips at `:75-84`: المبتدأ والخبر، كان وأخواتها، إن وأخواتها، الفاعل والمفعول به، الحال والتمييز، الجار والمجرور، الأفعال الخمسة، المنصوبات. Multi-select + one free-text topic. |
| `text` («من نص/كتابك») | Premium (owner call 2026-07-14, `:563-573`) | `sourceText` = textarea, `maxLength: 1000` (`:870`), min 10 chars to validate (`:265-267`) | |
| `photo` («صورة من الكتاب») | Premium (`:581`) | `sourceText` = OCR result (editable in same textarea) | Flow: pick camera/gallery → resize maxWidth 1600, quality 82 (`:161-165`) → base64 → `POST /api/ocr` `{imageBase64, mimeType:'image/jpeg'}` → `data.text` (`cloud_api_service.dart:150-163`; worker `index.ts:2153-2262`, premium-only 403 `premium_required`/`feature:'ocr'`, max 4 MB base64). OCR result <10 chars = failure snack (`:177-187`). Switching into photo mode clears stale text + `_ocrDone` (`:587-593`). Validation requires an actual OCR pass, not just text present (`:270-272`). |
| `review` («مراجعة ذكية») | Premium (`:602`) | `focus` = weakness notes | Mined client-side from Firestore `majalis_reports` where `hostUid == uid`, orderBy `finishedAt` desc, limit 5 (`:205-211`); keeps per-question stats with `answeredCount > 0 && correctRate <= 0.6` (`:217`), label = `questionText + «sourceText»`, dedup, sort by wrongPct desc, take 6 (`:230-233`). Focus string: lines `أخطأ {pct}% في: {label}` joined by `؛`, capped ~580 chars (`:250-259`). |

Free users tapping a locked source/type/difficulty get the premium bottom sheet, not a server call (`:127-134, 567-610, 933-935, 1013-1022`) — the worker 403s are backstops only.

### 2.2 Other controls

- **Difficulty**: 3-segment `beginner`/`intermediate`/`advanced`; default `intermediate` (`:53`); `advanced` locked for free (`:929-941`).
- **Count**: stepper 1..10, default 5 (`:54, 966-989`).
- **Types**: chips `mcq`, `true_false` (free), `fix_error` (premium-locked) (`:1002-1006`); default `{mcq, true_false}` (`:55`); at least one must stay selected (deselect blocked at length 1, `:1024-1030`).
- **Quota row**: on mount, probe `{"probe":true}` and show `remaining/limit` (`:96, 108-115, 1039-1085`); errors just hide the row.

### 2.3 Pre-flight gating in `_generate()` (`:281-305`)

1. Validate: topic non-empty / text ≥10 chars / photo OCR'd + ≥10 chars / review has weak points / ≥1 type.
2. If `quota.remaining <= 0` → open quota screen (aiMode), no server call.
3. If `count > quota.remaining` → dialog: "generate the remaining N" (sets `_count = remaining`) or upgrade (`:301-305, 386-446`). Never silently short-orders.

### 2.4 Response handling → draft

Each returned map goes through `MajlisQuestion.fromMap` (`lib/features/majalis/models/majalis_models.dart:197-214`) — pure tolerant coercion, **no re-validation** (server already validated): unknown `type` falls back to `mcq` (`:51-57`), missing numerics default (`timeLimitSeconds` 30), `options` stringified, `correctAnswer` via `MajlisAnswer.fromMap` (`:98-105`, keys `optionIndex`/`boolValue`/`wordIndex`/`arrangement`). Questions are added to `MajalisCreateProvider` and the user lands on the **mandatory review screen** (PRD §5.3) before anything is saved/launched (`majalis_ai_setup_screen.dart:331-361`). `toMap` (`majalis_models.dart:181-195`) is the exact serialization drafts store — same field set as §1.6.

### 2.5 Retry/salvage behavior

- No client retry on the generate call (`maxRetries: 0`); salvage/top-up is entirely server-side.
- Short delivery (`result.questions.length < count`) → snackbar `majalis_gen_partial` ("generated N only"), still proceeds to review where the host can top up manually (`:348-356`).
- `MajalisAiQuotaException` → set quota to (used, limit, 0) + open quota screen (`:362-369`). Any other error → `majalis_gen_failed` snackbar (`:370-377`).
- Quota state after success is recomputed from the response quota block (`:334-340`).
- UX during the 5-15 s wait: full-screen overlay with 4 narrated steps ticking every 1900 ms (`:86-91, 312-316, 1094-1175`).

---

## 3. Quota semantics (two DIFFERENT quotas)

### 3.1 Majalis AI question quota (per generated QUESTION, calendar-day UTC)

- Free **10**/day, premium **100**/day: `FREE_DAILY_LIMITS.majalis_ai` / `PREMIUM_DAILY_LIMITS.majalis_ai` (`cloudflare-workers/src/index.ts:3109, 3129`).
- Enforced **only in the Worker**, in server-only Cloudflare KV under key `usage:{uid}:{YYYY-MM-DD UTC}:majalis_ai`, TTL 48 h (`index.ts:3197-3200, 3155`); resets at UTC midnight by key rollover. Eventually-consistent (concurrent calls can leak 1-2 uses, `index.ts:3148-3152`).
- Charged post-generation for questions actually delivered (`index.ts:3038-3039`). Enforcement deliberately ignores the `DISABLE_USAGE_LIMITS` staging bypass (`index.ts:2918-2933`).
- Queried via the free probe (§1.4); displayed on the AI setup screen as `remaining/limit` and on the quota screen (`majalis_ai_setup_screen.dart:1039-1085`; `majalis_quota_screen.dart` with `aiMode: true`, `used`, `limit` — `majalis_ai_setup_screen.dart:448-458`).

### 3.2 Majlis-per-day room quota (per LAUNCHED GAME, rolling 24 h)

- Free **1**, premium **10** per rolling 24 h: `FREE_MAJALIS_PER_DAY`/`PREMIUM_MAJALIS_PER_DAY`, `WINDOW_MS = 24h` (`functions/src/majalis/live.ts:18-20`).
- Enforced in Cloud Functions (`consumeQuotaOnce`, `live.ts:117-140`): ledger doc `majalis_quota/{uid}` in Firestore (admin-only), field `starts: [{t: epochMs, r: roomId}]`, idempotent per room, transaction-guarded; charged on the **first `majalisStartQuestion`** of a room regardless of index (creation/lobby never charge, `live.ts:150-195`, `rooms.ts:96-97`). Over-limit → callable `HttpsError('resource-exhausted', 'MAJLIS_QUOTA')` (`live.ts:132-134`); client detects `e.message == 'MAJLIS_QUOTA'` (`lib/features/majalis/providers/majalis_host_provider.dart:218`).
- **`majalisQuotaStatus` callable** (`functions/src/majalis/live.ts:548-574`; Firebase callable over `FirebaseFunctions.instance`, exported in `functions/src/index.ts:53`):
  - Request: `{}` (auth required; `verifyAuth`).
  - Response: `{ used: number, limit: number, remaining: number, nextFreeAtMs: number|null, isPremium: boolean }` — `nextFreeAtMs` = oldest in-window start + 24 h, `null` while allowance remains.
  - Client wrapper: `MajalisRoomService.quotaStatus()` (`lib/features/majalis/services/majalis_room_service.dart:41-62`); displayed on the entry screen (`majalis_entry_screen.dart:107`) and passed as `nextFreeAt` countdown to the quota screen (`majalis_entry_screen.dart:333`, `majalis_quota_screen.dart:27-49`).

### 3.3 `/api/usage` note

`POST /api/usage` (body `{}`) returns all KV counters including raw key `majalis_ai` (no display alias, `USAGE_DISPLAY_KEY` lacks it so it passes through as `majalis_ai`): `{success:true, data:{isPremium, usage:{ majalis_ai:{used,limit,remaining}, … }}}`; premium users get `limit:-1, remaining:-1` here (abuse ceilings not surfaced) (`index.ts:3287-3303, 3215-3221, 3134-3139`). The majalis screens do not use it; they use the probe.

---

## 4. Host-relevant rate limits (Cloud Functions, `functions/src/majalis/rooms.ts`)

- **Room creates: 12 per rolling 60 min** per uid — `CREATE_LIMIT = {windowMs: 3600000, max: 12}` (`rooms.ts:30`), enforced in `majalisCreateRoom` (`rooms.ts:106`) via transaction on Firestore `majalis_ratelimits/{uid}` field `creates: number[]` (`rooms.ts:33-50`). Over-limit → `HttpsError('resource-exhausted', 'RATE_LIMITED')`.
- **Joins: 30 per rolling 10 min** per uid — `JOIN_LIMIT = {windowMs: 600000, max: 30}` (`rooms.ts:31`).
- Capacity limits enforced at create: free ≤20 players / ≤10 questions; premium ≤100 players / ≤50 questions (`rooms.ts:19-22, 139-140`); free drafts containing any type other than `mcq`/`true_false` → `HttpsError('failed-precondition','PREMIUM_TYPES')` (`rooms.ts:129-137`).
- Worker-side premium abuse ceilings that touch the host AI flow: `ocr: 100/day` premium (`index.ts:3126`) → 429 `daily_limit_reached` with `service:'ocr'` (`index.ts:3269-3279`); `majalis_ai: 100/day` is the premium limit itself (§3.1).

---

## 5. Web-parity checklist (derived, all evidence above)

1. Call `POST https://api.irab.app/api/majalis-generate` with `Authorization: Bearer <ID token>`; skip `X-Firebase-AppCheck` (CORS allowlist excludes it; warm mode permits absence).
2. Probe on setup-screen mount with `{"probe":true}`; render `remaining/limit`.
3. Gate sources/types/difficulty client-side by premium (from `/v1/me` → `{uid, premium}`, `index.ts:203-210`), mirroring: free = topic source, mcq+true_false, beginner/intermediate, count clamped to remaining.
4. Send exactly one of `topic`/`sourceText`/`focus`; count 1-10; 60 s timeout; no retry.
5. Store returned question maps **verbatim** (plus host edits via the same field set) into `majalis_drafts/{uid}/drafts/{draftId}.questions[]` — field names in §1.6 are the cross-platform schema (`majalis_models.dart:181-195` is authoritative).
6. Handle 429 `majalis_ai_quota` (quota screen w/ used/limit), 403 `majalis_premium_source`/`majalis_premium_type` (upgrade), short deliveries (partial notice + manual top-up in review), and the mandatory review step before `majalisCreateRoom`.
7. Use callable `majalisQuotaStatus` for the games-per-day readout and `MAJLIS_QUOTA`/`RATE_LIMITED` `resource-exhausted` errors from `majalisStartQuestion`/`majalisCreateRoom`.
═══════════════════════════════════════════
# Majalis HOST Contract — Part 3: Sessions (مجالسي), Reports, Premium Gating

Repo: `/Users/mansoor/Flutter Projects/irabapp`. All paths below are repo-relative unless absolute.

---

## 1. Sessions screen (مجالسي) — `lib/features/majalis/widgets/majalis_sessions_screen.dart`

Entry points: entry-screen row «مجالسي» (`majalis_entry_screen.dart:266-317`) pushes `MajalisSessionsScreen()`; constructor takes `initialTab` (default 0) (`majalis_sessions_screen.dart:24-26`).

### 1.1 Three segmented tabs (`majalis_sessions_screen.dart:299-355`, tab switch at 272-288)
| index | key label (ar) | content |
|---|---|---|
| 0 | `majalis_seg_drafts` «المسودات» | drafts list |
| 1 | `majalis_seg_history` «السجل» | finished-majlis reports |
| 2 | `majalis_seg_bank` «بنك الأسئلة» | personal question bank |

Selected segment pill = `MajalisTokens.purple`, radius 12, inside a 16-radius container.

### 1.2 Firestore queries (exact)
All three load with a **cache-first, then silent server refresh** pattern (`_loadCachedThenServer`, lines 53-79): `query.get(GetOptions(source: Source.cache))` painted first if non-empty, then plain `query.get()`; if offline with no cache, settle on empty list (never eternal spinner). Each doc is parsed in its own try/catch so one corrupt doc skips itself instead of blanking the tab (`_parseDocs`, lines 84-98).

- **Drafts** (lines 100-118):
  `collection('majalis_drafts').doc(uid).collection('drafts').orderBy('updatedAt', descending: true).limit(30)` → `MajlisDraft.fromDoc(d.id, d.data())`
- **History** (lines 120-138):
  `collection('majalis_reports').where('hostUid', isEqualTo: uid).orderBy('finishedAt', descending: true).limit(20)` → `(roomId: d.id, report: MajlisReport.fromDoc(...))`. NOTE: requires the composite index (hostUid ASC, finishedAt DESC).
- **Bank** (lines 140-157):
  `collection('majalis_bank').doc(uid).collection('questions').limit(100)` (NO orderBy) → `MajlisQuestion.fromMap(d.data())`

Signed-out (`uid == null`) → all lists set to empty immediately.

### 1.3 Row cards
- **Draft card** (lines 425-513): gold badge `majalis_draft_badge` «مسودة», question count `majalis_q_count` «{n} أسئلة», title (draft.title, «؟» if empty, 1 line ellipsis), purple «متابعة» (`majalis_continue`) button + delete button. Footer note after last row: `majalis_drafts_note` «المسودات لا تُحتسب من حصتك اليومية حتى تبدأ المجلس» (lines 396-408; ar.dart:1625).
- **History card** (lines 547-628): teal badge `majalis_finished_badge` «منتهٍ», participant count via `majlisKnightCountLabel(n)` with Arabic plural rules (lines 634-645: 0=«بلا مشاركين», 1=«مشارك واحد», 2=«مشاركان», 3-10=«N مشاركين», 11+=«N مشاركاً»), title = `report.perQuestion.first.questionText` else `majalis_untitled` «مجلس إعرابي» (lines 550-552), full-width dark button `majalis_view_report_btn` «التقرير» with bar-chart icon → pushes `MajalisReportScreen(roomId: entry.roomId)` (lines 594-621).
- **Bank card** (lines 684-722): type badge (`q.type.nameKey`), 2-line question text, delete button.

### 1.4 Deletes (host-facing, direct Firestore writes; allowed by rules — owner-only)
- Draft delete (lines 176-191): optimistic local remove, then `majalis_drafts/{uid}/drafts/{draftId}.delete()`; on error re-load.
- Bank delete (lines 193-208): optimistic, `majalis_bank/{uid}/questions/{q.id}.delete()`.
- There is **no report/session delete** in the UI; `majalis_reports` writes are `allow write: if false` (firestore.rules:379-384).

### 1.5 Empty states (`_Empty`, lines 791-813; ar.dart)
- drafts: `majalis_no_drafts` «لا مسودات بعد. أنشئ مجلساً وستُحفظ مسودته هنا تلقائياً.» (ar.dart:1624)
- history: `majalis_no_history` «لا مجالس منتهية بعد. أطلق مجلسك الأول وستجد تقاريره هنا.» (ar.dart:1652)
- bank: `majalis_no_bank` «بنك أسئلتك فارغ. فعّل «حفظ في بنك الأسئلة» عند إنشاء سؤال ليظهر هنا.» (ar.dart:1653-1654)

---

## 2. `majalis_reports/{roomId}` schema

### 2.1 Written ONLY by `writeMajalisReportAndClose` (functions/src/majalis/live.ts:405-524; `.set()` at 493-507). Doc ID = RTDB roomId.
```
{
  hostUid: string,                    // room host (report read gate)
  quizId: string | null,
  qCount: number,                     // from meta.qCount
  participantCount: number,
  avgAccuracy: number,                // mean over participants of (correctCount / qCount), 0..1  (live.ts:446-448, 498)
  topScore: number,                   // rows[0].score after sort desc     (live.ts:499)
  podium:      [ {uid, name, score, correctCount, avatar} x up to 3 ],  // rows.slice(0,3) (live.ts:500)
  participants:[ {uid, name, score, correctCount, avatar} ... ],        // ALL rows sorted score desc (live.ts:501)
  perQuestion: [ {                    // one per REVEAL, sorted by index (live.ts:452-482)
      index: number,
      questionText: string,           // from publicQ/{idx}
      sourceText: string | null,
      type: 'mcq'|'true_false'|'tap_word'|'fix_error'|'arrange_irab',
      options: string[],
      correctDisplay: string,         // Arabic display string, see formats below
      explanation: string,
      distribution: {key: count},     // cleaned map, never array/holes (cleanDistribution, live.ts:78-90)
      answeredCount: number,
      correctCount: number,
      wrongCount: number,             // answered - correct
      correctRate: number             // correct/answered, 0 if none
  } ],
  hardestIndex: number | null,        // lowest correctRate (live.ts:484-491)
  easiestIndex: number | null,        // highest correctRate
  partial: boolean,                   // true only for janitor-closed abandoned rooms (live.ts:505; janitor.ts header)
  finishedAt: serverTimestamp()       // (live.ts:506)
}
```
Distribution KEY formats (from close-time answer keying, live.ts:345-353): mcq/tap_word → option/word index as string ("0"); true_false → "true"/"false"; arrange_irab → comma-joined sequence "2,0,1"; fix_error → "w|o" (wordIndex|optionIndex); keys longer than 40 chars collapse to "other". `correctDisplay` formats (live.ts:253-276): tf → "صواب"/"خطأ"; tap → the word; arrange → fragments joined by space; fix → `«wrong» صوابها «right»`; mcq → the option text.

Security: read gate `resource.data.hostUid == request.auth.uid`, write `false` (firestore.rules:379-384). Client-side Dart parse: `MajlisReport.fromDoc` / `MajlisQuestionReport.fromMap` (`lib/features/majalis/models/majalis_models.dart:487-545, 431-483`), which **must coerce distribution defensively** (`majlisCoerceDistribution`, models 12-32: accepts Map OR List with nulls; counts coerced num/string→int).

### 2.2 Report screen rendering — `lib/features/majalis/widgets/majalis_report_screen.dart`
Load (lines 39-81): `Source.server` get with 12s timeout, fallback to `Source.cache` with 4s timeout, else error state with retry button (`_ReportLoadError`, lines 367-418, copy `majalis_report_load_failed` «تعذّر تحميل التقرير. تحقّق من اتصالك بالإنترنت وحاول مجدداً.», ar.dart:1632-1633).

Sections in order (title `majalis_report_title`):
1. **Stat grid 2×2** (lines 166-209): participants (`report.participantCount`), questions (`report.qCount`), accuracy `(avgAccuracy*100).round()%`, top score (`report.topScore`). Teal icons.
2. **Hardest/easiest cards** (lines 213-239, `_ExtremeCard` 486-556): `majalis_hardest` (wrong/red) and `majalis_easiest` (correct/green), showing `byIndex(hardestIndex)` question text + `(correctRate*100).round()%`; tap → question drill-down.
3. **All questions list** (`majalis_all_questions`, `_QuestionRow` 558-615): text + pct colored green ≥60, gold ≥35, red below.
4. **Standings** (`majalis_participants_list`, lines 282-352): rank number, `MajlisAvatarMedallion(uid, name, avatar)`, name, gold score. Ordered as stored (already score-desc).

**Question drill-down** (`MajalisQuestionReportScreen`, lines 618-963, title `majalis_qreport_title` «تقرير السؤال»): question card w/ type badge + sourceText quote; correct/wrong count tiles; **distribution bar chart** (lines 806-912) with per-type row-label derivation (lines 630-682): tf → localized true/false labels matched on KEY + `correctDisplay=='صواب'/'خطأ'` (835-839); tap_word → each source word; fix_error → observed "w|o" keys sorted by count desc, label rebuilt as `«wrong» صوابها «right»`; arrange → observed sequences sorted by count desc, label = fragments joined; mcq → all options by index. Correct row matched by `label == correctDisplay` (content types) and highlighted green; bar width = count/answeredCount (total floored at 1, line 683). Optional explanation card (`majalis_explanation_title`) when non-empty.

---

## 3. Premium gating: limits, enforcement sites, paywall triggers

### 3.1 The limits (canonical numbers)
| resource | free | premium | server constant |
|---|---|---|---|
| live majalis / rolling 24h | 1 | 10 | `FREE_MAJALIS_PER_DAY`/`PREMIUM_MAJALIS_PER_DAY` (functions/src/majalis/live.ts:18-19), window `24h` (live.ts:20) |
| questions per majlis | 10 | 50 | `FREE_MAX_QUESTIONS`/`PREMIUM_MAX_QUESTIONS` (functions/src/majalis/rooms.ts:21-22) |
| players per room | 20 | 100 | `FREE_MAX_PLAYERS`/`PREMIUM_MAX_PLAYERS` (rooms.ts:19-20); baked into `meta.maxPlayers` at create (rooms.ts:146, 167) and enforced in join transaction (rooms.ts:243-282) |
| AI questions / UTC day | 10 | 100 | `FREE_DAILY_LIMITS.majalis_ai` / `PREMIUM_DAILY_LIMITS.majalis_ai` (cloudflare-workers/src/index.ts:3109, 3129) |
| AI per single call | 10 | 10 | `MAJALIS_MAX_PER_CALL` (index.ts ~2475); client stepper caps `_count < 10` (majalis_ai_setup_screen.dart:987) |

Also premium-only (server backstops, not in the table): question types beyond mcq/true_false (`PREMIUM_TYPES`, rooms.ts:129-137; worker `majalis_premium_type` 403 for fix_error, index.ts:2973-2980); AI sources sourceText/photo-OCR and smart-review focus (`majalis_premium_source` 403, index.ts:2952-2960); `advanced` difficulty silently downgraded to intermediate for free (index.ts:2988-2992).

### 3.2 Server enforcement (authoritative)
- **Premium check**: `isPremiumUser(uid)` (functions/src/majalis/premium.ts:43-103): 1) `users/{uid}.subscriptionTier == 'premium'` (webhook-written, client-tamper-proof), 2) 5-min per-instance cache of a live-true verdict, 3) live RevenueCat V2 lookup (`RC_PROJECT_ID = "proj91bd2212"`), failures degrade to false; false never cached. Worker uses its own equivalent premium check for AI limits.
- **Majlis/day**: consumed in `consumeQuotaOnce` on EVERY `majalisStartQuestion` (idempotent per roomId) (live.ts:117-140, 195). Ledger: Firestore `majalis_quota/{uid}.starts` = array of `{t: epochMs, r: roomId}` (legacy bare numbers accepted), rolling filter `now - t < 24h`, transaction-guarded; over-limit → `HttpsError('resource-exhausted', 'MAJLIS_QUOTA')` (live.ts:133). Fast-path flag `rooms/{id}/meta/quotaConsumedAt` in RTDB. Creation/lobby/drafts NEVER consume quota.
- **Quota readout**: callable `majalisQuotaStatus` → `{used, limit, remaining, nextFreeAtMs, isPremium}` where `nextFreeAtMs = oldest-start + 24h` when exhausted, else null (live.ts:548-574).
- **Questions/launch + types**: `majalisCreateRoom` (rooms.ts:99-177): rejects premium types for free (`failed-precondition` message `PREMIUM_TYPES`, rooms.ts:135) and `questions.length > maxQuestions` (rooms.ts:139-145). Also abuse rate limits (NOT user quotas): creates 12/h, joins 30/10min → `resource-exhausted` `RATE_LIMITED` (rooms.ts:30-50).
- **AI/day**: `handleMajalisGenerate` (cloudflare-workers/src/index.ts:2896+): KV counter `usage:{uid}:{date}:majalis_ai` (UTC date). `{probe: true}` returns quota without charging (index.ts:2910-2916). Exhausted → HTTP 429 body `{error:'majalis_ai_quota', used, limit, tier}` (index.ts:2921-2932), enforced even with the staging `DISABLE_USAGE_LIMITS` bypass. Count clamped to `min(requested, 10, remaining)` (index.ts:2963-2964); charged for questions actually delivered (`incrementUsageCount(..., questions.length)`, index.ts:3039).

### 3.3 Client gate sites + paywall triggers (`PremiumBottomSheet.showFeatureLocked(context, title, subtitle, trigger)` from `lib/features/irab/widgets/premium_bottom_sheet.dart`)
| gate | client site | behavior |
|---|---|---|
| Question count in editor | `MajalisCreateProvider.maxQuestions` = `SubscriptionService().isPremium ? 50 : 10`; `isFull` blocks `addQuestion` (majalis_create_provider.dart:34-35, 72-76); review screen hides the add button when full (majalis_review_screen.dart:211) |
| Premium question types (manual editor) | type chips locked; tap → sheet title `majalis_premium_types_title`, subtitle `majalis_premium_types_body`, trigger `majalis_qtype` (majalis_manual_editor_screen.dart:598-614) |
| Premium types at launch (server bounce) | `MajalisHostProvider.launch` maps `e.message == 'PREMIUM_TYPES'` → `premiumTypesBlocked` (majalis_host_provider.dart:62-68); flow screen pops then shows sheet, trigger `majalis_launch_types` (majalis_host_flow_screen.dart:48-70) |
| Majlis/day at first question | `MajalisHostProvider.startQuestion` maps `e.message == 'MAJLIS_QUOTA'` → `quotaBlocked` (majalis_host_provider.dart:217-222); lobby start button then fetches `quotaStatus()` and pushes `MajalisQuotaScreen(used, limit, nextFreeAt)` (majalis_lobby_screen.dart:376-397) |
| Entry pill | server-fed `majalisQuotaStatus` pill `remaining/limit`; tap only when remaining==0 → `MajalisQuotaScreen` (majalis_entry_screen.dart:103-112, 323-384); fallback total when unfetched: `isPremium ? 10 : 1` (line 120) |
| AI sources text/photo/review | source cards locked for free; tap → sheet title `majalis_premium_src_title`, subtitle `majalis_premium_src_body`, triggers `majalis_src_text`/`majalis_src_photo`/`majalis_src_review` (majalis_ai_setup_screen.dart:127-134, 566-605) |
| AI advanced difficulty | third difficulty index locked, trigger `majalis_difficulty` (majalis_ai_setup_screen.dart:929-935) |
| AI fix_error type chip | locked, trigger `majalis_ai_qtype` (majalis_ai_setup_screen.dart:1002-1022) |
| AI daily quota | pre-flight: `_quota.remaining <= 0` → quota screen; `_count > remaining` → dialog `majalis_ai_limit_title/_body` with «توليد {n} فقط» or upgrade (majalis_ai_setup_screen.dart:296-305, 386-446); server 429 → `MajalisAiQuotaException(used, limit)` (cloud_api_service.dart:439-444) → quota screen `aiMode:true` (majalis_ai_setup_screen.dart:362-369, 448-458) |
| Quota screen upgrade CTA | `PremiumBottomSheet.showFeatureLocked`, title `majalis_quota_title`, subtitle `majalis_quota_premium_note`, trigger `majalis_ai_quota` or `majalis_quota` per mode (majalis_quota_screen.dart:384-393) |
| 403 premium codes | worker `majalis_premium_type` / `majalis_premium_source` → `PremiumRequiredException` (cloud_api_service.dart:418-426) |

### 3.4 Quota screen (`MajalisQuotaScreen`, `lib/features/majalis/widgets/majalis_quota_screen.dart`)
Props `{used, limit, aiMode=false, nextFreeAt}` (lines 21-43). Renewal countdown: `nextFreeAt` if given, else **next UTC midnight** for aiMode (lines 48-53); minutes rounded UP, spelled duration with Arabic plurals («بعد 5 ساعات و42 دقيقة», lines 69-110). Shows big `remaining/limit` = `(limit-used)/limit` (line 210), captions `majalis_quota_rooms_caption`/`majalis_quota_ai_caption`, and the fixed free-vs-premium table (lines 438-443): rooms 1/10, questions 10/50, players 20/100, AI 10/100 with labels `majalis_cmp_rooms/questions/players/ai` (ar.dart:1466-1470). CTA `majalis_upgrade_cta` «الترقية إلى إعراب بلاس», dismiss `majalis_later` «لاحقاً».

---

## 4. Draft resume

- Sessions drafts tab «متابعة» → `_continueDraft` (majalis_sessions_screen.dart:159-174): builds a NEW `MajalisCreateProvider(draftId: draft.id)`, awaits `provider.loadDraft(draft.id)`, then pushes **`MajalisReviewScreen(provider: provider)`** (review, not the editor). On pop, disposes the provider and reloads the drafts list.
- `loadDraft` (majalis_create_provider.dart:49-70): reads `majalis_drafts/{uid}/drafts/{id}`, replaces the in-memory question list, sets `draftId`.
- From review the host can: reorder (`ReorderableListView`, provider.reorder), expand/edit a question (pushes `MajalisManualEditorScreen(provider, editing: q)`, majalis_review_screen.dart:75-84), delete, append manual questions (footer, hidden when full, lines 211-248), and launch.
- **Launch = save-then-callable** (majalis_review_screen.dart:36-73): `saveDraft()` FIRST (server reads the quiz from the saved draft), then `pushAndRemoveUntil(MajalisHostFlowScreen(draftId), (r) => r.isFirst)` which calls `majalisCreateRoom`.
- `saveDraft` (majalis_create_provider.dart:99-150): doc shape per `MajlisDraft.toMap` (models 566-572): `{title, questions:[MajlisQuestion.toMap...], createdAt: Timestamp, updatedAt: Timestamp, hasAiQuestions: bool}`. Title = first question's sourceText else questionText, truncated to 60 chars. First save `add()`, later saves `set(merge:true)` with `createdAt` removed to preserve original. Write-through: every question with `saveToBank == true` is upserted to `majalis_bank/{uid}/questions/{q.id}` with `q.toMap()` (lines 129-138). `MajlisQuestion.toMap` wire shape (models 181-195): `{id, type(key), questionText, sourceText, options, correctAnswer:{optionIndex,boolValue,wordIndex,arrangement}, explanation, grammarTopic, difficulty, timeLimitSeconds, sourceReference, aiGenerated, saveToBank}`.
- Firestore rules: drafts and bank are owner read/write (firestore.rules:361-368); `majalis_quizzes` owner-read only, CF-write only (372-377).

## 5. Everything else host-facing

- **Report sharing/export: none.** The only share is the lobby's PIN share via `share_plus` with `majalis_share_text` (majalis_lobby_screen.dart:179-198). No PDF/export anywhere in `lib/features/majalis/`.
- **Podium → report**: finish view (`_HostFinishView`, majalis_host_flow_screen.dart:178-322) plays confetti + victory sfx, shows top-3 podium from live participants, «عرض التقرير» pushes `MajalisReportScreen(roomId)`, «العودة للرئيسية» pops to root. Host leave mid-game shows confirm dialog and calls `finishMajlis(force:true)` so the report is still written and the PIN released (majalis_host_flow_screen.dart:80-112).
- **Hosting XP**: once per majlis for signed-in non-anon hosts, `XPService().awardXP(source: XPSource.majalisHosted)` (majalis_host_provider.dart:293-298).
- **Smart-review source mining** (web parity needed): reads own last 5 reports (`majalis_reports where hostUid orderBy finishedAt desc limit 5`), collects perQuestion rows with `answeredCount>0 && correctRate <= 0.6`, dedupes by "questionText «sourceText»", sorts by wrongPct desc, takes 6; focus string lines `'أخطأ {pct}% في: {label}'` joined by '؛ ' capped ~580 chars (majalis_ai_setup_screen.dart:199-259). Sent as `focus` to `/api/majalis-generate` (premium only).
- **Janitor effects hosts see** (functions/src/majalis/janitor.ts:1-80): lobby idle >4h deleted; in-game host gone >2min → auto-finished with `partial: true` report; finished RTDB rooms pruned after 6h (report persists in Firestore); 12h absolute in-game cap. Host heartbeat at `rooms/{id}/hostPresence` with onDisconnect (majalis_room_service.dart:136-153).
- **Error humanization** (message-key mapping, all on `FirebaseFunctionsException.message`):
  - join (majalis_player_provider.dart:141-151): `ROOM_NOT_FOUND→majalis_err_not_found`, `ROOM_STARTED→majalis_err_started`, `ROOM_LOCKED→majalis_err_locked`, `ROOM_FULL→majalis_err_full`, `NAME_LENGTH→majalis_err_name`, `NAME_REJECTED→majalis_err_name_rejected`, `RATE_LIMITED→majalis_err_rate_limited`, else `err_generic` (code `not-found` also → not_found). Arabic copy at ar.dart:1403-1404, 1577-1581.
  - host: `PREMIUM_TYPES` → upsell sheet (not error); `MAJLIS_QUOTA` → quota screen; everything else `err_generic` snackbar.
  - AI: 429 `majalis_ai_quota` → typed exception → quota screen; other failures → `majalis_gen_failed` snackbar; partial delivery → `majalis_gen_partial` «تم توليد {n} من الأسئلة...» (majalis_ai_setup_screen.dart:348-356).
- **Report load resilience contract for web**: server-get with timeout, cache fallback, retry UI (report screen 39-81) and array-coercion of `distribution` (models 12-32) are required for parity; Firestore mirrors RTDB's array coercion for MCQ distributions.
- **Numbers/RTL conventions**: quota fractions rendered LTR (`textDirection: TextDirection.ltr`) with tabular figures; Western digits app-wide; Arabic plural helpers (`majlisKnightCountLabel`, `_spellDuration`); owner rule: no em-dashes in user-facing copy.
═══════════════════════════════════════════
# WEB FOUNDATION CONTRACT — irab-web host-experience building blocks

Repo: `/Users/mansoor/Flutter Projects/irab-web` (Astro 6 static site, Tailwind 4, pnpm, Node ≥22.12; `package.json:22-45`). Firebase JS SDK `firebase@^12.14.0` (`package.json:38`). Same Firebase project as the app: `arabic-grammar-app-43de9` (`src/lib/firebase.ts:13-20`).

Hard repo rules (`AGENTS.md`): PUBLIC repo, no secrets; NO AI/Claude co-author lines in commits (plain conventional commits `feat(web): …`); push to `main` auto-deploys the live site; content/SEO pages stay Firebase-free, only login-gated tool pages load Firebase lazily; tool pages must be `noindex` + excluded from sitemap in `astro.config.mjs`; after build sanity-check `grep -c "firebaseapp.com" dist/index.html` → 0.

---

## 1. Auth

### Firebase init — `src/lib/firebase.ts`
- Browser-only module; NEVER import from `.astro` frontmatter (build-time, no `window`) (`firebase.ts:1-4`).
- Exports `app: FirebaseApp` (idempotent `getApps().length ? getApp() : initializeApp(config)`) and `auth: Auth = getAuth(app)` (`firebase.ts:22-23`).
- Config is public by design; `databaseURL` is NOT in the config, so RTDB must be opened with an explicit URL (see §5).

### Auth wrappers — `src/lib/auth.ts`
- Providers: Email/password, Google popup, Apple popup (`auth.ts:1-3`).
  - `onAuth(cb)` → `onAuthStateChanged(auth, cb)` (`auth.ts:22-24`)
  - `signInGoogle()` — `GoogleAuthProvider` + `prompt:'select_account'` (`auth.ts:26-30`)
  - `signInApple()` — `OAuthProvider('apple.com')` + email/name scopes (`auth.ts:32-37`)
  - `signUpEmail(email, password, name?)` — creates user, sets displayName, fire-and-forget `sendEmailVerification` (`auth.ts:39-46`)
  - `signInEmail`, `resetPassword`, `resendVerification`, `logout` (`auth.ts:48-55`)
  - `authError(code, lang)` — Firebase error code → friendly AR/EN copy, with fallback (`auth.ts:58-95`)

### Session marker — `src/lib/session.ts`
- Zero-Firebase localStorage flag `irab-signedin` so anonymous pages never load the SDK (`session.ts:7`).
- `rememberSignedIn()` (`:9-11`), `forgetSignedIn()` — also removes the `irab-premium` cache (`:12-17`), `maybeSignedIn(): boolean` (`:18-20`).

### Login page — `src/pages/login.astro`
- `BaseLayout lang="ar"` + `<meta slot="head" name="robots" content="noindex, nofollow" />` (`login.astro:7-8`) + `Nav` + `AuthForm` island.
- `AuthForm.astro` handles `?next=` redirect: only same-origin relative paths accepted (`/^\/(?!\/)/` regex, no open redirect), default destination = account page (`AuthForm.astro:130-133`); on `onAuth(u)` → `rememberSignedIn(); window.location.replace(dest)` (`AuthForm.astro:163`). UI: tabs `data-tab="in"/"up"`, providers `data-provider="google"/"apple"`, form fields `data-email/data-password/data-name` (`AuthForm.astro:47-110`).

### Gating pattern (AppHub, the canonical authed-island pattern) — `src/components/AppHub.astro:1849-2110`
1. Static markup renders 3 mutually exclusive states: `[data-hub-loading]` skeleton, `[data-hub-gate]` sign-in gate, `[data-hub]` real dashboard (`AppHub.astro:147-166`).
2. `<script>` island: import ONLY `maybeSignedIn` + localStorage helpers eagerly (`:1850-1851`).
3. If `!maybeSignedIn()` → hide skeleton, show gate, STOP (no Firebase downloaded) (`:1960-1964`).
4. Else `await Promise.all([import('../lib/auth'), import('../lib/entitlement'), import('../lib/session')])` (`:1966-1967`), wire sign-out (`logout(); forgetSignedIn(); location.assign(home)` `:1969-1973`), then `onAuth(async (u) => …)`: null user → `forgetSignedIn()` + gate (`:1977-1981`); user → `rememberSignedIn()`, show hub, fill name/email/avatar-initial (`:1982-1989`), `await u.getIdToken()` (`:1994-1995`), `fetchMe(u)` for premium (`:1997-2001`), worker calls with `Authorization: Bearer <idToken>` (`:2075-2079`, worker = `https://irab-api-v2.mansourhassan783.workers.dev` `:1857`).
5. Checkout intent carry-through: `?checkout=annual|monthly` query param survives login via the gate link's `?next=` (`:1866-1874`), auto-clicks the matching plan after auth (`:2068-2072`).
- Nav integration: `maybeSignedIn()` swaps `[data-signin-link]` for `[data-app-link]`; `localStorage 'irab-premium' !== '1'` shows the `[data-plus-chip]` → `/app?checkout=annual` (`Nav.astro:294-309`, chip href `Nav.astro:57`).

---

## 2. Entitlement / premium + Paywall

### `src/lib/entitlement.ts` (full API)
- Worker: `const WORKER = 'https://irab-api-v2.mansourhassan783.workers.dev'` (`:10`). Worker checks RevenueCat by the SAME Firebase uid the app uses, so any-platform subscription unlocks web (`:1-7`).
- `interface Me { uid: string; premium: boolean }` (`:12`).
- `fetchMe(user): Promise<Me|null>` — `POST ${WORKER}/v1/me` with `Authorization: Bearer <idToken>`; caches result to localStorage `irab-premium` ('1'/'0') for Firebase-free surfaces (Nav chip); stale cache affects chip visibility only, never access (`:14-31`).
- `isPremium(user): Promise<boolean>` (`:33-36`).
- `waitForPremium(user, { onSlow? })` — post-checkout polling: 12×3s quick phase, then `onSlow()` callback, then 24×5s patient phase; resolves true on first premium sighting, false after ~2.5min (`:45-58`).

### Paddle checkout — `src/lib/paddle.ts`
- Paddle Billing is the web payment path; RevenueCat's native Paddle integration reads the Firebase UID from checkout `custom_data` (`:1-13`). `PADDLE_ENABLED = true`, `PADDLE_ENV = 'production'`, `PADDLE_CLIENT_TOKEN`, `PADDLE_PRICES = { monthly: 'pri_01kv74grvszv7sebpxqcgfw8ad', annual: 'pri_01kv74kx212adkg0xfvjxb4s92' }` (`:14-20`).
- `loadPaddle()` — loads `https://cdn.paddle.com/paddle/v2/paddle.js` once, `Paddle.Initialize` with an `eventCallback` that fires the registered callback on `checkout.completed` (`:40-58`).
- `openCheckout({ plan, firebaseUid, email?, lang?, onComplete? })` — overlay checkout, `customData: { firebaseUid }` is REQUIRED (webhook mapping) (`:69-84`).

### `src/components/Paywall.astro` (shared upgrade gate)
- Global API, mounted once per page, self-guarded against double mount (`:17-20`, `:388-389`):
  - `window.IrabPaywall.show({ uid?, email?, reason?: 'limit'|'challenges', onActivated? })` (`:424-437`) — omitting uid/email makes it resolve `auth.currentUser` itself via lazy import (`:447-454`); signed-out clickers get routed to `/login` (`:489`).
  - `window.IrabPaywall.hide()` (`:420-423`); closes on X button, backdrop click, Escape (`:440-444`).
- `Props { lang?: 'ar'|'en' }` (`:23`). Renders a 2-pane modal (pitch + annual/monthly plan buttons `data-pw-plan`), plus an "activating" state: on `checkout.completed` → `awaitActivation()` → `waitForPremium` with onSlow copy swap → reload on unlock, honest timeout + refresh button otherwise (`:460-483`). Prices hard-coded in copy: $35.99/yr, $4.99/mo (`:45-46`, `:80-81`).
- Usage pattern for a gated tool: render `<Paywall lang="ar" />` inside the tool component, call `window.IrabPaywall?.show()` on a 429/limit signal.
- AppHub has its own inline Paddle wiring (`[data-paddle-plan]` buttons + `data-hub-activating` strip, `AppHub.astro:2018-2063`) — same flow, not the modal.

---

## 3. Firestore / Firebase usage patterns on web

- Only TWO components touch Firebase databases today (grep across `src/`):
  1. **`src/components/PracticePlay.astro`** — Firestore READS, lazily: `fsMod = await import('firebase/firestore'); db = fsMod.getFirestore(app)` memoized in `getFs()` (`PracticePlay.astro:906-914`). Reads `grammar_topics` ordered by `level` (`:917-928`) and `sentences/{topicId}/items` ordered by `order` (`:930-937`), with in-memory caches. No web Firestore WRITES exist anywhere today.
  2. **`src/components/MajlisPlay.astro`** — Realtime Database (not Firestore): `getDatabase(app, RTDB_URL)` with explicit `RTDB_URL = 'https://arabic-grammar-app-43de9-default-rtdb.firebaseio.com'` (`MajlisPlay.astro:206`, `:324`) because the web config lacks `databaseURL`. Plus `httpsCallable(getFunctions(app, 'us-central1'), 'majalisJoinRoom')` (`:325`) and `signInAnonymously` (`:307-314`).
- Universal import rule: all Firebase imports live inside `<script>` islands (never frontmatter), and heavyweight modules are `await import(…)`ed only after the signed-in/interaction check (AGENTS.md "Web feature pattern"; `firebase.ts:1-4`).

---

## 4. Design system essentials for a complex authed UI

### BaseLayout — `src/layouts/BaseLayout.astro`
- Props: `title, description, lang ('en'|'ar', default 'ar'), ogImage, noindex, pathOverride, hasEn, canonicalOverride` (`:16-43`). `dir="rtl"` when `lang==='ar'` (`:45`, `:71`).
- `noindex` prop emits `<meta name="robots" content="noindex, nofollow">` (`:89`); existing authed pages instead pass it via `<meta slot="head" …>` (`app.astro:12`, `login.astro:8`) — both work; `slot="head"` is the pattern in use.
- No-flash dark mode: inline pre-paint script reads localStorage `irab-theme` (fallback `prefers-color-scheme`) and sets `.dark` on `<html>` (`:127-136`). `ThemeToggle.astro` toggles the class + persists `irab-theme` (`ThemeToggle.astro:31-38`); dark styling is the Tailwind class variant: `@custom-variant dark (&:where(.dark, .dark *))` (`global.css:72`).
- Font preloads for Thmanyah/Aref Ruqaa/Uthmanic at `/fonts/*.woff2` (`:84-87`). Cloudflare Web Analytics beacon in head (`:145-151`); `window.gtag` may not exist — MajlisPlay guards `(window as any).gtag?.(…)` (`MajlisPlay.astro:244-246`).
- Body slot + site-wide `[data-reveal]` scroll-reveal script (`:156-160`).

### Page frame convention
Every page: `<BaseLayout lang="ar" title description> + <Nav lang="ar"/> + <main class="px-6 py-…"> + <Footer lang="ar"/>` (`app.astro:11-18`, `majlis.astro:16-31`). Nav is sticky, has language toggle, ThemeToggle, signin/app links, mobile menu (`Nav.astro:74-202`).

### global.css tokens you will use — `src/styles/global.css`
- Colors (`:75-113`): brand `--color-purple #7C4DFF`, `--color-purple-deep`, `--color-teal #1F789B`, `--color-teal-deep`; light neutrals `--color-ink/-soft/-muted/-subtle`, `--color-paper/-soft`, `--color-stone/-soft`, `--color-card #FFFFFF`, `--color-card-edge`; dark neutrals `--color-coal/-soft/-edge`, `--color-mist/-soft/-muted/-subtle`. Rule: NO gradients, solid colors ("The Forge", `:1-7`) — note AppHub's upgrade-nudge is the one gradient exception.
- Fonts (`:117-132`): `--font-display`/`--font-arabic-display` = Aref Ruqaa (SHORT labels ≤2 words only, `:123-128`); `--font-sans`/`--font-arabic`/`--font-arabic-classical` = Thmanyah Text (weights 300/400/500/700/900, `:35-69`); `--font-quran` = Uthmanic Hafs.
- **OWNER RULE for majlis surfaces: Thmanyah only.** The base rule `:where(h1,h2,h3,.display) { font-family: var(--font-display) }` (`global.css:259-263`) puts Aref Ruqaa on every bare heading, so majlis markup must override with `font-sans` on each h1/h2/h3 — exactly what MajlisPlay already does (`class="font-sans font-black …"`, `MajlisPlay.astro:33,80,132,155,162,178`). Follow that pattern for all host screens.
- Type scale tokens `--text-display-xl … --text-caption` (`:134-167`); easings `--ease-out-expo/quart` (`:169-172`); shadows `--shadow-soft/card/lift`, `--lift-shadow` (`:174-235`).
- Utility classes (`@layer components`): `.lift` (`:307-316`), `.card` / `.card-interactive` (`:321-343`), `.btn-primary` / `.btn-ghost` / `.btn-lg` / `.btn-block` + disabled states (`:346-384`), `.icon-btn` (`:387-397`), `.input` (`:400-413`), `.badge` (+`-good/-warn/-brand`, `:416-429`), `.ex-chip` (`:444-454`), `.skeleton` shimmer (`:457-470`), `.stat-num/.stat-label` (`:473-476`), `.section-tint` (`:479-480`), `.panel-in` entrance for JS-toggled containers (`:485-487`), `.hairline` (`:490-496`), `.eyebrow` (`:514-552`).
- Body canvas: paper bg + faint Islamic lattice pattern (`:238-254`). Everything honors `prefers-reduced-motion` (`:291-300`).
- Injected-by-JS nodes need `is:global` styles or utility classes; scoped `<style>` never reaches them (`AppHub.astro:1823-1825`).

### Animation libs
- `src/lib/animate.ts` — Motion (motion.dev) helpers, all reduced-motion aware: `revealStagger(els, delayStep=0.07)` (`:12-30`), `revealOne(el, delay=0)` (`:33-39`), `springPress(els)` hover/press micro-interaction (`:42-51`), re-exports `animate, stagger, inView` (`:53`).
- `src/lib/celebrate.ts` — dependency-free: `isMuted()/setMuted(m)` (localStorage `irab-sfx-muted`, `:12-17`), `sfx.tap/select/correct/wrong/finish(score)` Web Audio tones (`:47-58`), `countUp(node, to, ms=950, suffix='%')` (`:61-71`), `confetti(count=130)` canvas burst (`:74-116`).
- Also available: `@formkit/auto-animate`, `gsap`, `@zumer/snapdom` + `jspdf` (share/PDF via `src/lib/share.ts`, fonts pre-decoded `share.ts:14-29`), `lucide-static` (`package.json:34-41`).

---

## 5. Existing MajlisPlay.astro + player plan (reuse for host surfaces)

### `docs/majlis-web-player-plan.md` (61 lines)
Design locked 2026-08-04, PLAYER-ONLY scope ("hosting stays in the app", `:4`) — the host build supersedes that scope note. Key reusable facts: full-content player thesis (`:8`), state list ENTRY→LOBBY→COUNTDOWN→QUESTION→LOCKED→REVEAL→LEADERBOARD→PODIUM→TERMINAL (`:21-40`), technical shape (`:44-49`): island pattern like PracticePlay, explicit RTDB URL, `getFunctions(app,'us-central1')` + `majalisJoinRoom`, App Check in warm mode (shipped without it, `:47`), players never touch Firestore (`:48`), avatars = 64 Bottts SVGs copied to `public/majlis-avatars/a0.svg…a63.svg` (verified 64 files exist), GA4 event names (`:61`).

### `src/components/MajlisPlay.astro` (679 lines) — helpers a host console can reuse
- **Protocol constants** (header comment `:10-18`): join = callable `majalisJoinRoom {pin, displayName, avatar}` (us-central1); listen `rooms/{id}/meta` + `rooms/{id}/participants`; one-shot `rooms/{id}/publicQ/{index}`; write-once `rooms/{id}/answers/{index}/{uid} = {answer, ts: serverTimestamp()}`; poll `rooms/{id}/reveal/{index}`; `status: lobby|questionLive|answerReview|leaderboard|finished`; **`meta.currentQuestionIndex` is a STRING**; countdown from `questionStartAt` minus `.info/serverTimeOffset`, never local clock.
- **Screen switching**: sections tagged `data-s="name"`, `show(name)` toggles `hidden` across the list (`:239-243`).
- **RTDB init**: `db = getDatabase(app, RTDB_URL)` (`:206`, `:324`).
- **Anonymous-or-existing auth**: `ensureUser()` one-shot `onAuthStateChanged` then `signInAnonymously` fallback (`:307-314`).
- **Avatars**: `AVATAR_COUNT = 64`; `avatarUrl(i) = '/majlis-avatars/a' + ((i%64)+64)%64 + '.svg'` (`:207`, `:236`).
- **Arabic numerals**: `toAr(n)` digit map (`:210`).
- **PIN UI**: 6 segmented boxes backed by one hidden `sr-only` input with `inputmode="numeric" autocomplete="one-time-code"` (`:38-41`, `:248-269`); prefill from `?pin=` (`:288-289`).
- **Join error map**: `JOIN_ERRORS` for ROOM_NOT_FOUND / ROOM_STARTED / ROOM_LOCKED / ROOM_FULL / NAME_LENGTH / NAME_REJECTED / RATE_LIMITED, matched by substring on `e.message` (`:212-220`, `:336-340`).
- **Streams**: `attachRoom()` subscribes `.info/serverTimeOffset`, `.info/connected` (offline banner + presence re-assert `set(rooms/{id}/participants/{uid}/presence, {connected:true, lastSeen:serverTimestamp()})`), `participants` (mapped to `{uid, name: p.profile.displayName, avatar: p.profile.avatar, score, joinedAt}` sorted by joinedAt), and `meta` (`:349-370`).
- **Meta-driven state machine**: `onMeta(m)` — null meta after join = room closed terminal; switch on `m.status`; question loads keyed on the string index (`:388-406`).
- **Server-time ticker**: 200ms interval computes countdown (3-2-1 via `questionStartAt`) and time-ring (`questionEndAt`, stroke-dashoffset over dasharray 100.5) (`:434-453`); `now() = Date.now() + serverOffset` (`:235`).
- **Question renderers per type** with answer payload shapes: `mcq` → int; `true_false` → bool; `tap_word` → int; `arrange_irab` → int[] (tap-to-order with numbered badges); `fix_error` → `{w, o}` two-step (word from `sourceText` split, correction from `options`) (`:488-567`). Hints map `HINTS` (`:456-462`).
- **Reveal**: `fetchReveal(idx)` retries 20×200ms while status is `answerReview` (rules hide the node until close); reads `reveal.awarded[uid].correct/points`, `correctDisplay`, `explanation` (`:586-614`).
- **Leaderboard/podium**: `boardRow()` shared row builder, top-5 board, top-3 podium + confetti for top-3 finisher, clears the rejoin memory (`:617-663`).
- **Rejoin memory**: localStorage `mj-name` + `mj-session {pin,name,avatar,ts}` valid 90min (`REJOIN_MS`, `:208`, `:293-304`, `:329-332`).
- **Analytics**: `track()` gtag guard; events `majlis_web_join_attempt/joined/join_error{code}/answer_submitted{type}/game_completed` (`:244-246`, `:320`, `:333`, `:340`, `:577`, `:659`).
- Page shell `src/pages/majlis.astro`: INDEXED landing (no noindex, the join UI is the hero, `:8-9`), `<noscript>` fallback (`:24-28`).

---

## 6. Routing conventions, noindex, deploy

- **Routing**: file-based static output, `site: 'https://irab.app'`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'directory'`; i18n `defaultLocale 'ar'` at root, `en` under `/en`, no prefix/redirect for default (`astro.config.mjs:30-44`). A new authed host area = new files e.g. `src/pages/majlis/host.astro` → `/majlis/host` (nested dirs like `practice/play.astro` are the precedent).
- **noindex for a new authed page** (three coordinated steps, per existing pages):
  1. `<meta slot="head" name="robots" content="noindex, nofollow" />` inside `BaseLayout` (`app.astro:12`) or `noindex` prop (`BaseLayout.astro:89`).
  2. Add the path (both `/x` and `/en/x` if twinned) to the `sitemapExclude` private-pages list (`astro.config.mjs:24-27`).
  3. Keep Firebase out of frontmatter; island-only (AGENTS.md pattern).
- **Deploy**: push to `main` → GitHub Actions `.github/workflows/deploy.yml` (queued concurrency, production environment, Firebase service-account secret) → Firebase Hosting; `firebase.json` hosting serves `dist` with `predeploy: pnpm install --frozen-lockfile && pnpm build`, `cleanUrls: true`, `trailingSlash: false` (`firebase.json:2-14`), security + cache headers incl. immutable `/_astro/**` (`firebase.json:1172-1226`). Local: `pnpm dev / build / preview / check` (`package.json:23-26`).
- **Supporting libs for host UIs**: `src/lib/history.ts` (localStorage per-uid history/stats: `addHistory/getHistory/getStats/formatAgo`, `history.ts:70-154`) shows the device-first storage pattern; worker usage endpoint pattern `POST ${WORKER}/api/usage` with Bearer token (`AppHub.astro:2077-2094`).

Key absolute paths: `/Users/mansoor/Flutter Projects/irab-web/src/lib/{firebase,auth,session,entitlement,paddle,animate,celebrate,history,share}.ts`, `/Users/mansoor/Flutter Projects/irab-web/src/components/{AppHub,Paywall,MajlisPlay,Nav,AuthForm,ThemeToggle,PracticePlay}.astro`, `/Users/mansoor/Flutter Projects/irab-web/src/layouts/BaseLayout.astro`, `/Users/mansoor/Flutter Projects/irab-web/src/styles/global.css`, `/Users/mansoor/Flutter Projects/irab-web/src/pages/{majlis,app,login}.astro`, `/Users/mansoor/Flutter Projects/irab-web/docs/majlis-web-player-plan.md`, `/Users/mansoor/Flutter Projects/irab-web/{astro.config.mjs,firebase.json,AGENTS.md}`.
═══ VERIFICATION VERDICTS (authoritative corrections) ═══
```json
{
 "creation": {
  "corrections": [
   {
    "claim": "Review source (6.1): weak points are 'questions with correctRate <= 0.6, top 6 by wrong pct'",
    "correction": "The mining loop also skips questions nobody answered: `if (rq.answeredCount == 0 || rq.correctRate > 0.6) continue;` (lib/features/majalis/widgets/majalis_ai_setup_screen.dart:217), and dedupes by questionText+sourceText label (:222) before taking top 6. A web reimplementation without the answeredCount>0 guard would surface 0%-answered questions as weak points.",
    "severity": "minor"
   },
   {
    "claim": "Client-side validation (3.2), fix_error: '>= 1 decoy; {correct + decoys} all distinct'",
    "correction": "Duplicate decoys are not rejected; the `_fixDecoys` getter silently dedupes them via `.toSet()` (lib/features/majalis/widgets/majalis_manual_editor_screen.dart:245-249). The only distinctness ERROR is when the correct form equals a decoy (`{correct, ...decoys}.length != decoys.length + 1`, :222). The stored invariant (all options distinct) holds, but the validation behavior differs: two identical decoys collapse to one option, they don't block the save.",
    "severity": "minor"
   },
   {
    "claim": "AI flow (6.2): 'count clamped to [1, 10, remaining]' and types 'at least one required'",
    "correction": "Server-side, a missing/non-numeric `count` silently defaults to 5 before clamping (cloudflare-workers/src/index.ts:2960), and an empty/absent `types` array silently defaults to all allowed types for premium or ['mcq','true_false'] for free (:2963-2968); unknown type strings are dropped by the filter BEFORE the fix_error premium gate, so a typo'd type yields a silent default rather than an error. Only the client enforces 'at least one type'.",
    "severity": "minor"
   },
   {
    "claim": "Base URL (6.2): 'primary https://api.irab.app, fallback https://irab-api-v2....workers.dev, staging in debug (lib/core/constants.dart:24-39)'",
    "correction": "The live value is ApiHost.baseUrl, which PREFERS a Firebase Remote Config override key `api_base_url` over the compiled constant (lib/core/services/api_host.dart:16,36; cloud_api_service.dart:116), and the fallback host is only attempted on SocketException-level network failure with the primary marked unreachable (cloud_api_service.dart:478-497) — never on HTTP 4xx/5xx. Also on 401 the client force-refreshes the ID token and retries the whole call once (:401-409).",
    "severity": "minor"
   },
   {
    "claim": "Quota/error payload shapes (6.2): 429 -> '{error:\\'majalis_ai_quota\\', used, limit, tier}' and probe -> 'data.quota {used, limit, remaining}'",
    "correction": "Both bodies carry more: the 429 body also has success:false (cloudflare-workers/src/index.ts:2923-2930), the probe/response quota object also includes `tier` (:2914, 3045-3050), and the 403 bodies are exactly {error, success:false} with NO `feature` field, so the app's PremiumRequiredException falls back to _serviceFromPath('/api/majalis-generate') = 'unknown' (cloud_api_service.dart:418-427, 552-559). Cosmetic, but a web client parsing `feature` from the 403 gets nothing.",
    "severity": "minor"
   },
   {
    "claim": "Quota ledger cite: consumeQuotaOnce at 'live.ts:17-19, 105-139'",
    "correction": "Constants are at functions/src/majalis/live.ts:18-20; consumeQuotaOnce body is :117-140 (doc comment :104-116) and the call site inside majalisStartQuestion is :195. Same content, drifted line numbers.",
    "severity": "minor"
   }
  ],
  "missing": [
   "CORS for the web client: the Worker answers every authed API route with Access-Control-Allow-Origin: * and handles OPTIONS preflight (cloudflare-workers/src/index.ts:123-131), so browser calls to /api/majalis-generate and /api/ocr work cross-origin with only the Authorization header. Cloud Functions callables are {cors: true} (rooms.ts:100, live.ts:151). Nothing origin-gates the creation flow.",
   "saveDraft() failure mode: it returns false without throwing when signed out OR questions.isEmpty OR on any Firestore error (majalis_create_provider.dart:100-101, 143-149); the review launch button treats saved==false || draftId==null as a blocking err_generic snackbar and never calls majalisCreateRoom (majalis_review_screen.dart:43-55). A web client must gate the callable on a successful save the same way (the server reads the DRAFT).",
   "Bank write-through ordering: the fire-and-forget bank upserts run only AFTER the draft write succeeds (they sit past the add/set in the same try block, majalis_create_provider.dart:119-138), and their own failures are unawaited/swallowed — bank saves can silently be lost without affecting the draft.",
   "Editing preserves the question id: _build() reuses editing.id (majalis_manual_editor_screen.dart:308), so an edited bank-flagged question upserts over the SAME majalis_bank doc on the next save; only fresh questions mint mq_<micros> ids. A web editor that mints a new id on edit would duplicate bank docs and break the review screen's updateQuestion-by-id (majalis_create_provider.dart:78-83).",
   "Draft resume robustness contract: sessions list parses each draft doc independently and SKIPS corrupt ones instead of failing the tab (majalis_sessions_screen.dart:84-98), and MajlisDraft.fromDoc / MajlisQuestion.fromMap default every missing field (majalis_models.dart:197-214, 574-584). Web-written drafts missing optional keys will load in the app, but Section 1's 'write all keys' rule remains the safe target.",
   "MCQ AI questions require >= 3 distinct options server-side (dedup then `options.length < 3` reject, cloudflare-workers/src/index.ts:2636-2638) while MANUAL questions allow 2 (editor validation) — a web client mimicking the AI shape should not assume 4 options; 3 is the AI floor, 2 the manual floor, 4 the cap for both (:2637 slice, editor:875).",
   "The generation endpoint returns 500 'generation_failed' when zero questions survive validation (cloudflare-workers/src/index.ts:3033-3035) and charges NO quota in that case; quota is charged only for delivered questions (:3039). Client maps that 500 to the generic majalis_gen_failed path (no retry — maxRetries: 0, cloud_api_service.dart:276-277).",
   "Quota probe never spends and ignores the DISABLE_USAGE_LIMITS staging bypass — the majalis_ai quota is enforced even on staging (cloudflare-workers/src/index.ts:2918-2933), unlike other Worker services; a web build pointed at staging still hits the 10/day free gate.",
   "majalisQuotaStatus requires auth (verifyAuth, live.ts:550) and the entry screen simply skips the call and shows tier defaults (premium 10 / free 1) when signed out (majalis_entry_screen.dart:103-121) — web parity for the signed-out pill state.",
   "Sessions history tab (adjacent surface the contract's screen graph names): majalis_reports query is where('hostUid'==uid).orderBy('finishedAt', desc).limit(20) (majalis_sessions_screen.dart:126-137) — this composite needs the matching Firestore index; the AI review-source uses the same shape with limit(5) (majalis_ai_setup_screen.dart:206-211)."
  ]
 },
 "live_console": {
  "corrections": [
   {
    "claim": "Timing/UX table: \"Question numbering: Arabic-Indic digits via majlisDigits\" (game screen:139-140)",
    "correction": "majlisDigits renders WESTERN digits, not Arabic-Indic: `String majlisDigits(Object n) => n.toString();` with an explicit owner decision comment (2026-07-05: \"Western digits everywhere — the Arabic-Indic experiment made compound stats unreadable once RTL reordered the segments\"; numeric clusters are additionally forced LTR at call sites). lib/features/majalis/widgets/majalis_atoms.dart:18-24. A web console following the contract would render ٣/٢/١ style numerals the app deliberately abandoned.",
    "severity": "minor"
   },
   {
    "claim": "§4: hostPresence \"must have exactly {connected: bool, lastSeen: number <= now}\"",
    "correction": "The rule is `.validate: newData.hasChildren(['connected','lastSeen']) && ...` (database.rules.json:23) — hasChildren requires those two keys but there is no `$other: .validate false` clause, so extra children are NOT rejected. \"At least\" rather than \"exactly\". Writing exactly the two fields (as the contract instructs) still passes, so this cannot break integration.",
    "severity": "minor"
   }
  ],
  "missing": [
   "Distribution key cap: the server collapses any raw answer key longer than 40 chars into the key \"other\" before writing reveal.distribution (functions/src/majalis/live.ts:350-353), and that key flows into the Firestore report's perQuestion[].distribution too. A web console mapping distribution keys to option indices / 'w|o' / arrangement strings must tolerate an unmatchable \"other\" bucket (the app's fix_error/arrange bars are observation-driven from the live answers map, so they never hit it, but a web console rebuilding bars from reveal.distribution would).",
   "Hosting XP is a host-client responsibility: after majalisFinish succeeds, the app calls the awardXP callable once per majlis for signed-in non-anonymous hosts (source 'majalis_hosted', 25 XP) — lib/features/majalis/providers/majalis_host_provider.dart:293-298, XP table functions/src/index.ts:87 ('majalis_hosted: 25'). A web host that omits this silently costs teachers their hosting XP; there is no server-side hook that awards it.",
   "No web Firebase config exists in this repo: lib/firebase_options.dart defines only android (line 48), ios (line 57), and windows (line 71) FirebaseOptions — and the windows entry has no databaseURL. The web client must use its own registered web-app config and MUST set databaseURL ('https://arabic-grammar-app-43de9-default-rtdb.firebaseio.com', per lines 54/63) explicitly, since the JS SDK's getDatabase() throws without it.",
   "Join-side gates for the web join page the contract's QR section points at: majalisJoinRoom (functions/src/majalis/rooms.ts:192-292) enforces pin.replace(/\\D/g,'') must be exactly 6 digits ('PIN must be 6 digits.'), display name 2-20 chars after control/invisible-char stripping (invalid-argument 'NAME_LENGTH'), profanity/link blocklist (invalid-argument 'NAME_REJECTED'), a join rate limit of 30 per rolling 10 min per uid (resource-exhausted 'RATE_LIMITED', rooms.ts:31, 212), and for first-time joiners: lobby-only ('ROOM_STARTED'), joinLocked ('ROOM_LOCKED'), capacity via atomic transaction ('ROOM_FULL'); duplicate names get a ' 2'..' 99' suffix and the response displayName/avatar are authoritative (rejoin returns the ORIGINAL stored name/avatar, rooms.ts:285-288).",
   "Web SDK error-code shape: on the Firebase JS SDK, httpsCallable failures surface error.code with a 'functions/' prefix ('functions/failed-precondition', 'functions/resource-exhausted'), not the bare gRPC status the contract's error-protocol paragraph implies; branch on err.message for the machine codes ('MAJLIS_QUOTA', 'PREMIUM_TYPES', 'RATE_LIMITED', 'QUESTION_NOT_LIVE', ...) exactly as the app does (lib/features/majalis/providers/majalis_host_provider.dart:63 and :218).",
   "Host-client close guard worth mirroring: the app only calls closeQuestion when meta.status == questionLive and not busy, and swallows closeQuestion errors (fetching the reveal only on success) — lib/features/majalis/providers/majalis_host_provider.dart:232-247. The three close triggers (all-answered, endAt timer, manual) all funnel through this guard; without it a web console will routinely surface benign 'QUESTION_NOT_LIVE' races from the server's single-scorer election."
  ]
 },
 "ai_generation": {
  "corrections": [
   {
    "claim": "§1.7: \"success envelope always {success: true, data: …} (jsonResponse, index.ts:3491-3501)\"",
    "correction": "jsonResponse (cloudflare-workers/src/index.ts:3491-3501) imposes no envelope; it serializes whatever object the handler passes. /v1/me returns bare {uid, premium} with no success/data wrapper (index.ts:208-210) and /health returns {status, timestamp, version} (index.ts:139-145). The {success:true, data:…} shape holds only for bodies handlers construct that way (majalis-generate does, index.ts:2912-2915, 3041-3052). A generic response unwrapper built from §1.7 would break /v1/me handling; §5.3 already states /v1/me's real shape, hence minor.",
    "severity": "minor"
   },
   {
    "claim": "§2.1: OCR endpoint is \"premium-only 403 premium_required/feature:'ocr'\"",
    "correction": "The premium gate is skipped when env DISABLE_USAGE_LIMITS === 'true': index.ts:2164 reads `if (!isPremium && env.DISABLE_USAGE_LIMITS !== 'true')`, so on the staging worker free accounts can OCR (and the ocr abuse ceiling at index.ts:2176 is also bypassed via enforceUsageLimit's early return at index.ts:3263). Production behavior is as stated.",
    "severity": "minor"
   },
   {
    "claim": "§1.7: 401 body is \"Authentication required\" | \"Invalid or expired token\"",
    "correction": "A third 401 variant exists: {\"error\":\"Invalid token: missing uid\",\"success\":false} when the JWT verifies but has no sub claim (index.ts:172). Web should match 401 by status, not by exact message.",
    "severity": "minor"
   }
  ],
  "missing": [
   "Draft DOC schema beyond questions[]: MajlisDraft.toMap writes {title, questions, createdAt: Timestamp, updatedAt: Timestamp, hasAiQuestions: bool} (lib/features/majalis/models/majalis_models.dart:566-572), and the mobile مجالسي list queries majalis_drafts/{uid}/drafts with .orderBy('updatedAt', descending: true).limit(30) (lib/features/majalis/widgets/majalis_sessions_screen.dart:106-112). A web-written draft that omits a Firestore-Timestamp updatedAt is silently EXCLUDED from the mobile drafts list (orderBy drops docs missing the field) — this is the closest thing to a sync-breaker the contract missed. Title convention: first question's sourceText else questionText, truncated to 60 chars; on update the client preserves createdAt by removing it from the merge payload (lib/features/majalis/providers/majalis_create_provider.dart:106-125).",
   "saveToBank mirroring: on draft save, every question with saveToBank==true is also written (same toMap shape, doc id = question id) to majalis_bank/{uid}/questions/{questionId} with merge (majalis_create_provider.dart:129-137); rules are owner-only (firestore.rules:366-368). Web must mirror this for the question bank to stay in sync.",
   "types must be UNIQUE in the request: the worker neither dedupes nor rejects duplicates — the per-type alloc Map collapses duplicate keys but chunk generation maps over the raw array (one chunk per entry), e.g. types:[\"mcq\",\"mcq\"], count:5 → alloc {mcq:2}, two chunks of 2, top-up sees no deficit → at most 4 delivered/charged, never 5 (index.ts:2964-2968, 2996-3008). Flutter is protected because _types is a Set (majalis_ai_setup_screen.dart:55).",
   "Probe requires strict boolean true: body.probe === true (index.ts:2911). A JSON string \"true\" falls through to generate mode and, with no topic/sourceText/focus, gets 400 'topic, sourceText or focus is required'.",
   "Client-side per-draft question cap: free 10 / premium 50 (MajalisCreateProvider.maxQuestions, majalis_create_provider.dart:32-35) and addQuestion silently no-ops when full (majalis_create_provider.dart:72-76) — the web review/top-up flow must mirror this ahead of the server enforcement at launch (rooms.ts:139-145). Note AI generation output (max 10/call) plus manual top-ups can exceed a free draft's 10-question cap without this gate.",
   "Firestore rules web must satisfy: majalis_drafts/{uid}/drafts and majalis_bank/{uid}/questions are owner-only read+write (firestore.rules:361-368); majalis_reports is host-only read, function-only write (firestore.rules:379-383) — the smart-review query (where hostUid==uid, orderBy finishedAt desc, limit 5) is exactly the permitted shape and needs the same composite index on web; majalis_quota is unmatched by any rule → default-deny, confirming 'admin-only'.",
   "Debug/staging nuance for the host-resolution table: kWorkerFallbackUrl is null in debug builds (constants.dart:43-44), so failover only exists in release; and the SocketException-triggered failover retry lives in cloud_api_service.dart:478-497 (retries the same _post once on the fallback host), not in api_host.dart, if web reimplements it."
  ]
 },
 "sessions_reports": {
  "corrections": [
   {
    "claim": "AI per-call count clamped to min(requested, 10, remaining) (index.ts:2963-2964)",
    "correction": "Actual formula at cloudflare-workers/src/index.ts:2960-2961 is Math.min(Math.max(1, requested), MAJALIS_MAX_PER_CALL, remaining), and `requested` defaults to 5 when body.count is absent or non-numeric (index.ts:2960). So count:0 or a missing count still generates (and charges for) at least 1 question; a web client relying on the contract's formula would predict 0.",
    "severity": "minor"
   },
   {
    "claim": "Quota screen renewal countdown: nextFreeAt if given, else next UTC midnight for aiMode (majalis_quota_screen.dart:48-53)",
    "correction": "The UTC-midnight fallback at lib/features/majalis/widgets/majalis_quota_screen.dart:48-53 applies whenever nextFreeAt is null in ANY mode, not only aiMode: `if (widget.nextFreeAt != null) return widget.nextFreeAt!;` then next UTC midnight unconditionally. (In practice rooms-mode callers always pass nextFreeAt, so behavior matches, but the code has no aiMode condition.)",
    "severity": "minor"
   },
   {
    "claim": "advanced difficulty silently downgraded to intermediate for free (index.ts:2988-2992)",
    "correction": "The downgrade is at cloudflare-workers/src/index.ts:2979-2984 (`if (difficulty === 'advanced' && !isPremium) difficulty = 'intermediate';`). Lines 2988-2992 are the Gemini-key availability check. Content of the claim is correct; the cited lines point at different code.",
    "severity": "minor"
   }
  ],
  "missing": [
   "AI generation SUCCESS payload shape is undocumented but required for parity: worker returns {success:true, data:{questions:[...], quota:{used, limit, remaining, tier}}} (cloudflare-workers/src/index.ts:3041-3052); the client refreshes its local quota counter from that echoed quota, not from a re-probe (lib/core/services/cloud_api_service.dart:279-291; lib/features/majalis/widgets/majalis_ai_setup_screen.dart:334-340). A web client that ignores data.quota will show a stale remaining count.",
   "Client-side AI pre-flight quota gates are SKIPPED entirely when the probe failed (_quota == null): both the remaining<=0 check and the count>remaining dialog are guarded by `q != null` (lib/features/majalis/widgets/majalis_ai_setup_screen.dart:296-305), and _probeQuota swallows errors (lines 108-115), so the flow silently falls through to the server 429 -> MajalisAiQuotaException -> quota screen. Web parity should replicate this fail-open-to-server behavior, not block generation when the probe fails.",
   "MajlisReport.fromDoc drops hostUid, quizId, and partial (lib/features/majalis/models/majalis_models.dart:522-544): the Flutter app never distinguishes janitor-closed partial reports anywhere in the History tab or report screen, so web parity means no 'partial' badge even though the field exists in the doc (functions/src/majalis/live.ts:505).",
   "Manual editor type chips are exactly [mcq, true_false, fix_error, arrange_irab] with NO tap_word (lib/features/majalis/widgets/majalis_manual_editor_screen.dart:592-597); tap_word is retired from authoring and AI generation, kept only so old drafts/bank questions still render (lib/features/majalis/models/majalis_models.dart:42-46). AI setup offers only [mcq, true_false, fix_error] with fix_error premium-locked (majalis_ai_setup_screen.dart:1002-1006). The contract's §2.1 five-type union is correct for reports but a web authoring UI must not offer tap_word.",
   "Bank write-through uses doc ID = question id with SetOptions(merge:true) (lib/features/majalis/providers/majalis_create_provider.dart:128-138), and bank docs carry no server timestamp, which is why the bank tab query has no orderBy (majalis_sessions_screen.dart:146-151) — a web client adding orderBy would need a field that does not exist."
  ]
 },
 "web_foundation": {
  "corrections": [
   {
    "claim": "AuthForm's `?next=` fallback: \"default destination = account page\" (AuthForm.astro:130-133)",
    "correction": "The default destination is the app hub, not the account page. AuthForm.astro:9-10 sets `const account = lang === 'ar' ? '/app' : '/en/app';` with the comment \"After auth, land users on the app hub (their signed in home), not the bare account page.\" The '/account' literal at AuthForm.astro:129 (`root.dataset.account || '/account'`) is dead fallback code since data-account is always rendered. A host flow relying on the post-login landing page should expect /app.",
    "severity": "minor"
   },
   {
    "claim": "Paywall activating state: on checkout.completed → awaitActivation() → waitForPremium → \"reload on unlock\" (Paywall.astro:460-483)",
    "correction": "Reload is NOT unconditional on unlock: Paywall.astro:473-476 runs `if (unlocked) { if (onActivated) { try { onActivated(); return; } catch {} } window.location.reload(); }` — when the caller passed `onActivated` to show(), a confirmed unlock invokes that callback and returns without reloading; reload only happens when no onActivated was given (or it throws).",
    "severity": "minor"
   },
   {
    "claim": "Rule: NO gradients, solid colors (\"The Forge\") — \"AppHub's upgrade-nudge is the one gradient exception\"",
    "correction": "Gradients are not a single exception. Besides AppHub (AppHub.astro:1607-1615, :1657), Paywall's pitch pane uses radial-gradients (Paywall.astro:234, :240), and linear/radial gradients also appear in PracticePlay.astro, sections/LiveDemo.astro, sections/AppShowcase.astro, pages/pricing.astro, and pages/library.astro (plus the body-lattice repeating-linear-gradients at global.css:247-248 and skeleton shimmer at global.css:465). The no-gradient rule is aspirational guidance, not a code invariant.",
    "severity": "minor"
   }
  ],
  "missing": [
   "gtag/GA4 is never loaded anywhere on the site — the only analytics is the Cloudflare Web Analytics beacon (BaseLayout.astro:145-151), and the sole `gtag` reference in the entire src/ tree is the guarded call in MajlisPlay.astro:245. All majlis_web_* events (join_attempt/joined/join_error/answer_submitted/game_completed) are therefore silent no-ops today; a host console that copies the `track()` pattern for measurement will record nothing unless GA4 is actually added.",
   "The `/api/usage` response schema AppHub actually parses (needed to reuse the worker pattern): `res.json()` → `j.data.usage[key]` for keys customPractice/practiceMode/smartDictionary, each `{ remaining: number, limit: number }` where `limit === -1` means unlimited and premium users skip the display entirely; request is POST with `Content-Type: application/json`, body `'{}'`, plus the Bearer idToken (AppHub.astro:2077-2094).",
   "Arabic ligature protection: `:root[lang=\"ar\"]` globally strips letter-spacing and text-transform from `.eyebrow` and any `tracking-wider/widest` class (global.css:189-198) — host-screen typography using Tailwind tracking utilities will be silently neutralized on Arabic pages.",
   "MajlisPlay clears the `mj-session` rejoin memory on BOTH the podium (MajlisPlay.astro:658) and the terminal/room-closed path (MajlisPlay.astro:673), and `terminal()` also detaches every RTDB listener and stops the ticker (MajlisPlay.astro:666-674) — the full teardown contract a host console should mirror."
  ]
 }
}```
