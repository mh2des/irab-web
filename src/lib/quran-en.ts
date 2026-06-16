/**
 * quran-en.ts — build-time access to the GENERATED English i'rab content
 * (src/data/quran-en.json). This is ORIGINAL English grammatical analysis
 * produced from the Quran text + factual grammar anchors — NOT a translation
 * of الجدول (which is copyrighted). Pairs with quran.ts for surah metadata.
 */
import data from '../data/quran-en.json';
import { caseHex, surahById, type SurahMeta } from './quran';

export interface EnWord {
  token: string;     // the Arabic word
  case_en: string;   // English case (genitive / nominative / accusative / jussive / indeclinable)
  role_en: string;   // syntactic role
  note_en: string;   // one-line English explanation
}

export interface AyahEn {
  surah: number;
  ayah: number;
  uthmani: string;
  h1_en: string;
  tldr_en: string;
  translation_en: string;
  transliteration: string;
  words_en: EnWord[];
  irab_en: string;
  faqs_en: { q: string; a: string }[];
}

export const AYAT_EN = data as unknown as Record<string, AyahEn>;
export const EN_KEYS = new Set(Object.keys(AYAT_EN));

export const enEntries = (): AyahEn[] => Object.values(AYAT_EN);
export const getAyahEn = (surah: number, ayah: number): AyahEn | undefined => AYAT_EN[`${surah}:${ayah}`];
export const hasEnAyah = (surah: number, ayah: number): boolean => EN_KEYS.has(`${surah}:${ayah}`);

/** Surah ids that have at least one English ayah, in order. */
export const enSurahIds = (): number[] =>
  [...new Set(enEntries().map((a) => a.surah))].sort((x, y) => x - y);

/** English ayat of a surah, ordered. */
export const enAyatOfSurah = (surah: number): AyahEn[] =>
  enEntries().filter((a) => a.surah === surah).sort((a, b) => a.ayah - b.ayah);

export const enSurahs = (): SurahMeta[] =>
  enSurahIds().map((id) => surahById(id)!).filter(Boolean);

// English case word → the WordCase key used by the shared color map.
const EN_TO_CASE: Record<string, string> = {
  genitive: 'majrur',
  nominative: 'marfu',
  accusative: 'mansub',
  jussive: 'jazm',
  indeclinable: 'mabni',
};

/** Hex color for an English case label (reuses the site's case palette). */
export const enCaseHex = (caseEn: string): string | null => {
  const k = (caseEn || '').toLowerCase();
  for (const en in EN_TO_CASE) {
    if (k.includes(en)) return caseHex(EN_TO_CASE[en] as never);
  }
  return null;
};
