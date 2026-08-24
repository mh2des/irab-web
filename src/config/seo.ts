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
 * domain. About 94% of the site's URLs were ayah pages whose main text is a
 * book already published on several established sites, which is what Google's
 * scaled-content / scraped-content policies describe. Recovery means indexing
 * only pages with an original layer until the domain is trusted again, then
 * widening as authored intros grow. Flip the value, rebuild, deploy.
 */
export const QURAN_INDEX_MODE: 'all' | 'original-only' = 'original-only';
