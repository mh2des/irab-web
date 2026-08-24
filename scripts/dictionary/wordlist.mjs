#!/usr/bin/env node
/**
 * wordlist.mjs: build the candidate word list for the public dictionary pages.
 *
 * Sources (all local, no network, costs nothing):
 *   school  scripts/dictionary/seed-school.txt (curated, highest priority)
 *   quran   most frequent content words in src/data/quran-pilot.json, using the
 *           book's own analysis to keep nouns/verbs and drop particles/pronouns
 *   demo    words of the hand-parsed demo sentences in src/data/demo-examples.ts
 *   chips   the suggestion chips on the dictionary tool page
 *
 * Output: scripts/dictionary/wordlist.json  [{ word, sources: [...], score }]
 * ranked by score (school 100, chips 60, demo 40, quran by frequency rank).
 *
 * Usage: node scripts/dictionary/wordlist.mjs [--limit 300] [--quran 200]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};
const LIMIT = opt('limit', 300);
const QURAN_TOP = opt('quran', 200);

const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;
const strip = (s) => s.normalize('NFC').replace(DIACRITICS, '').replace(/ـ/g, '').trim();

// Letters and pronouns the book names as tokens ("الواو", "الهاء", "هم"), plus
// function words: none of these is a dictionary headword a student searches.
const STOP = new Set([
  'الواو', 'الفاء', 'اللام', 'الهاء', 'الكاف', 'الباء', 'الياء', 'الهمزة', 'النون', 'التاء', 'الميم', 'السين',
  'ما', 'لا', 'من', 'إن', 'أن', 'إلا', 'إذا', 'قد', 'على', 'ثم', 'هو', 'هي', 'هم', 'هن', 'إذ', 'أو', 'في', 'لو',
  'لكم', 'لهم', 'لها', 'له', 'به', 'بها', 'بهم', 'فيها', 'فيه', 'فيهم', 'منه', 'منها', 'منهم', 'عليه', 'عليها', 'عليهم',
  'الذين', 'الذي', 'التي', 'ها', 'نا', 'كم', 'أنتم', 'أنت', 'أنا', 'نحن', 'هذا', 'هذه', 'ذلك', 'تلك', 'أولئك',
  'كل', 'بعض', 'غير', 'مثل', 'عن', 'إلى', 'حتى', 'بل', 'لم', 'لن', 'لما', 'كان', 'كانوا', 'ليس', 'بلى', 'نعم',
  'يا', 'أيها', 'كيف', 'أين', 'متى', 'ماذا', 'لماذا', 'هل', 'أم', 'إما', 'كأن', 'لكن', 'ليت', 'لعل', 'سوف', 'قبل', 'بعد',
]);

const sources = {};
const add = (word, src, score) => {
  const w = strip(word);
  if (!w || w.length < 2 || /[^ء-ي ]/.test(w) || STOP.has(w)) return;
  const e = sources[w] ?? (sources[w] = { word: w, sources: [], score: 0 });
  if (!e.sources.includes(src)) e.sources.push(src);
  e.score = Math.max(e.score, score);
};

// school seed
const seedPath = path.join(here, 'seed-school.txt');
let school = 0;
for (const line of fs.readFileSync(seedPath, 'utf8').split('\n')) {
  const w = line.trim();
  if (!w || w.startsWith('#')) continue;
  add(w, 'school', 100); school++;
}

// chips on the tool page
for (const w of ['كتب', 'علم', 'نور', 'صبر', 'رحمة', 'فهم']) add(w, 'chips', 60);

// demo sentences (hand-parsed): word: '...' fields
const demoSrc = fs.readFileSync(path.join(root, 'src/data/demo-examples.ts'), 'utf8');
let demo = 0;
for (const m of demoSrc.matchAll(/\bword:\s*'([^']+)'/g)) {
  const w = strip(m[1]).replace(/^[وف]?[بلك]?ال/, (p) => (p.length > 2 ? 'ال' : p));
  add(w, 'demo', 40); demo++;
}

// Quran: frequency of content-word tokens, judged by the book's analysis text
const pilot = JSON.parse(fs.readFileSync(path.join(root, 'src/data/quran-pilot.json'), 'utf8'));
const ayat = Array.isArray(pilot.ayat) ? pilot.ayat : Object.values(pilot.ayat);
const freq = new Map();
const CONTENT = /فعل|فاعل|مفعول|مبتدأ|خبر|مضاف|نعت|صفة|حال|بدل|تمييز|مصدر|اسم/;
const NOT = /حرف|ضمير|الواو|الفاء|اللام|الهاء|الكاف|الباء|الياء|الهمزة|النون|التاء/;
for (const a of ayat) {
  for (const w of a.words ?? []) {
    const t = strip(w.token ?? '').replace(/[()،.:؛]/g, '').trim();
    const an = w.analysis ?? '';
    if (t.length < 3 || STOP.has(t) || !CONTENT.test(an) || NOT.test(an.slice(0, 12))) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
}
const quranRanked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, QURAN_TOP);
quranRanked.forEach(([w], i) => add(w, 'quran', 30 - Math.floor((i / QURAN_TOP) * 10)));

const all = Object.values(sources).sort((a, b) => b.score - a.score || a.word.localeCompare(b.word, 'ar'));
const out = all.slice(0, LIMIT);
fs.writeFileSync(path.join(here, 'wordlist.json'), JSON.stringify(out, null, 2) + '\n');

const count = (src) => all.filter((e) => e.sources.includes(src)).length;
console.log(`wordlist: school ${school} lines → ${count('school')} words; chips ${count('chips')}; demo ${demo} tokens → ${count('demo')} words; quran top ${QURAN_TOP} → ${count('quran')} words`);
console.log(`wordlist: ${all.length} distinct candidates, ${out.length} written to scripts/dictionary/wordlist.json (limit ${LIMIT})`);
console.log(`wordlist: quran top 15: ${quranRanked.slice(0, 15).map(([w, n]) => `${w}(${n})`).join(' ')}`);
