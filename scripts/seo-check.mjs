#!/usr/bin/env node
/**
 * seo-check.mjs: scan dist/ after a build and print the on-page facts Bing and
 * Google flag: over-long titles, meta descriptions outside 150-165 on the key
 * pages and every surah page, <img> without alt, sitemap counts and lastmod
 * coverage. Read-only; exits 1 only when dist/ is missing.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
if (!existsSync(DIST)) { console.error('seo-check: dist/ not found'); process.exit(1); }

const KEY_PAGES = new Set(['/', '/en', '/tool', '/en/tool', '/teachers']);
const TITLE_MAX = 70, DESC_MIN = 150, DESC_MAX = 165;

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.isFile() && e.name === 'index.html') yield f;
  }
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const longTitles = [], badDesc = [], noAlt = [];
let pages = 0;
for (const file of walk(DIST)) {
  pages++;
  const rel = relative(DIST, dirname(file)).split(sep).join('/');
  const path = rel === '' ? '/' : `/${rel}`;
  const html = readFileSync(file, 'utf8');
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]);
  const desc = decode((html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [, ''])[1]);
  if (title.length > TITLE_MAX) longTitles.push(`${path} (${title.length})`);
  const isSurah = /^\/quran\/[^/]+$/.test(path);
  if ((KEY_PAGES.has(path) || isSurah) && (desc.length < DESC_MIN || desc.length > DESC_MAX)) badDesc.push(`${path} (${desc.length})`);
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt=/.test(img[0])) noAlt.push(`${path}: ${img[0].slice(0, 80)}`);
  }
}

console.log(`seo-check: scanned ${pages} pages`);
console.log(`titles > ${TITLE_MAX} chars: ${longTitles.length}${longTitles.length ? '\n  ' + longTitles.join('\n  ') : ''}`);
console.log(`descriptions outside ${DESC_MIN}-${DESC_MAX} (key pages + surah pages): ${badDesc.length}${badDesc.length ? '\n  ' + badDesc.slice(0, 20).join('\n  ') : ''}`);
console.log(`<img> without alt: ${noAlt.length}${noAlt.length ? '\n  ' + noAlt.slice(0, 10).join('\n  ') : ''}`);

// ---------- sitemaps ----------
const idx = join(DIST, 'sitemap-index.xml');
if (!existsSync(idx)) {
  console.log('sitemap-index.xml: MISSING');
} else {
  const children = [...readFileSync(idx, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`sitemap-index.xml lists ${children.length} children${children.length >= 4 ? ' (ok)' : ' (expected at least 4: pages, duroos, quran-ar, quran-en)'}`);
  let total = 0;
  for (const c of children) {
    const f = join(DIST, c.replace('https://irab.app/', ''));
    if (!existsSync(f)) { console.log(`  ${c}: MISSING`); continue; }
    const xml = readFileSync(f, 'utf8');
    const urls = (xml.match(/<url>/g) || []).length;
    const lastmods = (xml.match(/<lastmod>/g) || []).length;
    total += urls;
    console.log(`  ${c.replace('https://irab.app/', '')}: ${urls} URLs, ${lastmods} with lastmod`);
  }
  console.log(`  total: ${total} URLs`);
  if (existsSync(join(DIST, 'sitemap-0.xml'))) console.log('  WARNING: stale sitemap-0.xml still present');
}
