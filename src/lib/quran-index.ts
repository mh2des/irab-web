/**
 * quran-index.ts: ONE decision per ayah page about canonical, indexing and
 * whether the quoted reference may ship inline. The page, the JSON reference
 * endpoint and the surah page all read this so they can never disagree.
 *
 * Background (src/config/seo.ts): on 15-16 Aug 2026 Google stopped ranking the
 * whole domain. ~94% of indexed URLs were ayah pages whose main text is a
 * published book. Stage 1 (25 Aug) noindexed the book-only pages for Google.
 * Stage 2 (2 Sep) removes the book from the HTML of every page Google may
 * still index: the reference loads on demand from /quran-ref/ (robots-blocked)
 * so readers keep it and crawlers see only our own words.
 */
import { INTROS } from '../data/ayah-intros';
import { QURAN_INDEX_MODE } from '../config/seo';
import { surahById, type Ayah } from './quran';

export interface AyahIndexPolicy {
  selfUrl: string;
  headUrl: string;
  canonical: string;
  isHead: boolean;
  shared: boolean;
  /** Backfilled/empty ayah: robots noindex for every engine. */
  thin: boolean;
  hasOwnIntro: boolean;
  /** <meta name="googlebot" content="noindex">: book-only page, Google only. */
  googlebotNoindex: boolean;
  /** True when the quoted reference must NOT be in the HTML (Google may index it). */
  referenceOnDemand: boolean;
}

export function ayahIndexPolicy(ayah: Ayah): AyahIndexPolicy {
  const surah = surahById(ayah.surah)!;
  const selfUrl = `https://irab.app/quran/${surah.slug}/${ayah.ayah}`;
  const headUrl = `https://irab.app/quran/${surah.slug}/${ayah.ayahStart}`;
  const isHead = ayah.ayah === ayah.ayahStart;
  const shared = ayah.ayahStart !== ayah.ayahEnd;
  // A multi-ayah group shares ONE i'rab block. Non-head members canonicalise
  // to the head so ranking flows there instead of to near-duplicate pages.
  const canonical = shared && ayah.isShared && !isHead ? headUrl : selfUrl;
  const thin = ayah.isBackfilled || (!ayah.irab && ayah.words.length === 0);
  const hasOwnIntro = Boolean(INTROS[`${ayah.surah}:${ayah.ayah}`]);
  const originalOnly = QURAN_INDEX_MODE === 'original-only';
  // Google-only gate: a self-canonical page without our own words is noindexed
  // for Google. Members that declare another canonical are left alone (noindex
  // + foreign canonical is contradictory).
  const googlebotNoindex = originalOnly && !thin && canonical === selfUrl && !hasOwnIntro;
  // Anything Google is still allowed to index must not carry the book inline.
  const referenceOnDemand = originalOnly && !thin && !googlebotNoindex;
  return { selfUrl, headUrl, canonical, isHead, shared, thin, hasOwnIntro, googlebotNoindex, referenceOnDemand };
}

/** Surah pages: Google-indexable only when at least one ayah carries our own summary. */
export function surahGooglebotNoindex(surahId: number, ayat: Ayah[]): boolean {
  if (QURAN_INDEX_MODE !== 'original-only') return false;
  return !ayat.some((a) => INTROS[`${surahId}:${a.ayah}`]?.tldr);
}
