/**
 * en-twin.ts: build-time map from an Arabic path to the closest EXISTING
 * English page. The Nav language toggle used to mint /en/<path> blindly,
 * which 404'd on the ~4,500 Arabic-only Quran pages and the AR-only static
 * pages — thousands of crawlable dead links. Fallback ladder for Quran
 * routes: exact EN twin → EN surah index → /en/quran.
 */
import { hasEnAyah, enSurahIds } from './quran-en';
import { SURAHS } from './quran';

// Static routes that exist under /en (mirrors src/pages/en/*).
const EN_STATIC = new Set([
  '/', '/irab', '/nahw', '/quran-parser', '/teachers', '/tool',
  '/practice', '/practice/play', '/challenges', '/dictionary',
  '/library', '/library/read', '/login', '/account', '/app', '/history',
  '/quran',
]);

const slugToId = new Map(SURAHS.map((s) => [s.slug, s.id]));
const EN_SURAH_IDS = new Set(enSurahIds());

/** Best existing English URL for an Arabic path (never a 404). */
export function enTwinFor(arPath: string): string {
  const path = arPath.replace(/\/$/, '') || '/';

  const quran = path.match(/^\/quran\/([^/]+)(?:\/(\d+))?$/);
  if (quran) {
    const [, slug, ayah] = quran;
    const surahId = slugToId.get(slug);
    if (!surahId || !EN_SURAH_IDS.has(surahId)) return '/en/quran';
    if (ayah && !hasEnAyah(surahId, Number(ayah))) return `/en/quran/${slug}`;
    return `/en${path}`;
  }

  if (EN_STATIC.has(path)) return path === '/' ? '/en' : `/en${path}`;
  return '/en';
}
