# AGENTS.md — irab-web (PUBLIC repo)

Astro SSG website + web app for **Irab** (إعراب), an Arabic-grammar (i'rab)
learning product. Bilingual: Arabic at the root, English under `/en`. Shares its
Firebase project and subscription backend with the Irab mobile app.

## Rules (do not violate)
- **This is a PUBLIC repo.** Never commit secrets/keys/tokens. (The Firebase
  *client* config is public by design — that's fine.)
- **No AI / "Claude" / "Codex" co-author lines in commit messages.** Plain,
  conventional commits (`feat(web): …`, `fix(web): …`).
- **Pushing to `main` auto-deploys the live site** via GitHub Actions
  (`.github/workflows/deploy.yml` → Firebase Hosting). Commit in small, reversible
  chunks. It's a static site, so reverts are cheap — but it IS live.
- **Verify every feature/marketing claim against the code before writing copy.**
  Don't invent features. Grep first or ask.
- Keep **content/SEO pages Firebase-free.** Only login-gated tool pages may load
  Firebase, and only lazily (see pattern below). Tool pages must be `noindex` and
  excluded from the sitemap in `astro.config.mjs`.

## Architecture
- Backend = a Cloudflare Worker (source lives in the *app* repo). Web calls
  `https://irab-api-v2.mansourhassan783.workers.dev`. Premium is enforced
  server-side, keyed to the user's Firebase UID (cross-platform subscription).
- `src/lib/`: `firebase.ts` (browser init), `session.ts` (localStorage flag
  `irab-signedin`, no Firebase import), `auth.ts` (auth wrappers, bilingual
  errors), `entitlement.ts` (`fetchMe`/`isPremium` via worker `/v1/me`).
- **Web feature pattern (follow exactly):** frontmatter never imports firebase →
  a `<script>` island checks `maybeSignedIn()` synchronously → only if signed-in,
  lazy-import firebase → `getIdToken()` → POST `Authorization: Bearer <token>` to
  the worker. Free vs premium quota is decided by the worker.
- Components to reuse for content pages: `BaseLayout`, `Nav`, `Footer`, `Schema`,
  `ArticleHero`, `ArticleSection`, `ArticleCta`, `ArticleFaq`.

## Build / verify
- `pnpm build` (Astro, Node 22). After building, sanity-check:
  `grep -c "firebaseapp.com" dist/index.html` → must be `0`; any new noindex tool
  route must NOT appear in `dist/sitemap-0.xml`.

## Current focus
Building out the **English layer** (`/en/*`). Most top-level pages are already
mirrored; gaps to fill: `/en/methodology`, `/en/privacy`, `/en/terms`, then an
English Quran-i'rab content layer. See the owner's `HANDOFF.md` (kept in the app
repo, not here) for full context and priorities.
