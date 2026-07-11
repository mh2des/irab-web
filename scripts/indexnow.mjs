/**
 * indexnow.mjs — submit the site's URLs to IndexNow (Bing, Yandex, Seznam,
 * Naver share the endpoint). Bing indexes within hours instead of weeks, and
 * Bing's index feeds ChatGPT / Copilot answers, so this is the fast lane for
 * AI-search visibility while Google crawls at its own pace.
 *
 * Usage (after a deploy, so the key file + pages are live):
 *   node scripts/indexnow.mjs                  # submit every sitemap URL
 *   node scripts/indexnow.mjs /quran /tool     # submit specific paths only
 *
 * The key is public by design (it proves domain ownership via the hosted
 * key file at https://irab.app/<key>.txt — not a secret).
 */
import { readFileSync } from 'node:fs';

const HOST = 'irab.app';
const KEY = '5efb6df5b60c90414895aeddd10984f8';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 10000; // API max per request

const args = process.argv.slice(2);
let urls;
if (args.length > 0) {
  urls = args.map((p) => (p.startsWith('http') ? p : `https://${HOST}${p}`));
} else {
  const xml = readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

if (urls.length === 0) {
  console.error('No URLs found — build the site first (pnpm build).');
  process.exit(1);
}

console.log(`Submitting ${urls.length} URL(s) to IndexNow…`);
for (let i = 0; i < urls.length; i += BATCH) {
  const chunk = urls.slice(i, i + BATCH);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: chunk,
    }),
  });
  // 200 = processed, 202 = accepted (key not yet verified) — both fine.
  console.log(`  batch ${i / BATCH + 1}: HTTP ${res.status} ${res.statusText} (${chunk.length} URLs)`);
  if (res.status >= 400) {
    console.error(await res.text());
    process.exit(1);
  }
}
console.log('Done. Bing Webmaster Tools → IndexNow shows received submissions within a day.');
