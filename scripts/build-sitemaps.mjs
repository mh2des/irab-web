#!/usr/bin/env node
/**
 * build-sitemaps.mjs: write per-section sitemaps for irab.app from the BUILT
 * site, after `astro build`.
 *
 * Why a post-build script instead of @astrojs/sitemap:
 *   - it reads the final HTML, so a page is listed only if it is self-canonical
 *     and carries no robots/googlebot noindex (one source of truth: the page)
 *   - it splits URLs by section so Search Console and Bing report indexing per
 *     child sitemap (pages / duroos / quran-ar / quran-en)
 *   - it stamps every URL with an HONEST <lastmod>: the git commit date of the
 *     content that produced the page, never the build date. A build-date
 *     lastmod marks 5,000 URLs "changed" on every deploy, which crawlers learn
 *     to ignore. A URL whose source cannot be mapped gets no lastmod at all.
 *
 * Output (in dist/): sitemap-index.xml, sitemap-pages.xml, sitemap-duroos.xml,
 * sitemap-quran-ar.xml, sitemap-quran-en.xml. robots.txt, GSC and Bing point at
 * https://irab.app/sitemap-index.xml, and firebase.json 301s /sitemap.xml to it.
 *
 * Also written, NOT listed in the index: sitemap-quran-retired.xml, the /quran
 * pages that carry a Google-only noindex (src/config/seo.ts). Submit it in
 * Search Console by hand so Google recrawls those URLs and drops them quickly
 * (a noindex only takes effect once the page is fetched again; at the natural
 * crawl rate 4,000+ pages take months). Its lastmod is the commit date of the
 * noindex switch. Delete the submission once GSC shows them all excluded.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const SITE = 'https://irab.app';

if (!existsSync(DIST)) {
  console.error('build-sitemaps: dist/ not found, run `astro build` first');
  process.exit(1);
}

// ---------- content sources ----------
const surahs = JSON.parse(readFileSync(join(ROOT, 'src/data/surahs.json'), 'utf8'));
const surahIdBySlug = new Map(surahs.map((s) => [s.slug, s.id]));

// Ayahs with an authored intro (our own words) live in ayah-intros.ts under
// keys like '2:255'. Their pages changed when that file changed.
const introSrc = readFileSync(join(ROOT, 'src/data/ayah-intros.ts'), 'utf8');
const introKeys = new Set([...introSrc.matchAll(/^\s*['"]?(\d+:\d+)['"]?\s*:\s*\{/gm)].map((m) => m[1]));

const gitDateCache = new Map();
/** Last commit date (ISO 8601 with offset) of a repo-relative file, or null. */
function gitDate(relPath) {
  if (gitDateCache.has(relPath)) return gitDateCache.get(relPath);
  let out = null;
  try {
    if (existsSync(join(ROOT, relPath))) {
      out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
    }
  } catch {
    out = null;
  }
  gitDateCache.set(relPath, out);
  return out;
}
const later = (...dates) => {
  const ds = dates.filter(Boolean);
  if (!ds.length) return null;
  return ds.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
};

const PILOT = 'src/data/quran-pilot.json';
const INTROS = 'src/data/ayah-intros.ts';

/** Map a URL path to the git date of the content behind it, or null. */
function lastmodFor(path) {
  let m;
  if ((m = path.match(/^\/quran\/([^/]+)\/(\d+)$/))) {
    const id = surahIdBySlug.get(m[1]);
    if (!id) return null;
    const hasIntro = introKeys.has(`${id}:${m[2]}`);
    return hasIntro ? later(gitDate(PILOT), gitDate(INTROS)) : gitDate(PILOT);
  }
  if ((m = path.match(/^\/quran\/([^/]+)$/))) {
    return surahIdBySlug.has(m[1]) ? gitDate(PILOT) : null;
  }
  if ((m = path.match(/^\/en\/quran\/([^/]+)(?:\/(\d+))?$/))) {
    const id = surahIdBySlug.get(m[1]);
    return id ? gitDate(`src/data/quran-en/${id}.json`) : null;
  }
  // Static pages (incl. /duroos/<slug>, /quran and /en/quran hubs): the .astro
  // file that renders them.
  const base = path === '/' ? 'src/pages/index' : `src/pages${path}`;
  for (const candidate of [`${base}.astro`, `${base}/index.astro`]) {
    if (existsSync(join(ROOT, candidate))) return gitDate(candidate);
  }
  return null;
}

// ---------- walk dist ----------
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && entry.name === 'index.html') yield full;
  }
}

const noindexRe = /<meta\b[^>]*\bname=["'](?:robots|googlebot)["'][^>]*\bcontent=["'][^"']*noindex[^"']*["'][^>]*>|<meta\b[^>]*\bcontent=["'][^"']*noindex[^"']*["'][^>]*\bname=["'](?:robots|googlebot)["'][^>]*>/i;
const canonicalRe = /<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']|<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i;

