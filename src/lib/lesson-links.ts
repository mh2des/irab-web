/**
 * lesson-links.ts: build-time cross-links between the /duroos lessons and the
 * Quran i'rab pages.
 *
 * The book's i'rab of every ayah names the constructions it contains ("اسم إنّ",
 * "نائب فاعل", "مفعول مطلق"...). We read those names and map them to the lesson
 * that teaches each construction, in both directions:
 *
 *   lessonsForAyah(ayah)  → the (up to three) lessons worth reading for this ayah
 *   ayatForLesson(slug)   → a handful of ayat that demonstrate the lesson's rule
 *
 * Why this exists (2026-08): the ayah pages were 94% of the site's URLs and,
 * apart from an authored TL;DR on ~470 of them, carried nothing of our own.
 * These links turn the corpus into part of a teaching structure (lesson →
 * examples → full i'rab → lesson) instead of a reprint, and give every ayah
 * page a block that is ours.
 *
 * Detection is deliberately conservative: a lesson is attached only when the
 * i'rab text uses the construction's own technical name. No i'rab is inferred.
 */
import { AYAT, surahById, plainVerse, type Ayah } from './quran';
import { INTROS } from '../data/ayah-intros';

export interface LessonRef {
  slug: string;
  title: string;
}

export interface AyahRef {
  surahSlug: string;
  surahName: string;
  ayah: number;
  verse: string;
}

interface Rule extends LessonRef {
  /** How diagnostic the construction is: rare, specific chapters outrank the
   *  ones almost every ayah contains, so the lessons shown are worth a click. */
  weight: number;
  re: RegExp;
}

// JS `\b` only knows ASCII word characters, so Arabic needs explicit letter
// boundaries. Diacritics (U+064B..U+0652) are allowed on either side.
const L = '\\u0621-\\u064A';
const word = (s: string) => new RegExp(`(?<![${L}])(?:${s})(?![${L}])`);

const RULES: Rule[] = [
  { slug: 'la-nafiya-lil-jins', title: 'لا النافية للجنس', weight: 10, re: /نافية للجنس/ },
  { slug: 'al-tamyiz', title: 'التمييز', weight: 9, re: word('تمييز') },
  { slug: 'al-maful-al-mutlaq', title: 'المفعول المطلق', weight: 9, re: /مفعول مطلق/ },
  { slug: 'al-maful-li-ajlih', title: 'المفعول لأجله', weight: 9, re: word('مفعول لأجله|مفعول له') },
  { slug: 'al-istithna', title: 'الاستثناء', weight: 9, re: /مستثنى|أداة استثناء/ },
  { slug: 'al-munada', title: 'المنادى', weight: 8, re: /منادى/ },
  { slug: 'al-mamnu-min-al-sarf', title: 'الممنوع من الصرف', weight: 8, re: /ممنوع من الصرف|لا ينصرف/ },
  { slug: 'al-asma-al-khamsa', title: 'الأسماء الخمسة', weight: 8, re: /الأسماء الخمسة|الأسماء الستة/ },
  { slug: 'al-tawkid', title: 'التوكيد', weight: 8, re: /توكيد (?:لفظي|معنوي)/ },
  { slug: 'al-badal', title: 'البدل', weight: 7, re: word('بدل') },
  { slug: 'al-hal', title: 'الحال', weight: 7, re: word('حال') },
  { slug: 'naib-al-fail', title: 'نائب الفاعل', weight: 7, re: /نائب (?:ال)?فاعل/ },
  {
    slug: 'inna-wa-akhawatuha', title: 'إنّ وأخواتها', weight: 6,
    re: word('(?:اسم|خبر) (?:إنّ?|أنّ?|كأنّ?|لكنّ?|ليت|لعلّ?)'),
  },
  {
    slug: 'kana-wa-akhawatuha', title: 'كان وأخواتها', weight: 6,
    re: word('(?:اسم|خبر) (?:كان|كانت|ليس|أصبح|أمسى|ظلّ?|بات|صار|ما ?زال|ما ?دام)'),
  },
  { slug: 'uslub-al-shart', title: 'أسلوب الشرط', weight: 6, re: /فعل الشرط|جواب الشرط|أداة شرط|اسم شرط/ },
  { slug: 'jazm-al-mudari', title: 'جزم المضارع', weight: 5, re: /مجزوم|حرف جزم|جازم/ },
  { slug: 'nasb-al-mudari', title: 'نصب المضارع', weight: 5, re: /مضارع منصوب|منصوب بأن|منصوب بلن/ },
  { slug: 'al-afal-al-khamsa', title: 'الأفعال الخمسة', weight: 5, re: /الأفعال الخمسة|ثبوت النون|حذف النون/ },
  { slug: 'al-asma-al-mawsula', title: 'الأسماء الموصولة', weight: 5, re: /اسم موصول/ },
  { slug: 'al-maful-fih', title: 'المفعول فيه', weight: 5, re: /مفعول فيه|ظرف (?:زمان|مكان)/ },
  { slug: 'al-atf', title: 'العطف', weight: 3, re: /معطوف|حرف عطف/ },
  { slug: 'al-idafa', title: 'الإضافة', weight: 3, re: /مضاف إليه/ },
  { slug: 'huruf-al-jarr', title: 'حروف الجر', weight: 3, re: word('حرف جر|اسم مجرور') },
  { slug: 'al-damair', title: 'الضمائر', weight: 2, re: /ضمير (?:متصل|منفصل|مستتر)/ },
  { slug: 'al-maful-bih', title: 'المفعول به', weight: 2, re: /مفعول به/ },
  // A subject, but not the participle (اسم فاعل) and not نائب الفاعل.
  { slug: 'al-fail', title: 'الفاعل', weight: 2, re: new RegExp(`(?<!نائب )(?<!نائب ال)(?<!اسم )(?<![${L}])فاعل(?![${L}])`) },
  { slug: 'al-mubtada-wal-khabar', title: 'المبتدأ والخبر', weight: 2, re: word('مبتدأ') },
];

