/**
 * dictionary.ts: build-time access to the public dictionary entries that back
 * /dictionary/<word> (see docs/dictionary-pages-plan.md).
 *
 * The data file src/data/dictionary/entries.json is produced offline by
 * scripts/dictionary/generate.mjs from the same worker endpoint the
 * interactive المعجم uses, then spot-checked by a human. Nothing here calls a
 * network. With an empty file the site builds zero dictionary pages.
 *
 * Quality gate (isPublishable): an entry ships only when the model was
 * confident, the first reading has a real definition and at least one example.
 * Thin entries are not built at all, so nothing thin can be indexed.
 */
import raw from '../data/dictionary/entries.json';
import type { LessonRef } from './lesson-links';

export interface DictExample {
  text: string;
  source: string | null;
  verified: boolean;
}

export interface DictSense {
  definition: string;
  register?: string | null;
  domain?: string | null;
  source?: string | null;
  examples: DictExample[];
}

export interface DictMorphology {
  plural?: string | null;
  dual?: string | null;
  feminine?: string | null;
  verbal_noun?: string | null;
  active_participle?: string | null;
  passive_participle?: string | null;
  present?: string | null;
  imperative?: string | null;
}

export interface DictVariant {
  /** Fully vocalised reading, e.g. كَتَبَ */
  lemma: string;
  pos: string | null;
  root: string | null;
  pattern: string | null;
  senses: DictSense[];
  translations?: { en?: string[]; fr?: string[] };
  synonyms?: string[];
  antonyms?: string[];
  morphology?: DictMorphology | null;
  derivations?: string[];
}

export interface DictEntry {
  /** Path segment: the undiacritised word as a reader types it (كتب). */
  slug: string;
  /** The word as it was sent to the engine. */
  query: string;
  variants: DictVariant[];
  etymology: string | null;
  /** Model self-reported confidence in [0,1]. */
  confidence: number;
  model?: string;
  /** ISO date of generation. Doubles as dateModified in the page schema. */
  generatedAt: string;
  /** Which candidate lists nominated the word (quran, school, demo, chips). */
  sources: string[];
  /** Set to true by a human after a spot-check. */
  reviewed: boolean;
}

export const ENTRIES = raw as unknown as DictEntry[];

const DIACRITICS = /[ً-ٰٟۖ-ۭ]/g;

/** Strip harakat, tanween and tatweel: كَتَبَ → كتب. Hamza forms are kept. */
export const stripDiacritics = (s: string): string =>
  s.normalize('NFC').replace(DIACRITICS, '').replace(/ـ/g, '').trim();

export const slugFor = (word: string): string => stripDiacritics(word).replace(/\s+/g, ' ');

/** Absolute, percent-encoded canonical URL for an entry. */
export const entryUrl = (e: DictEntry): string =>
  `https://irab.app/dictionary/${encodeURIComponent(e.slug)}`;

const firstSense = (e: DictEntry): DictSense | undefined => e.variants[0]?.senses?.[0];

export function isPublishable(e: DictEntry): boolean {
  if (!e || !e.slug || !Array.isArray(e.variants) || e.variants.length === 0) return false;
  if (typeof e.confidence !== 'number' || e.confidence < 0.5) return false;
  const v = e.variants[0];
  if (!v.lemma || !Array.isArray(v.senses) || v.senses.length === 0) return false;
  const def = firstSense(e)?.definition ?? '';
  if (def.trim().length < 20) return false;
  const examples = e.variants.flatMap((x) => x.senses.flatMap((s) => s.examples ?? []));
  return examples.length >= 1;
}

let cache: DictEntry[] | null = null;
export function publishableEntries(): DictEntry[] {
  if (!cache) {
    const seen = new Set<string>();
    cache = ENTRIES.filter((e) => {
      if (!isPublishable(e) || seen.has(e.slug)) return false;
      seen.add(e.slug);
      return true;
    });
  }
  return cache;
}

// ── Title / description templates ─────────────────────────────────────────
// Title stays under 70 characters; description lands in 150–160 with the
// query phrase ("معنى كلمة X") first, so it survives mobile truncation.

export function entryTitle(e: DictEntry): string {
  const full = `معنى ${e.query} في المعجم: الجذر والإعراب والأمثلة | إعراب`;
  return full.length <= 70 ? full : `معنى ${e.query} في المعجم | إعراب`;
}

function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[،:؛,]$/, '') + '…';
}

