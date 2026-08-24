# Public dictionary pages: `/dictionary/<word>`

Status 2026-08-25: scaffolded, zero entries, nothing generated. Generation needs
the owner's explicit go (see "What the owner approves" at the end).

## Why

- `/dictionary` and `/en/dictionary` are login-gated tool pages (noindex). The
  content behind them is ours (the AI lexicographer), not a reproduced book.
- Arabic "معنى كلمة X" queries are among the largest query classes in Arabic
  search, and dictionary definitions are what AI answer engines ground on. Bing
  already gives irab.app 100% citation share on «المكتبة النحوية والصرفية».
- Google demoted the domain for scaled, unoriginal pages. So this section is
  built the opposite way: a few hundred curated entries behind a quality gate,
  grown in batches, never thousands.

## What the engine returns today (worker `POST /api/dictionary`)

Source: `irabapp/cloudflare-workers/src/index.ts`, `handleDictionary` (line ~2061)
and `DICTIONARY_PROMPT` (line ~1999).

- Model: `gemini-3.1-flash-lite` (GA since 2026-05-13), `temperature 0`,
  `maxOutputTokens 1200`, `responseMimeType application/json`, no thinking.
  Average real output is about 510 tokens (comment in the handler).
- Request: `{ "word": "<≤50 chars>" }`, `Authorization: Bearer <Firebase ID token>`.
  Free accounts: 5 lookups/day (10 in welcome week); premium: unlimited. The
  quota is enforced before the cache is read, so bulk generation must use a
  premium token.
- Prompt (system instruction, Arabic): "a verified Arabic lexicographer";
  vocalisation splits meanings, so every distinct reading of the undiacritised
  query is returned as its own `variant` (كَتَبَ / كُتِبَ / كُتُب); no guessing
  (unknown word → `variants: []`, `confidence: 0`); examples must be fusha prose
  (Quran, hadith, poetry and rhymed proverbs are forbidden at prompt level);
  no source attribution unless certain; strict JSON, nothing outside it.
