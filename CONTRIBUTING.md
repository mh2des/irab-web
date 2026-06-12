# Contributing

Thanks for helping improve the irab.app website. This document covers the conventions used in this repository.

## Development Setup

1. Install Node.js ≥ 22.12 (`nvm use` picks up `.nvmrc`).
2. Enable pnpm via corepack: `corepack enable`.
3. Install dependencies: `pnpm install`.
4. Start the dev server: `pnpm dev` → http://localhost:4321.

Before opening a pull request, make sure both pass locally:

```sh
pnpm check   # type-check .astro / .ts
pnpm build   # full production build (also validates getStaticPaths + sitemap)
```

## Content Accuracy Policy

**Every product claim on the site must match what the shipped Flutter app actually does.** Marketing copy is verified against the app's codebase, not written from imagination.

Current ground truth (keep in sync with the app):

- AI i'rab analysis with word type, syntactic role, i'rab, case marker, details, vocalized sentence, correction note, explanation, and extra clarification.
- Practice with 576 curated sentences, custom i'rab grading, levels 1–2 free, premium explanations.
- Challenges with a 7-bab campaign, daily challenge, XP, ranks, streaks, badges, and leaderboards. *Arena and Speak & Parse are planned, not shipped.*
- Smart, Traditional, and Dialect dictionaries. Traditional uses 13 classical dictionaries through Qamoos; Dialect is offline with 30,000+ entries across 8 regions.
- Grammar library with 47 classical books and 25,000+ chapters.
- Premium unlocks OCR, PDF export, higher limits, full practice/challenges, analytics, unwatermarked image sharing, and yearly mastery certificates.

**Do not market:** a course/lesson system, teacher dashboard, student roster, dedicated Quran browser inside the app, qira'at comparison mode, or bulk surah export. These do not exist in the shipped app.

## Branching & Commits

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `content/<topic>`.
- Use [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `content:`, `seo:`, `chore:`, `docs:`.
- Keep commits focused; one logical change per commit.

## Code Style

- Formatting follows `.editorconfig` (2-space indent, LF, UTF-8).
- TypeScript is strict — fix type errors, don't suppress them.
- Prefer zero client-side JavaScript: Astro components render at build time. Only add a `<script>` for genuine progressive enhancement.
- Arabic is the primary locale: test RTL layout at `/` for any shared component change, and the English mirror under `/en`.

## Quran Data Changes

`src/data/quran-pilot.json` is **generated** — never edit it by hand. Regenerate it from the SQLite corpus:

```sh
IRAB_DB=/path/to/irab_v7.sqlite pnpm export:quran
```

If the export schema changes, update `src/lib/quran.ts` types and the sitemap gate in `astro.config.mjs` together.

## SEO Checklist for New Pages

- [ ] Unique `<title>` and meta description (both locales if applicable)
- [ ] Canonical URL set correctly
- [ ] Added to the sitemap (automatic) and not unintentionally excluded
- [ ] schema.org structured data where relevant
- [ ] Open Graph image and metadata
