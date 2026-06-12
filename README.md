<div align="center">

<img src="public/brand-mark.png" alt="Irab logo" width="88" />

# irab.app — Website

**The official website for [Irab](https://irab.app), the AI-powered Arabic i'rab (إعراب) analysis and learning app.**

[![CI](https://github.com/mh2des/irab-web/actions/workflows/ci.yml/badge.svg)](https://github.com/mh2des/irab-web/actions/workflows/ci.yml)
[![Astro](https://img.shields.io/badge/Astro-6-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522.12-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Hosting](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/docs/hosting)

[Live site](https://irab.app) · [English version](https://irab.app/en) · [Quran i'rab](https://irab.app/quran) · [Report an issue](https://github.com/mh2des/irab-web/issues)

</div>

---

## Overview

This repository contains the marketing and content website for **irab.app**, built as a fully static, zero-runtime-framework site. It serves two purposes:

1. **Product marketing** — a bilingual (Arabic-first, English) landing experience with a live i'rab demo, feature pages, pricing, and FAQ.
2. **Quranic i'rab reference** — statically generated pages covering the complete Quran (every surah, every ayah) with word-by-word grammatical analysis, morphology (صرف), rhetoric (بلاغة), and footnotes, derived from the classical work *الجدول في إعراب القرآن*.

The site is fully prerendered at build time. No client-side framework is shipped; the only JavaScript on the page is lightweight progressive enhancement (scroll reveal, theme toggle, GSAP animations).

## Site Map

| Route | Description |
| --- | --- |
| `/` | Arabic homepage (default locale) |
| `/en` | English homepage |
| `/irab`, `/en/irab` | What is i'rab — long-form explainer |
| `/nahw`, `/en/nahw` | Arabic grammar (نحو) explainer |
| `/quran-parser`, `/en/quran-parser` | Quran parsing feature page |
| `/teachers`, `/en/teachers` | For teachers & students |
| `/quran` | Quran i'rab index (all 114 surahs) |
| `/quran/[surah]` | Per-surah ayah listing |
| `/quran/[surah]/[ayah]` | Full i'rab analysis for a single ayah |
| `/privacy`, `/terms` | Legal pages |

## Tech Stack

- **[Astro 6](https://astro.build)** — static output (`output: 'static'`), directory-format URLs, built-in i18n routing
- **[Tailwind CSS 4](https://tailwindcss.com)** — via the official Vite plugin
- **[TypeScript](https://www.typescriptlang.org)** — strict, checked with `@astrojs/check`
- **[GSAP](https://gsap.com)** — scroll-driven animation on the landing page
- **[@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)** — i18n-aware sitemap with canonical-URL filtering
- **[Firebase Hosting](https://firebase.google.com/docs/hosting)** — CDN delivery with long-lived immutable caching for hashed assets

## Project Structure

```
.
├── astro.config.mjs        # Site config, i18n, sitemap canonical filtering
├── firebase.json           # Hosting config: redirects, security & cache headers
├── scripts/
│   └── export-quran.mjs    # SQLite → JSON export of the Quran i'rab corpus
├── public/                 # Static assets: fonts, icons, OG images, robots.txt
└── src/
    ├── components/         # Reusable Astro components
    │   └── sections/       # Landing-page sections (Hero, LiveDemo, Pricing, …)
    ├── data/
    │   ├── quran-pilot.json  # Exported i'rab corpus consumed by getStaticPaths
    │   ├── surahs.json       # Surah metadata (names, slugs, ayah counts)
    │   └── demo-examples.ts  # Curated examples for the interactive demo
    ├── layouts/            # Base layout (SEO meta, schema.org, fonts)
    ├── lib/
    │   └── quran.ts        # Build-time data access + i'rab content rendering
    ├── pages/              # File-based routes (Arabic at /, English at /en)
    └── styles/             # Global Tailwind theme
```

## Getting Started

### Prerequisites

- **Node.js ≥ 22.12** (see `.nvmrc`) — the Quran export script uses the built-in `node:sqlite` module
- **pnpm** (version pinned in `package.json` → `packageManager`)

### Setup

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

### Available Scripts

| Command | Action |
| --- | --- |
| `pnpm dev` | Start the local dev server |
| `pnpm build` | Build the production site to `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm check` | Type-check `.astro` and `.ts` files |
| `pnpm export:quran` | Regenerate `src/data/quran-pilot.json` from the SQLite corpus |

## Quran Data Pipeline

The Quran section is generated from a SQLite database built in a separate data project (the *الجدول في إعراب القرآن* corpus). The database itself is **not** part of this repository — only the exported JSON is committed:

```sh
# Default DB path: ../irabapp-data/out/irab_v7.sqlite — or point at any copy:
IRAB_DB=/path/to/irab_v7.sqlite pnpm export:quran
```

The export emits a compact JSON bundle (`src/data/quran-pilot.json`) that `getStaticPaths` consumes at build time, so CI and local builds need **no database and no native modules**. Set `QURAN_PILOT=1` to export only a small marquee subset for faster local iteration.

## Internationalization

- Arabic (`ar`) is the default locale, served from the root (`/`) with RTL layout.
- English (`en`) lives under `/en`.
- Astro's built-in i18n routing handles locale resolution; the sitemap emits `hreflang` alternates (`ar-SA` / `en-US`).

## SEO Architecture

- **Canonical discipline:** ayat that share one i'rab analysis canonicalize to the group head; thin/backfilled ayat are `noindex`. The sitemap filter in `astro.config.mjs` mirrors the same gate, so only canonical, indexable URLs are submitted.
- **Structured data:** schema.org JSON-LD via a dedicated `Schema` component.
- **OG/social:** per-page Open Graph metadata with dedicated OG imagery.
- **Caching:** hashed `_astro/` assets and fonts are immutable (1 year); HTML revalidates every 5 minutes (see `firebase.json`).

## Deployment

The site deploys to **Firebase Hosting** (project `arabic-grammar-app-43de9`, connected to the `irab.app` domain):

```sh
firebase deploy --only hosting
```

The `predeploy` hook in `firebase.json` runs a frozen-lockfile install and a full production build before every deploy. Redirects, security headers, and cache policies are all version-controlled in `firebase.json`.

## Contributing

This is a private product website, but the same standards apply as on any shared codebase — see [CONTRIBUTING.md](CONTRIBUTING.md) for conventions, and note the **content accuracy policy**: every product claim on the site must match what the shipped app actually does.

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## License

Copyright © 2026 Mansoor Hasan Ali Shokla. All rights reserved — see [LICENSE](LICENSE).

The Quranic i'rab content is derived from *الجدول في إعراب القرآن* by Mahmud Safi and may not be extracted or redistributed separately.
