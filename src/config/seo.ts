/**
 * QURAN_INDEX_MODE decides which /quran ayah pages Google is allowed to index.
 *
 *   'all'            every canonical ayah page is indexable (the behaviour the
 *                    site shipped with: about 4,927 URLs in sitemap-quran-ar.xml)
 *   'original-only'  only ayah pages that carry an authored INTROS entry
 *                    (src/data/ayah-intros.ts: our own TL;DR + FAQ) stay
 *                    indexable, plus the 114 surah pages. Every other ayah page
 *                    gets <meta name="googlebot" content="noindex">, which is
 *                    Google-only: Bing, Copilot and the AI crawlers keep seeing
 *                    the pages, and users keep reading them. The sitemap builder
 *                    (scripts/build-sitemaps.mjs) reads the built HTML, so those
 *                    pages also drop out of sitemap-quran-ar.xml automatically.
 *
 * Why the switch exists: on 15-16 Aug 2026 Google stopped ranking the whole
 * domain (every page, every query, the brand query included; no manual
 * action, no security issue, crawl healthy). About 94% of the site's URLs
 * were ayah pages whose main text is a book already published on several
 * established sites, which is what Google's scaled-content / scraped-content
 * policies describe; Google's August 2026 spam update rolled out 18-21 Aug.
 *
 * Recovery, two stages:
 *   Stage 1 (25 Aug 2026): this switch. Book-only ayah pages noindexed for
 *     Google; sitemap shrinks to the pages with an original layer.
 *   Stage 2 (2 Sep 2026): NO book text in the HTML of any page Google may
 *     index. Authored ayah pages ship verse + our summary + FAQ + links; the
 *     quoted reference loads on demand from /quran-ref/<surah>/<ayah>.json
 *     (robots-blocked) when a reader asks for it. Surah pages drop the inline
 *     book dump and are Google-indexable only when at least one ayah carries
 *     our own summary. Decision logic: src/lib/quran-index.ts. Guardrail:
 *     scripts/seo-check.mjs fails when an indexable page contains the book.
 *   Retired pages: scripts/build-sitemaps.mjs writes sitemap-quran-retired.xml
 *     (the googlebot-noindexed URLs, NOT in the index) to submit in Search
 *     Console so Google recrawls them and drops them faster. Remove that
 *     sitemap once "Excluded by noindex" has absorbed them.
 *
 * Widen again ('all') only after recovery is confirmed AND the pages have an
 * original layer; a young domain re-publishing thousands of copied pages is
 * exactly what got it demoted.
 */
export const QURAN_INDEX_MODE: 'all' | 'original-only' = 'original-only';
