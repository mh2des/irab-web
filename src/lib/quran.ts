/**
 * quran.ts — build-time data access + i'rab content rendering for the
 * Quran-i'rab section. Reads the exported JSON (see scripts/export-quran.mjs);
 * no DB at build, no runtime JS shipped.
 */
import pilot from '../data/quran-pilot.json';
import surahs from '../data/surahs.json';
import { CASE_COLORS, type WordCase } from '../data/demo-examples';

export interface AyahWord {
  position: number;
  token: string;
  analysis: string;
  case: WordCase | null;
}

export interface Footnote {
  marker: string;
  content: string;
}

export interface Ayah {
  surah: number;
  ayah: number;
  groupId: number;
  ayahStart: number;
  ayahEnd: number;
  isShared: boolean;
  isBackfilled: boolean;
  uthmani: string;
  jadwal: string;
  irab: string | null;
  words: AyahWord[];
  sarf: string | null;
  balagha: string | null;
  fawaid: string | null;
  footnotes: Footnote[];
}

export interface SurahMeta {
  id: number;
  name: string;
  ayahCount: number;
  slug: string;
  en: string;
  place: 'makki' | 'madani';
  publishedCount: number;
}

export const SURAHS = surahs as SurahMeta[];
export const AYAT = pilot.ayat as Ayah[];

const bySlug = new Map(SURAHS.map((s) => [s.slug, s]));
const byId = new Map(SURAHS.map((s) => [s.id, s]));

export const surahBySlug = (slug: string): SurahMeta | undefined => bySlug.get(slug);
export const surahById = (id: number): SurahMeta | undefined => byId.get(id);

export const getAyah = (surah: number, ayah: number): Ayah | undefined =>
  AYAT.find((a) => a.surah === surah && a.ayah === ayah);

export const ayatOfSurah = (surah: number): Ayah[] =>
  AYAT.filter((a) => a.surah === surah).sort((a, b) => a.ayah - b.ayah);

export const isPublished = (surah: number, ayah: number): boolean => !!getAyah(surah, ayah);

// ── Numerals ────────────────────────────────────────────────────────────────
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const toArabicDigits = (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
const onlyDigits = (s: string): string =>
  (s || '').replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[^0-9]/g, '');

export const caseHex = (c: WordCase | null): string | null =>
  c && CASE_COLORS[c] ? CASE_COLORS[c].hex : null;

// ── i'rab content → semantic HTML (build-time, sanitized) ────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Bold the parenthesised token being parsed; linkify [N] only if the footnote
 *  exists for this group (orphan markers — the common case — stay literal). */
function inlineFormat(escaped: string, markers: Set<string>): string {
  let s = escaped.replace(/\(([^()]{1,80})\)/g, (_m, g) => `<b class="tok">${g}</b>`);
  s = s.replace(/\[(\d+)\]/g, (m, n: string) =>
    markers.has(n) ? `<sup class="fn"><a href="#fn-${n}">${toArabicDigits(n)}</a></sup>` : m
  );
  return s;
}

/** Render an i'rab/sarf/balagha/fawaid `content` string to HTML.
 *  `### x` → <h3>, blank lines → paragraphs, (token) → bold, [N] → footnote. */
export function renderIrab(content: string | null, footnotes: Footnote[] = []): string {
  if (!content) return '';
  const markers = new Set(footnotes.map((f) => onlyDigits(f.marker)).filter(Boolean));
  const blocks = content.split(/\n\s*\n/);
  const out: string[] = [];
  for (const raw of blocks) {
    const t = raw.trim();
    if (!t) continue;
    if (/^#{2,}\s*/.test(t)) {
      out.push(`<h3>${inlineFormat(esc(t.replace(/^#+\s*/, '')), markers)}</h3>`);
    } else {
      out.push(`<p>${inlineFormat(esc(t.replace(/\n+/g, ' ')), markers)}</p>`);
    }
  }
  return out.join('');
}

/** Plain (tag-free) ayah text for meta descriptions: tashkeel kept, ornaments
 *  stripped, collapsed whitespace. */
export const plainVerse = (s: string): string =>
  s.replace(/[۝۞࣢]/g, '').replace(/\s+/g, ' ').trim();