const groups = { pages: [], duroos: [], 'quran-ar': [], 'quran-en': [], dictionary: [] };
const retired = [];
const googlebotOnlyRe = /<meta\b[^>]*\bname=["']googlebot["'][^>]*\bcontent=["'][^"']*noindex/i;
const robotsRe = /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i;
let skippedNoindex = 0, skippedCanonical = 0;
const normalise = (u) => {
  if (!u) return null;
  try { return encodeURI(decodeURI(u)); } catch { return u; }
};

for (const file of walk(DIST)) {
  const rel = relative(DIST, dirname(file)).split(sep).join('/');
  const path = rel === '' ? '/' : `/${rel}`;
  const html = readFileSync(file, 'utf8');
  if (noindexRe.test(html)) {
    skippedNoindex++;
    // Google-only noindex on a self-canonical /quran page: retired for Google,
    // listed separately so it gets recrawled and dropped sooner.
    if (path.startsWith('/quran/') && googlebotOnlyRe.test(html) && !robotsRe.test(html)) {
      const cm = html.match(canonicalRe);
      const self = `${SITE}${encodeURI(path)}`;
      if (normalise(cm ? (cm[1] || cm[2]) : null) === self) retired.push({ loc: self });
    }
    continue;
  }
  const cm = html.match(canonicalRe);
  const canonical = cm ? (cm[1] || cm[2]) : null;
  // Percent-encode non-ASCII path segments (future /dictionary/<Arabic word>
  // pages): sitemap <loc> values must be valid URIs. Compare canonicals in
  // the same normalised form so an already-encoded canonical still matches.
  const self = path === '/' ? `${SITE}/` : `${SITE}${encodeURI(path)}`;
  if (normalise(canonical) !== self) { skippedCanonical++; continue; }

  const group =
    path === '/quran' || path.startsWith('/quran/') ? 'quran-ar'
    : path === '/en/quran' || path.startsWith('/en/quran/') ? 'quran-en'
    : path === '/duroos' || path.startsWith('/duroos/') ? 'duroos'
    : path.startsWith('/dictionary/') ? 'dictionary'
    : 'pages';
  groups[group].push({ loc: self, lastmod: lastmodFor(path) });
}

// ---------- write ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sortByLoc = (a, b) => a.loc.localeCompare(b.loc);
const children = [];
for (const [name, urls] of Object.entries(groups)) {
  // A section with no indexable pages yet (e.g. dictionary before its first
  // batch) gets no file and no index entry: an empty child sitemap is noise.
  if (urls.length === 0) { console.log(`build-sitemaps: sitemap-${name}.xml skipped (0 URLs)`); continue; }
  urls.sort(sortByLoc);
  const body = urls
    .map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  const fname = `sitemap-${name}.xml`;
  writeFileSync(join(DIST, fname), xml);
  const withLastmod = urls.filter((u) => u.lastmod).length;
  const newest = later(...urls.map((u) => u.lastmod));
  children.push({ loc: `${SITE}/${fname}`, lastmod: newest });
  console.log(`build-sitemaps: ${fname}  ${urls.length} URLs  (${withLastmod} with lastmod, newest ${newest ?? 'n/a'})`);
}
const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${children
  .map((c) => `<sitemap><loc>${esc(c.loc)}</loc>${c.lastmod ? `<lastmod>${c.lastmod}</lastmod>` : ''}</sitemap>`)
  .join('\n')}\n</sitemapindex>\n`;
writeFileSync(join(DIST, 'sitemap-index.xml'), index);

// Retired pages (Google-only noindex): a standalone sitemap for manual
// submission in Search Console. Never referenced from sitemap-index.xml.
{
  const fname = 'sitemap-quran-retired.xml';
  if (retired.length === 0) {
    if (existsSync(join(DIST, fname))) unlinkSync(join(DIST, fname));
    console.log(`build-sitemaps: ${fname} skipped (0 retired URLs)`);
  } else {
    const lastmod = gitDate('src/config/seo.ts');
    retired.sort(sortByLoc);
    const body = retired
      .map((u) => `<url><loc>${esc(u.loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
      .join('\n');
    writeFileSync(join(DIST, fname), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
    console.log(`build-sitemaps: ${fname}  ${retired.length} retired URLs (googlebot noindex, lastmod ${lastmod ?? 'n/a'}; not in index, submit by hand)`);
  }
}

// A stale single-file sitemap from the old integration must not linger: two
// competing sitemaps confuse both engines.
for (const stale of ['sitemap-0.xml']) {
  const p = join(DIST, stale);
  if (existsSync(p) && statSync(p).isFile()) { unlinkSync(p); console.log(`build-sitemaps: removed stale ${stale}`); }
}
console.log(`build-sitemaps: sitemap-index.xml lists ${children.length} children; skipped ${skippedNoindex} noindex + ${skippedCanonical} non-self-canonical pages`);
