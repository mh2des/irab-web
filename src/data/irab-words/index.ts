/**
 * irab-words: the «إعراب كلمة» pages (/irab/<slug>).
 *
 * One file per entry under ./entries; adding a file there adds a page, an
 * index card on /irab and a sitemap URL. ORDER below is the reading order on
 * the index (by how often the word is searched, per Google Trends and Search
 * Console, November 2026); an entry not listed there sorts after the listed
 * ones.
 *
 * Why these pages exist: «إعراب <كلمة>» is the largest class of i'rab
 * searches in every Arabic country (the top related queries of «اعراب» are
 * ما، في، من، ان، لا، كان، كل، مع…), and a lesson about a whole chapter does
 * not answer "how do I parse this one word". These pages do, and send the
 * reader to the lesson for the theory and to the analyzer for a sentence.
 */
import type { IrabWord, IrabGroup } from './types';

export type { IrabWord, IrabGroup, IrabEx, IrabUse, IrabRow } from './types';

const modules = import.meta.glob<{ default: IrabWord }>('./entries/*.ts', { eager: true });

const ORDER = [
  // حروف وأدوات
  'ma', 'min', 'fi', 'inna', 'la', 'lam', 'lan', 'hatta', 'idha',
  // أسماء وضمائر وظروف
  'kull', 'maa', 'bayna', 'hadha', 'huwa', 'alladhi', 'kayfa', 'dhu', 'lafz-al-jalala',
  // أفعال
  'kana', 'laysa',
  // أنواع الكلمات
  'al-muthanna', 'jam-al-mudhakkar-al-salim', 'jam-al-muannath-al-salim',
  'al-fil-al-madi', 'al-fil-al-mudari', 'fil-al-amr',
];
const rank = (slug: string) => {
  const i = ORDER.indexOf(slug);
  return i < 0 ? ORDER.length : i;
};

/** Every entry, in index order. */
export const WORDS: IrabWord[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));

export interface WordGroup {
  id: IrabGroup;
  title: string;
  desc: string;
  /** Reuses the site's i'rab case colours, like the lesson chapters. */
  accent: string;
  words: IrabWord[];
}

const GROUP_META: Omit<WordGroup, 'words'>[] = [
  { id: 'huruf', title: 'حروف وأدوات', desc: 'حروف النفي والجر والنصب والجزم والشرط، وما له أكثر من نوع.', accent: 'var(--color-purple)' },
  { id: 'asma', title: 'أسماء وضمائر وظروف', desc: 'كلمات مبنية أو معربة يتغير موقعها من جملة إلى أخرى.', accent: 'var(--color-teal)' },
  { id: 'afal', title: 'أفعال ناسخة', desc: 'أفعال تدخل على المبتدأ والخبر فترفع الأول وتنصب الثاني.', accent: 'var(--color-jazm)' },
  { id: 'abwab', title: 'أنواع الكلمات', desc: 'كيف يُعرب المثنى والجمع السالم والفعل بأزمنته الثلاثة.', accent: 'var(--color-purple)' },
];

/** The index, grouped; a group with no entries yet is left out. */
export const WORD_GROUPS: WordGroup[] = GROUP_META
  .map((g) => ({ ...g, words: WORDS.filter((w) => w.group === g.id) }))
  .filter((g) => g.words.length > 0);

const bySlug = new Map(WORDS.map((w) => [w.slug, w]));

export const wordBySlug = (slug: string): IrabWord | undefined => bySlug.get(slug);

/** Look up entries by slug, skipping any that do not exist (yet). */
export const wordsBySlug = (...slugs: string[]): IrabWord[] =>
  slugs.map((s) => bySlug.get(s)).filter((w): w is IrabWord => Boolean(w));

export const wordHref = (slug: string): string => `/irab/${slug}`;

/** Repo-relative source of an entry: the page's date comes from its git history. */
export const wordFile = (slug: string): string => `src/data/irab-words/entries/${slug}.ts`;

export const accentForWord = (slug: string): string =>
  GROUP_META.find((g) => g.id === bySlug.get(slug)?.group)?.accent ?? 'var(--color-purple)';

/** Cards for LessonLinks' `items`: the word pages on a page that teaches around them. */
export const wordCards = (...slugs: string[]) =>
  wordsBySlug(...slugs).map((w) => ({ href: wordHref(w.slug), title: w.h1, blurb: w.blurb, accent: accentForWord(w.slug) }));

/** Entries that name a /duroos lesson as related: the lesson links back to them. */
export const wordsForLesson = (lessonSlug: string): IrabWord[] =>
  WORDS.filter((w) => w.lessons.includes(lessonSlug));
