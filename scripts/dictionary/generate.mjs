#!/usr/bin/env node
/**
 * generate.mjs: populate src/data/dictionary/entries.json by asking the SAME
 * worker endpoint the interactive المعجم uses (POST /api/dictionary). The
 * worker owns the lexicographer prompt, the sanitiser, the KV cache and the
 * key rotation, so the public pages and the tool can never disagree, and the
 * prompt never has to live in this public repo.
 *
 * SAFETY: this script spends API quota. It refuses to run unless BOTH
 *   --confirm            is passed, and
 *   IRAB_ID_TOKEN        is set (a Firebase ID token of a PREMIUM account, so
 *                        the worker's free 5/day quota does not apply).
 * It never runs from the build. Resume-safe: words already present in
 * entries.json are skipped. Writes after every success.
 *
 * Usage:
 *   IRAB_ID_TOKEN=... node scripts/dictionary/generate.mjs --confirm [--limit 50]
 *       [--words scripts/dictionary/wordlist.json] [--delay 2500] [--dry-run]
 *   IRAB_WORKER overrides the worker base URL.
 *
 * Firebase ID tokens expire after 1 hour; run in batches (--limit) and refresh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const CONFIRM = flag('confirm');
const DRY = flag('dry-run');
const LIMIT = Number(opt('limit', '50'));
const DELAY = Number(opt('delay', '2500'));
const WORDS = path.resolve(root, opt('words', 'scripts/dictionary/wordlist.json'));
const WORKER = process.env.IRAB_WORKER || 'https://irab-api-v2.mansourhassan783.workers.dev';
const TOKEN = process.env.IRAB_ID_TOKEN;
const OUT = path.join(root, 'src/data/dictionary/entries.json');

// Verified 2026-08-25 (ai.google.dev pricing): Gemini 3.1 Flash-Lite
// $0.25 per 1M input tokens, $1.50 per 1M output tokens. Used only for the
// running estimate printed at the end; the worker's keys are what is billed.
const PRICE_IN = 0.25 / 1e6;
const PRICE_OUT = 1.5 / 1e6;

if (!fs.existsSync(WORDS)) {
  console.error(`No word list at ${WORDS}. Run: node scripts/dictionary/wordlist.mjs`);
  process.exit(1);
}
const list = JSON.parse(fs.readFileSync(WORDS, 'utf8'));
const entries = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
const have = new Set(entries.map((e) => e.slug));
const todo = list.filter((w) => !have.has(w.word)).slice(0, LIMIT);

console.log(`generate: ${entries.length} entries present, ${list.length} candidates, ${todo.length} to request (limit ${LIMIT})`);
if (DRY) {
  console.log(todo.map((w) => `${w.word} [${w.sources.join(',')}]`).join('\n'));
  process.exit(0);
}
if (!CONFIRM || !TOKEN) {
  console.error('Refusing to run: pass --confirm AND set IRAB_ID_TOKEN (premium Firebase ID token). Use --dry-run to list.');
  process.exit(2);
}

const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;
const strip = (s) => s.normalize('NFC').replace(DIACRITICS, '').replace(/ـ/g, '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(word) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${WORKER}/api/dictionary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ word }),
    });
    if (res.status === 429) throw new Error('quota (429): stop and retry later or use a premium token');
    if (res.status === 401 || res.status === 403) throw new Error(`auth (${res.status}): token expired or not accepted`);
    if (res.ok) return res.json();
    if (attempt < 2 && [500, 502, 503, 504].includes(res.status)) { await sleep(1500 * (attempt + 1)); continue; }
    throw new Error(`HTTP ${res.status}`);
  }
}

const ok = [], empty = [], failed = [];
let tokIn = 0, tokOut = 0;
for (const w of todo) {
  const word = w.word;
  try {
    const json = await lookup(word);
    const data = json?.data ?? json;
    const variants = Array.isArray(data?.variants) ? data.variants : [];
    const conf = typeof data?.confidence === 'number' ? data.confidence : 0;
    const u = json?._usage;
    if (u) { tokIn += u.promptTokenCount ?? 0; tokOut += u.candidatesTokenCount ?? 0; }
    if (variants.length === 0 || conf <= 0.2) { empty.push(word); console.log(`  ${word}: empty/low confidence (${conf})`); }
    else {
      entries.push({
        slug: strip(word), query: word, variants, etymology: data.etymology ?? null,
        confidence: conf, model: data.model ?? json?.model ?? null,
        generatedAt: new Date().toISOString(), sources: w.sources, reviewed: false,
      });
      fs.writeFileSync(OUT, JSON.stringify(entries, null, 2) + '\n');
      ok.push(word);
      console.log(`  ${word}: ${variants.length} reading(s), confidence ${conf}${json?.source === 'cache' ? ' (cache)' : ''}`);
    }
  } catch (e) {
    failed.push(word); console.error(`  ${word}: ${e.message}`);
    if (/quota|auth/.test(e.message)) break;
  }
  await sleep(DELAY);
}

const cost = tokIn * PRICE_IN + tokOut * PRICE_OUT;
console.log(`generate: ok ${ok.length}, empty ${empty.length}, failed ${failed.length}; tokens in ${tokIn} out ${tokOut}; est. $${cost.toFixed(3)} at list price`);
if (empty.length) console.log(`generate: empty → ${empty.join(' ')}`);
if (failed.length) console.log(`generate: failed → ${failed.join(' ')}`);
