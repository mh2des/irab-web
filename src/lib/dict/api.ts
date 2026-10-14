/**
 * The dictionary's door to the Worker: POST /api/dictionary, the app's own
 * endpoint and allowance (signed-in only), and today's searches left from
 * /api/usage. A v3 entry is generated once and served from the store after.
 */
import { WORKER } from '../irab/api';

export interface DictExample { text: string; translation_en?: string | null }
export interface DictSense { definition: string; register?: string | null; domain?: string | null; examples?: DictExample[] }
export interface DictIrab { gender?: string | null; declension?: string | null; transitivity?: string | null; prepositions?: string[]; note?: string | null }
export interface DictVariant {
  lemma: string;
  pos?: string | null;
  root?: string | null;
  pattern?: string | null;
  senses: DictSense[];
  translations?: { en?: string[]; fr?: string[] };
  synonyms?: string[];
  antonyms?: string[];
  morphology?: Record<string, string | null> | null;
  irab?: DictIrab | null;
  collocations?: { text: string; meaning?: string }[];
  common_mistakes?: { wrong?: string; right: string; why?: string }[];
  nuance?: string | null;
  derivations?: string[];
}
export interface QuranRef { s: number; a: number; slug: string; token?: string; analysis?: string }
export interface DictEntry {
  query?: string;
  variants: DictVariant[];
  root_family?: { word: string; gloss?: string }[];
  etymology?: string | { notes?: string } | null;
  quran?: { n: number; refs?: QuranRef[] } | null;
  classical?: { count: number; entries?: { dictionary?: string; headword?: string; text: string }[] } | null;
  meta?: { verified?: boolean } | null;
}

export type Lookup =
  | { kind: 'found'; entry: DictEntry; source: 'cache' | 'generated' | string }
  | { kind: 'not_found' }
  | { kind: 'limit' }
  | { kind: 'session' }
  | { kind: 'failed' };

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v.filter((x) => x != null) as T[] : []);

/** The response as the page draws it: readings with senses only; a v2 entry (no variants) as one reading. */
export function toEntry(raw: any): DictEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  let variants = arr<DictVariant>(raw.variants).filter((v) => v && typeof v === 'object' && arr(v.senses).length > 0);
  if (!variants.length && arr(raw.senses).length > 0) variants = [raw as DictVariant];
  if (!variants.length) return null;
  return { ...raw, variants };
}

export async function lookup(word: string, idToken: string): Promise<Lookup> {
  let res: Response;
  try {
    res = await fetch(`${WORKER}/api/dictionary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ word }),
    });
  } catch {
    return { kind: 'failed' };
  }
  if (res.status === 429) return { kind: 'limit' };
  if (res.status === 401) return { kind: 'session' };
  if (!res.ok) return { kind: 'failed' };
  const json = await res.json().catch(() => null);
  if (!json) return { kind: 'failed' };
  if (json.data === null) return { kind: 'not_found' };
  const entry = toEntry(json.data ?? json);
  return entry ? { kind: 'found', entry, source: json.source ?? '' } : { kind: 'not_found' };
}

/** Searches left today (null: unknown; Infinity: Irab+). */
export async function searchesLeft(idToken: string): Promise<number | null> {
  try {
    const res = await fetch(`${WORKER}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: '{}',
    });
    if (!res.ok) return null;
    const d = (await res.json())?.data;
    if (d?.isPremium) return Infinity;
    const u = d?.usage?.smartDictionary;
    return u && typeof u.remaining === 'number' && u.limit > 0 ? Math.max(0, u.remaining) : null;
  } catch {
    return null;
  }
}
