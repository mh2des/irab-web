---
title: "One cache, two apps: sharing a Gemini-backed Arabic parser between a website and a mobile app"
published: false
tags: showdev, ai, cloudflare, arabic
canonical_url: https://irab.app/
---

*Post this from your own dev.to account under the #showdev tag. Everything below is true of the code as of September 2026; adjust numbers if they change.*

I build [Irab App](https://irab.app), an AI tool that does *i'rab* (إعراب): the word-by-word grammatical analysis of an Arabic sentence that every Arabic student is examined on. Each word gets a part of speech, a syntactic role, a case, the case marker and the reason for it, and full tashkeel. The same engine serves a Flutter app on iOS and Android and an Astro website. This post is about the three decisions that made "one engine, two clients" actually work.

## 1. One prompt, one schema, one cache key

For a long time the app and the website were silos. Each had its own prompt, its own cache namespace, and its own quirks. The same sentence could be parsed twice, billed twice, and, at temperature 0.1, occasionally parsed two different ways minutes apart: one client split «لمثل» into two tokens, the other kept it whole.

The fix was boring on purpose:

- **One prompt and one JSON schema** for both clients. The web needs a superset of fields (an explanation per word, a summary sentence); the mobile app ignores the extras null-safely.
- **Temperature 0.** Grammar has right answers. Creativity is a bug here.
- **One cache key**: `parse:v7:<sha256(normalizeArabic(text))>`. Normalization strips tatweel, unifies alef and taa marbuta variants, collapses whitespace, and removes existing diacritics, so «الولدُ يقرأُ» and «الولد يقرأ» hit the same row.

The cache lives in Cloudflare D1 with a KV fallback, read D1-first. A sentence analyzed on a phone in Cairo is a cache hit on the website in Kuala Lumpur.

## 2. The output guard: refuse your own model's answer

LLMs fail in ways that look plausible. The most common failure for this task is a parse that silently drops or merges a word, so the cards no longer line up with the sentence. If that ever reaches the cache, every later user of that sentence inherits the bug.

So the worker validates before it trusts:

```ts
const words = tokenize(normalized);          // what the user actually wrote
const ok =
  parse.cards.length === words.length &&     // one card per written word
  parse.cards.every(c => hasTashkeel(c.form)); // vowelled form present
```

If the guard fails, the worker sends **one corrective retry** that quotes the mismatch back to the model ("you returned 6 cards for 7 words; the missing word is …"). If the retry also fails, the result is **served but never cached**: the user still gets an answer, a bad answer never becomes permanent, and the next request gets a fresh attempt.

Two things I learned:

- Counting cards against tokens catches more real errors than any "is this grammatically right" check I could write. Structure is cheap to verify; correctness is not.
- Serve-but-don't-cache is the right default for any AI output you cannot verify. Caching is a promise about the future.

## 3. Staging that cannot poison production

Staging shares the production database on purpose (a dictionary pre-warm flow depends on it), which meant every staging test used to write real cache rows. The cheap fix was a key prefix: staging sets `PARSE_SCOPE="stg:"`, so its rows are `stg:parse:v7:…` and never collide with production. Same tables, no cross-contamination, no second database to keep in sync.

And a rule I now write at the top of every prompt file: **any prompt edit needs a cache version bump** (`v7` → `v8`), or the cache will happily hide your change and you will spend an afternoon "debugging" a prompt that never ran.

## Smaller pieces that mattered

- **API key rotation** across several Gemini keys, so one throttled key does not become an outage.
- **The website is static.** Astro renders about 6,700 pages (grammar lessons, and word-by-word Quran pages) at build time; only the parser is dynamic. The site is fast because most of it is files.
- **Reference text on demand.** Quran pages pair our own short summary with a quoted classical reference. The quote loads only when a reader asks for it, from a small JSON file per verse, so the page a crawler sees is our own words.

## What I would do differently

Start with the guard, not the prompt. I spent weeks tuning wording and days on validation; the validation paid back more. And put the cache version next to the prompt from day one.

If you work on Arabic NLP or on validating LLM output in general, I would love to compare notes. The tool is free to try on the web: [irab.app](https://irab.app).
