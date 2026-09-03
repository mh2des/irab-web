/**
 * en-duroos.ts: which grammar lessons have an English edition.
 *
 * Single source of truth, imported by both the /en/duroos index (to decide
 * what to link) and en-twin.ts (so the language toggle on an Arabic lesson
 * lands on its English twin rather than the index). Publishing a lesson is a
 * one-line change here plus the page file itself.
 */
export const EN_DUROOS = new Set<string>([
  'al-jumla-al-ismiyya',
]);

export const hasEnLesson = (slug: string): boolean => EN_DUROOS.has(slug);
