/**
 * duroos-progress.ts: which lessons this browser has read, and where it
 * stopped. Kept in localStorage only (no account, nothing sent anywhere), and
 * shared by the Arabic and English editions, since they are the same lessons.
 *
 *   last  set when a lesson page opens
 *   done  set when the reader reaches the end of the lesson
 *
 * Every access fails soft: in a private window the hub simply shows no
 * progress. Also exports fold(), the search normaliser the hub uses on both
 * sides (build-time index and the visitor's query), so the two always agree.
 */
const KEY = 'irab-duroos';

export interface Progress {
  done: string[];
  last?: { slug: string; at: number };
}

export function readProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const done = Array.isArray(raw.done) ? raw.done.filter((s: unknown) => typeof s === 'string') : [];
    const last = raw.last && typeof raw.last.slug === 'string' ? { slug: raw.last.slug, at: Number(raw.last.at) || 0 } : undefined;
    return { done, last };
  } catch {
    return { done: [] };
  }
}

function write(p: Progress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

export function markOpened(slug: string) {
  const p = readProgress();
  p.last = { slug, at: Date.now() };
  write(p);
}

/** Returns true when this call is the one that completed the lesson. */
export function markDone(slug: string): boolean {
  const p = readProgress();
  if (p.done.includes(slug)) return false;
  p.done.push(slug);
  write(p);
  return true;
}

/** Search folding: no diacritics or tatweel, one alif, ta marbuta as ha, alif maqsura as ya. */
export const fold = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ̀-ͯ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ʿ|ʾ|‘|’/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