export function entryDescription(e: DictEntry): string {
  const head = `معنى كلمة ${e.query} في المعجم: `;
  const tail = ' مع الجذر والوزن والمرادفات وأمثلة فصيحة، وكيف تُعرب في الجملة.';
  const def = (firstSense(e)?.definition ?? '').replace(/\s+/g, ' ').trim();
  const room = 158 - head.length - tail.length;
  let body = cutAtWord(def, Math.max(20, room));
  if (!/[.…!؟]$/.test(body)) body += '.';
  let out = head + body + tail;
  if (out.length < 150) out = out.replace(/\.$/, '') + ' من معجم إعراب الذكي.';
  return out;
}

// ── How the word behaves in i'rab, by part of speech ───────────────────────
// Deterministic grammar, not model output: each line is a general rule for the
// category, hedged where the category admits exceptions, with the lesson that
// teaches it. Unknown pos → no notes.

type PosGroup = 'noun' | 'verb' | 'particle' | 'adverb';

function posGroup(pos: string | null): PosGroup | null {
  if (!pos) return null;
  const p = pos.trim();
  if (p.startsWith('فعل')) return 'verb';
  if (p.startsWith('حرف')) return 'particle';
  if (p.startsWith('ظرف')) return 'adverb';
  if (/^(اسم|صفة|مصدر|صيغة مبالغة|اسم فاعل|اسم مفعول|اسم جمع|اسم آلة|اسم مكان|اسم زمان|اسم تفضيل|اسم علم|اسم إشارة|اسم موصول|ضمير)/.test(p)) return 'noun';
  return null;
}

export function irabNotes(pos: string | null): string[] {
  switch (posGroup(pos)) {
    case 'noun':
      return [
        'اسم معرب في الغالب: يُرفع إذا وقع مبتدأً أو خبرًا أو فاعلًا أو نائب فاعل، ويُنصب إذا وقع مفعولًا به أو حالًا أو تمييزًا أو اسمًا لإنّ، ويُجر إذا سبقه حرف جر أو وقع مضافًا إليه.',
        'علاماته الأصلية الضمة والفتحة والكسرة، وتنوب عنها الحروف في المثنى وجمع المذكر السالم والأسماء الخمسة، وتُجر الممنوعة من الصرف بالفتحة.',
      ];
    case 'verb':
      return [
        'الفعل الماضي مبني على الفتح، وعلى السكون إذا اتصل به ضمير رفع متحرك، وعلى الضم إذا اتصلت به واو الجماعة.',
        'الفعل المضارع معرب: مرفوع ما لم يسبقه ناصب أو جازم، ويُنصب بعد أن ولن وكي، ويُجزم بعد لم ولا الناهية وأدوات الشرط الجازمة. وفعل الأمر مبني.',
      ];
    case 'particle':
      return [
        'الحروف كلها مبنية لا محل لها من الإعراب، ويُذكر في إعرابها عملها: حرف جر، حرف عطف، حرف نصب، حرف جزم، أو حرف مبني لا عمل له.',
      ];
    case 'adverb':
      return [
        'الظرف يُنصب على الظرفية مفعولًا فيه، وقد يُجر بحرف الجر أو يقع مضافًا إليه، وبعض الظروف مبني كحيثُ وإذْ وأمسِ.',
      ];
    default:
      return [];
  }
}

export function lessonsForPos(pos: string | null): LessonRef[] {
  switch (posGroup(pos)) {
    case 'noun':
      return [
        { slug: 'alamat-al-irab', title: 'علامات الإعراب' },
        { slug: 'al-mubtada-wal-khabar', title: 'المبتدأ والخبر' },
        { slug: 'al-fail', title: 'الفاعل' },
        { slug: 'al-maful-bih', title: 'المفعول به' },
      ];
    case 'verb':
      return [
        { slug: 'al-jumla-al-filiyya', title: 'الجملة الفعلية' },
        { slug: 'nasb-al-mudari', title: 'نصب المضارع' },
        { slug: 'jazm-al-mudari', title: 'جزم المضارع' },
      ];
    case 'particle':
      return [
        { slug: 'huruf-al-jarr', title: 'حروف الجر' },
        { slug: 'al-atf', title: 'العطف' },
        { slug: 'inna-wa-akhawatuha', title: 'إنّ وأخواتها' },
      ];
    case 'adverb':
      return [
        { slug: 'al-maful-fih', title: 'المفعول فيه' },
        { slug: 'al-idafa', title: 'الإضافة' },
      ];
    default:
      return [];
  }
}

/** Arabic labels for the morphology table, in display order. */
export const MORPHOLOGY_LABELS: Array<[keyof DictMorphology, string]> = [
  ['plural', 'الجمع'],
  ['dual', 'المثنى'],
  ['feminine', 'المؤنث'],
  ['verbal_noun', 'المصدر'],
  ['active_participle', 'اسم الفاعل'],
  ['passive_participle', 'اسم المفعول'],
  ['present', 'المضارع'],
  ['imperative', 'الأمر'],
];