/** Lessons that teach what this ayah's i'rab contains, most specific first. */
export function lessonsForAyah(a: Ayah, max = 3): LessonRef[] {
  const text = a.irab ?? '';
  if (!text) return [];
  return RULES.filter((r) => r.re.test(text))
    .sort((x, y) => y.weight - x.weight)
    .slice(0, max)
    .map(({ slug, title }) => ({ slug, title }));
}

const byLesson = new Map<string, AyahRef[]>();

/**
 * Ayat that demonstrate a lesson's construction. Prefers ayat with an authored
 * intro (they are the indexed ones and the richest pages), then verses of a
 * readable length, and spreads the picks across surahs so the examples read
 * across the Quran rather than down one chapter. Group members that canonical
 * to a head ayah and backfilled ayat are skipped.
 */
export function ayatForLesson(slug: string, max = 6): AyahRef[] {
  const cached = byLesson.get(slug);
  if (cached) return cached.slice(0, max);
  const rule = RULES.find((r) => r.slug === slug);
  if (!rule) return [];

  const candidates = AYAT.filter(
    (a) => a.irab && !a.isBackfilled && !(a.isShared && a.ayah !== a.ayahStart) && rule.re.test(a.irab),
  );
  const score = (a: Ayah) =>
    (INTROS[`${a.surah}:${a.ayah}`] ? 0 : 1000) + Math.abs(plainVerse(a.uthmani).length - 70);
  candidates.sort((x, y) => score(x) - score(y) || x.surah - y.surah || x.ayah - y.ayah);

  const picked: Ayah[] = [];
  const seenSurah = new Set<number>();
  for (const a of candidates) {
    if (picked.length >= max) break;
    if (seenSurah.has(a.surah)) continue;
    seenSurah.add(a.surah);
    picked.push(a);
  }
  for (const a of candidates) {
    if (picked.length >= max) break;
    if (!picked.includes(a)) picked.push(a);
  }

  const refs = picked.map((a) => {
    const s = surahById(a.surah)!;
    return { surahSlug: s.slug, surahName: s.name, ayah: a.ayah, verse: plainVerse(a.uthmani) };
  });
  byLesson.set(slug, refs);
  return refs;
}
