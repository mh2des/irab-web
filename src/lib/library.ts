/**
 * library.ts — the classical grammar library (same data as the app's i'rab
 * library). The 47-book summary is snapshotted into the repo (src/data/
 * library-books.json) so the index renders at build time with no network
 * dependency; each book's chapters are streamed client-side from the public
 * qamoos.org API (CORS-open), exactly like the mobile app does.
 */
import raw from '../data/library-books.json';

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  category: string; // نحو | صرف | بلاغة | إعراب
  level: string;    // مبتدئ | متوسط | متقدم
  description: string;
  totalChapters: number;
}

export interface BookChapter { id: number; title: string; html: string; }
export interface BookBundle extends BookSummary { chapters: BookChapter[]; }

/** Base URL for the live bundle API (client-side fetch only). */
export const LIBRARY_BASE = 'https://qamoos.org/grammar/data';

/** The bundle URL for a book id (id is Arabic; must be percent-encoded). */
export const bundleUrl = (id: string) => `${LIBRARY_BASE}/bundle/${encodeURIComponent(id)}.json`;

export const BOOKS: BookSummary[] = ((raw as { books: BookSummary[] }).books ?? [])
  .slice()
  .sort((a, b) => b.totalChapters - a.totalChapters);

export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + (b.totalChapters || 0), 0);

/** Category metadata — Arabic source label, English label, and an accent hex
 *  chosen to stay legible on both the light paper and dark coal surfaces. */
export const CATEGORIES = [
  { key: 'نحو',   en: 'Grammar (Naḥw)',     color: '#7C4DFF' },
  { key: 'إعراب', en: "I'rāb (parsing)",    color: '#1F789B' },
  { key: 'بلاغة', en: 'Rhetoric (Balāgha)', color: '#C28A1E' },
  { key: 'صرف',   en: 'Morphology (Ṣarf)',  color: '#C2603C' },
] as const;

export function categoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.key === cat) ?? { key: cat, en: cat, color: '#1F789B' };
}

/** Count of books per category. */
export function categoryCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of BOOKS) out[b.category] = (out[b.category] || 0) + 1;
  return out;
}

const LEVEL_EN: Record<string, string> = {
  'مبتدئ': 'Beginner',
  'متوسط': 'Intermediate',
  'متقدم': 'Advanced',
};
export const levelEn = (lvl: string) => LEVEL_EN[lvl] ?? lvl;
