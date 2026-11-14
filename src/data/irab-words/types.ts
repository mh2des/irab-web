/**
 * types.ts: the shape of one «إعراب كلمة» page (/irab/<slug>).
 *
 * These pages answer the most common way people search for i'rab: by the
 * word itself («إعراب ما», «إعراب كان», «إعراب مع») or by a kind of word
 * («إعراب المثنى», «إعراب الفعل المضارع»). Each entry lives in its own file
 * under ./entries so the page's "last updated" date and its sitemap lastmod
 * are the git date of that one file.
 *
 * All strings are plain text (no HTML). Example sentences are fully
 * vocalised; a Quranic quote is written between ﴿ ﴾ and carries `ref`, which
 * scripts/check-irab-words.mjs matches against the corpus after a build.
 */

/** One row of an analysis: the word, then its i'rab. */
export type IrabRow = [word: string, irab: string];

export interface IrabEx {
  /** The vocalised sentence. */
  ar: string;
  /** 'surah:ayah' when the sentence is a Quranic quote. */
  ref?: string;
  /** Word-by-word analysis, laid out like the analyzer's result. */
  rows: IrabRow[];
  /** Chip over the example. Quranic examples get surah and ayah automatically. */
  label?: string;
}

export interface IrabUse {
  /** Section anchor, Latin. */
  id: string;
  /** Section heading. */
  title: string;
  /** The rule, in one or two sentences. */
  rule: string;
  examples: IrabEx[];
  /** Paragraphs after the examples. */
  notes?: string[];
}

export type IrabGroup = 'huruf' | 'asma' | 'afal' | 'abwab';

export interface IrabWord {
  slug: string;
  group: IrabGroup;
  /** The word or topic as a reader types it, undiacritised: ما، كان، المثنى. */
  name: string;
  /** <title>, at most 70 characters with the brand suffix. */
  title: string;
  /** Meta description, 150 to 165 characters, query phrase first. */
  description: string;
  h1: string;
  /** One line on the index card. */
  blurb: string;
  /** The direct answer: the first thing a reader or an answer engine meets. */
  answer: string;
  summary: string;
  /** Lead of the quick table. */
  quickLead: string;
  /** The quick table: case, then how it is parsed. */
  quick: IrabRow[];
  uses: IrabUse[];
  /** How to tell which case a sentence has. */
  stepsTitle?: string;
  stepsLead?: string;
  steps?: string[];
  mistakesLead: string;
  mistakes: string[];
  faqs: { q: string; a: string }[];
  /** Related /duroos lessons, by slug. */
  lessons: string[];
  /** Related entries, by slug. */
  related?: string[];
}
