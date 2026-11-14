#!/usr/bin/env node
/**
 * check-irab-words.mjs: scan the built «إعراب كلمة» pages (dist/irab/<slug>)
 * and fail on what must never ship there.
 *
 *   Quranic quotes   every example labelled with a surah and ayah is matched
 *                    against the corpus (src/data/quran-pilot.json): the
 *                    quote must be a run of that ayah, letter for letter
 *                    (spelling differences between the everyday and the
 *                    Uthmanic script are folded), and where both carry a
 *                    vowel mark on the same consonant the marks must agree
 *   on-page facts    title at most 70 characters, description 150 to 165,
 *                    exactly one h1, no em dash, every example parsed into
 *                    rows, no internal link to a page that was not built
 *
 * Reads only dist/, so it checks what is published, label included. Run
 * after `pnpm build`: `pnpm irab:check`. Exits 1 on any failure.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const DIR = join(DIST, 'irab');
if (!existsSync(DIR)) { console.error('check-irab-words: dist/irab not found, run `pnpm build` first'); process.exit(1); }

const surahs = JSON.parse(readFileSync(join(ROOT, 'src/data/surahs.json'), 'utf8'));
const pilot = JSON.parse(readFileSync(join(ROOT, 'src/data/quran-pilot.json'), 'utf8'));
const idByName = new Map(surahs.map((s) => [s.name, s.id]));
const verse = new Map(pilot.ayat.map((a) => [`${a.surah}:${a.ayah}`, a.uthmani]));

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const western = (s) => s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

// ---------- folding the two scripts onto one skeleton ----------
// A consonant is any Arabic letter except the ones the two scripts spell
// differently: alif in all its forms, waw, ya, alif maqsura and the hamza
// seats. Each kept consonant carries the first short vowel written after it,
// if any. A doubled consonant counts once (الليل / ٱلَّيْلِ), with the vowel
// of its last copy. Ta marbuta folds onto ta (نعمة / نعمت).
const VOWEL = { 'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ْ': '0', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
const SKIP = new Set([...'اأإآٱوؤيئىءـ']);
const isLetter = (c) => c >= 'ء' && c <= 'ي';
function skeleton(text) {
  const out = [];
  const chars = [...text.normalize('NFC')];
  let adjacent = false; // true while no other letter or space came since the last kept consonant
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i];
    if (c === ' ' || (isLetter(c) && SKIP.has(c))) { adjacent = false; continue; }
    if (!isLetter(c)) continue;
    if (c === 'ة') c = 'ت';
    let v = null;
    for (let j = i + 1; j < chars.length && !isLetter(chars[j]) && chars[j] !== ' '; j++) {
      if (VOWEL[chars[j]] && !v) v = VOWEL[chars[j]];
    }
    const last = out[out.length - 1];
    if (adjacent && last && last.c === c && (last.v === null || last.v === '0')) { last.v = v; continue; }
    out.push({ c, v });
    adjacent = true;
  }
  return out;
}
function findRun(hay, needle) {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j].c !== needle[j].c) continue outer;
    return i;
  }
  return -1;
}

const fails = [];
const notes = [];
let pages = 0, quotes = 0, examples = 0;
const slugs = readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

for (const slug of slugs) {
  const file = join(DIR, slug, 'index.html');
  if (!existsSync(file)) continue;
  pages++;
  const html = readFileSync(file, 'utf8');
  const where = `/irab/${slug}`;

  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]);
  const desc = decode((html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [, ''])[1]);
  if (title.length > 70) fails.push(`${where}: title is ${title.length} characters (max 70)`);
  if (desc.length < 150 || desc.length > 165) fails.push(`${where}: description is ${desc.length} characters (150 to 165)`);
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) fails.push(`${where}: ${h1} h1 elements`);
  if (html.includes('—')) fails.push(`${where}: contains an em dash`);
  if (/<meta\b[^>]*name="(?:robots|googlebot)"[^>]*noindex/.test(html)) fails.push(`${where}: carries a noindex`);

  // Internal links must resolve to a built page.
  for (const m of html.matchAll(/href="(\/(?:irab|duroos)\/[^"#?]+)"/g)) {
    if (!existsSync(join(DIST, m[1], 'index.html'))) fails.push(`${where}: links to ${m[1]}, which was not built`);
  }

  // Worked examples: figure.ix with a sentence; the quick table has none.
  for (const fig of html.matchAll(/<figure class="ix[^"]*"[^>]*>([\s\S]*?)<\/figure>/g)) {
    const body = fig[1];
    const ar = body.match(/<p class="ix-ar"[^>]*>([^<]*)<\/p>/);
    if (!ar) continue;
    examples++;
    const sentence = decode(ar[1]);
    if (!/<ol class="ix-rows"/.test(body)) fails.push(`${where}: example «${sentence}» is not split into rows`);
    if (!sentence.includes('﴿')) continue;

    quotes++;
    const label = decode((body.match(/<figcaption[^>]*>([^<]*)<\/figcaption>/) || [, ''])[1]);
    const ref = label.match(/([^·:]+):\s*([٠-٩]+)\s*$/);
    if (!ref) { fails.push(`${where}: Quranic example «${sentence}» has no surah and ayah in its label`); continue; }
    const id = idByName.get(ref[1].trim());
    const key = `${id}:${western(ref[2])}`;
    const full = verse.get(key);
    if (!id || !full) { fails.push(`${where}: «${label}» is not an ayah of the corpus`); continue; }

    const q = skeleton(sentence.replace(/[﴿﴾]/g, ''));
    const v = skeleton(full);
    const at = findRun(v, q);
    if (at < 0) { fails.push(`${where}: «${sentence}» is not a run of ${key}\n      corpus: ${full}`); continue; }
    const diffs = [];
    q.forEach((x, i) => {
      const y = v[at + i];
      if (x.v && y.v && x.v !== y.v) diffs.push(`${x.c}:${x.v}≠${y.v}`);
    });
    if (diffs.length) fails.push(`${where}: vowel marks differ from ${key} in «${sentence}» (${diffs.join(' ')})\n      corpus: ${full}`);
    const bare = q.filter((x) => !x.v).length;
    if (bare > q.length * 0.4) notes.push(`${where}: «${sentence}» is lightly vocalised (${bare} of ${q.length} consonants unmarked)`);
  }
}

console.log(`check-irab-words: ${pages} pages, ${examples} worked examples, ${quotes} Quranic quotes matched against the corpus`);
for (const n of notes) console.log(`  note: ${n}`);
if (fails.length) {
  console.error(`check-irab-words: ${fails.length} problem(s)`);
  for (const f of fails) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('check-irab-words: ok');