- Response shape (after the worker's sanitiser):
  `{ query, variants: [{ lemma, pos, root, pattern, senses: [{ definition,
  register, domain, source, examples: [{ text, source, verified }] }],
  translations: { en[], fr[] }, synonyms[], antonyms[], morphology: { plural,
  dual, feminine, verbal_noun, active_participle, passive_participle, present,
  imperative }, derivations[] }], etymology, confidence, model }` plus, on the
  envelope, `source: "gemini" | "cache"` and `_usage` (prompt/candidate tokens).
  Examples whose source matches the worker's trusted-dictionary list are
  `verified: true`; religious/poetic examples are dropped server side.
- Caching: KV for 30 days (`dict:v2:<sha256(normalised word)>`), only when
  `variants.length > 0`, a definition > 10 chars and `confidence > 0.2`; plus the
  Cloudflare AI Gateway with a 7-day cache. A repeat of an already-seen word is
  free.
- Keys: `DICT_KEY_1..3` are labelled "free lesson-generation keys" (separate
  Google projects); fallback to OCR/IRAB keys. See cost below.

The web tool (`src/components/DictionarySearch.astro`) renders only the first
variant: lemma, root, pos badge, senses with up to three examples, EN/FR
translations. The public page renders every variant plus morphology, synonyms,
antonyms, derivations and etymology, so it is strictly richer than the tool.

## Entry data (`src/data/dictionary/entries.json`)

`DictEntry` in `src/lib/dictionary.ts`:

```
slug         path segment, undiacritised, as a reader types it (كتب)
query        the word sent to the engine
variants[]   the worker's variants, unchanged
etymology    string | null
confidence   0..1 (model self-report; the worker rejects ≤ 0.2 from its cache)
model        "gemini-3.1-flash-lite"
generatedAt  ISO date (also the page's dateModified)
sources[]    which candidate lists nominated the word (school, quran, demo, chips)
reviewed     false until a human spot-checks the entry
```

## URL design

- `/dictionary/<word>` with the Arabic word as the path segment; Astro emits
  `dist/dictionary/كتب/index.html`, Firebase Hosting serves the percent-encoded
  request (`/dictionary/%D9%83%D8%AA%D8%A8`) from it. The page passes an
  explicit percent-encoded canonical (`entryUrl()`), because
  `Astro.url.pathname` is the decoded form.
- Homographs: ONE page per undiacritised spelling. كَتَبَ, كُتِبَ and كُتُب are the
  variants of `/dictionary/كتب`, each with its own H2, senses and morphology.
  This mirrors the engine's own contract (vocalisation is not a separate query)
  and avoids unreadable diacritic-bearing URLs and near-duplicate pages.
  Rule: `slug = stripDiacritics(word)`; hamza forms are kept (أمل ≠ امل), tatweel
  and harakat removed, single spaces for compounds.
- RTL, `lang="ar"`, no hreflang (no English twin). An `/en/dictionary/<word>`
  layer can come later from `translations.en` plus an English gloss, and would
  then be declared through `en-twin.ts` and `hasEn`.
- Follow-up outside this scaffold: `scripts/build-sitemaps.mjs` writes dist
  directory names into `<loc>` verbatim; before the first batch ships, wrap
  the loc in `encodeURI()` so Arabic segments are percent-encoded in the XML.

## First batch (~300 words) and where it comes from

`scripts/dictionary/wordlist.mjs` (free, local) merges and ranks:

1. `scripts/dictionary/seed-school.txt`: a curated list of ~240 school and
   curriculum words (people, places, values, common verbs and adjectives, and
   the grammar terms students search). Score 100. These are the words students
   actually type into "معنى كلمة".
2. Tool chips (كتب، علم، نور، صبر، رحمة، فهم). Score 60.
3. The hand-parsed demo sentences in `src/data/demo-examples.ts`. Score 40.
4. The most frequent content words in the Quran corpus
   (`src/data/quran-pilot.json`), filtered by the book's own analysis so only
   nouns, verbs and adjectives survive (particles, pronouns and the letters the
   book names as tokens are dropped). Score 20–30 by frequency rank.

Ranked, deduplicated, capped at 300 → `scripts/dictionary/wordlist.json`.
Run: `node scripts/dictionary/wordlist.mjs --limit 300 --quran 200`.

Later batches: words that users actually search in the tool (the worker's KV
cache keys are hashes, so this needs a small log added to the worker), the
tail queries from Search Console and Bing ("معنى X", "ما معنى X"), and the
Juz Amma vocabulary for the Indonesia/Malaysia audience.

## Quality gate

Build time (`isPublishable()` in `src/lib/dictionary.ts`), no exceptions:

- `confidence ≥ 0.5`
- at least one variant with a non-empty vocalised `lemma`
- first sense definition ≥ 20 characters
- at least one example across the entry

Entries failing the gate are not built at all, so they cannot be indexed.

Generation time (`scripts/dictionary/generate.mjs`): words the engine returns
empty or ≤ 0.2 confidence are logged and skipped, never written.

Human spot-check: after each batch, review a 10% sample (30 words for the
first batch): definition correct and fusha, examples natural, no religious
or poetic text slipped through, root and pattern plausible, morphology sane.
Mark `reviewed: true` on checked entries (the page shows a small «مراجَع»
mark). If more than two of thirty fail, review the whole batch before deploy.

## Page template (`src/pages/dictionary/[word].astro`)

Order, top to bottom: breadcrumb (المعجم › word) → eyebrow «معنى كلمة» → H1 =
vocalised lemma → pos badge, root, pattern → definition-first lead card (first
sense) → one section per reading: numbered senses with register/domain,
up to three examples each (verified source shown when present), synonyms and
antonyms, morphology table (plural, dual, feminine, verbal noun, participles,
present, imperative), derivations → translations (EN/FR) → etymology →
«كيف تُعرب هذه الكلمة»: deterministic grammar for the part of speech (noun,
verb, particle, adverb) with the lessons that teach it (from
`lessonsForPos()`; the ayah-side detector in `lesson-links.ts` keys on i'rab
text, which a dictionary entry does not have, so this maps by pos instead) →
«جرّبها في جملة»: CTA to /tool and to the interactive /dictionary → source and
date stamp → app CTA.

Title ≤ 70: «معنى كتب في المعجم: الجذر والإعراب والأمثلة | إعراب» (short form
for long words). Description 150–160, query phrase first: «معنى كلمة كتب في
المعجم: <definition…> مع الجذر والوزن والمرادفات وأمثلة فصيحة، وكيف تُعرب في
الجملة.»

JSON-LD: `DefinedTerm` (in `DefinedTermSet` «معجم إعراب الذكي»), `Article`
(author/publisher Irab, `dateModified` = generatedAt, `about` → the term) and
`BreadcrumbList`.

Hub: the first batch should also add an indexable index at `/dictionary`
listing the entries by letter. That URL is currently the noindex tool page;
options are to keep the tool at `/dictionary` and put the hub at
`/dictionary/all`, or move the tool to `/dictionary/search`. Owner's call; not
touched here.

## Generation pipeline (`scripts/dictionary/generate.mjs`)

- Calls the worker, not Gemini directly: the prompt, sanitiser, cache and key
  rotation stay in one place, and the prompt does not enter this public repo.
- Refuses to run unless `--confirm` is passed AND `IRAB_ID_TOKEN` is set (a
  premium account's Firebase ID token, valid 1 hour). `--dry-run` lists.
- One request every 2.5 s (`--delay`), batches of 50 (`--limit`), 3 retries on
  5xx with backoff, hard stop on 429/401/403, resume-safe (skips words already
  in `entries.json`), writes after every success, prints token usage and the
  running cost estimate.
- Output: `src/data/dictionary/entries.json`. Commit the file; the site builds
  from it with no network.

## Cost estimate (owner must approve before any run)

Basis: Gemini 3.1 Flash-Lite list price on ai.google.dev, checked 2026-08-25:
$0.25 per 1M input tokens, $1.50 per 1M output tokens. The system prompt is
about 700 Arabic words (roughly 1,500 tokens with the Gemini tokenizer), the
handler reports about 510 output tokens on average, 1,200 maximum.

- Per word: ~1,500 in + ~510 out ≈ $0.0011. Worst case (1,200 out): $0.0022.
- 300 words: about **$0.35**, worst case about $0.65. Retries could double
  that: still under **$1.50**.
- Words already in the KV/AI Gateway cache are free.

Two things matter more than the dollars:

1. The worker's `DICT_KEY_1..3` are described in the code as free-tier keys.
   If they are, the run costs $0 but eats the free tier's daily request
   allowance, which real app users share. Run at night, in batches of 50 with
   the default 2.5 s spacing, and stop on the first 429.
2. The request goes through a premium account's quota, so it must be the
   owner's own account (no user is charged), and the token expires hourly.

## What the owner approves

1. Go / no-go on generating the first batch of 300 (cost above).
2. Which account's premium token to use, and a night-time window.
3. Who does the 10% spot-check (30 words) and by when.
4. Hub URL decision (`/dictionary/all` vs moving the tool).

Until then: zero pages are built, the build is green, nothing is indexed.
