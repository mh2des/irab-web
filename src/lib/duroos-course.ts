/**
 * duroos-course.ts: the grammar course as one shape for both languages.
 *
 * The Arabic and English editions keep their own curricula (src/data/duroos.ts
 * and src/lib/en-duroos.ts, which order two lessons differently), so nothing
 * here re-orders anything. This module only numbers them, adds the one-line
 * chapter descriptions the lessons hub shows, and answers "where does this
 * lesson sit": its chapter, its place in the course, its neighbours.
 *
 * Chapter descriptions are written from the lessons each chapter holds; keep
 * them in step when a lesson moves.
 */
import { LESSON_GROUPS } from '../data/duroos';
import { EN_GROUPS, EN_DUROOS } from './en-duroos';

export type Lang = 'ar' | 'en';

export interface CourseLesson {
  slug: string;
  title: string;
  blurb: string;
  no: number;        // 1-based position in the whole course
  chapter: number;   // 1-based chapter index
  href: string;
}
export interface CourseChapter {
  no: number;
  title: string;
  desc: string;
  accent: string;
  lessons: CourseLesson[];
}

/** One line per chapter, in curriculum order. */
const DESC: Record<Lang, string[]> = {
  ar: [
    'ركنا الجملة الاسمية والجملة الفعلية، وما يُرفع فيهما.',
    'أربعة منصوبات: ما وقع عليه الفعل، ومصدره، وسببه، وزمانه ومكانه.',
    'الحركات والحروف التي يُعرب بها الكلام، وما ينوب منها عن الأصل.',
    'أفعال وحروف تدخل على المبتدأ والخبر فتغيّر إعرابهما.',
    'الحال والتمييز والمنادى والمستثنى، وأحكام العدد والمعدود.',
    'ما يتبع ما قبله في إعرابه: النعت والعطف والبدل والتوكيد.',
    'المجرور بالإضافة وبالحرف، ونصب المضارع وجزمه، وأسلوب الشرط.',
    'الضمائر والأسماء الموصولة وأسماء الإشارة: بناؤها ومحلها من الإعراب.',
    'تعريف الاسم وتنكيره، وأقسامه بحسب آخره.',
    'الاستفهام والتعجب والمدح والذم: أدواتها وإعرابها.',
  ],
  en: [
    'The nominal and the verbal sentence, and the nominatives that hold them up.',
    'Four accusatives: what the verb falls on, its verbal noun, its reason, its time and place.',
    'The vowels and letters that carry case, and which stand in for which.',
    'Verbs and particles that enter on a subject and predicate and change the case of one or both.',
    'The ḥāl, the specifier, exception and the vocative, and annexation.',
    'Words that take the case of the word before them.',
    'Prepositions, the subjunctive and the jussive, conditionals and numbers.',
    'Pronouns, demonstratives and relatives: built forms and their positions.',
    'Definite and indefinite nouns, and the nouns named for their final letter.',
    'Questions, wonder, praise and blame: their particles and their parsing.',
  ],
};

const build = (lang: Lang): CourseChapter[] => {
  const groups = lang === 'en' ? EN_GROUPS : LESSON_GROUPS;
  const base = lang === 'en' ? '/en/duroos/' : '/duroos/';
  let n = 0;
  return groups.map((g, gi) => ({
    no: gi + 1,
    title: g.title,
    desc: DESC[lang][gi] ?? '',
    accent: g.accent,
    lessons: g.lessons.map((l) => ({
      slug: l.slug, title: l.title, blurb: l.blurb,
      no: ++n, chapter: gi + 1, href: base + l.slug,
    })),
  }));
};

const CACHE: Partial<Record<Lang, CourseChapter[]>> = {};
export const course = (lang: Lang): CourseChapter[] => (CACHE[lang] ??= build(lang));
export const courseLessons = (lang: Lang): CourseLesson[] => course(lang).flatMap((c) => c.lessons);

/** True when the lesson has a page in that language. */
export const isLive = (lang: Lang, slug: string): boolean => (lang === 'ar' ? true : EN_DUROOS.has(slug));

export interface LessonPlace {
  lesson: CourseLesson;
  chapter: CourseChapter;
  total: number;
  prev?: CourseLesson;
  next?: CourseLesson;
}

export function placeOf(lang: Lang, slug: string): LessonPlace | undefined {
  const all = courseLessons(lang);
  const i = all.findIndex((l) => l.slug === slug);
  if (i < 0) return undefined;
  const lesson = all[i];
  const chapter = course(lang)[lesson.chapter - 1];
  const prev = all.slice(0, i).reverse().find((l) => isLive(lang, l.slug));
  const next = all.slice(i + 1).find((l) => isLive(lang, l.slug));
  return { lesson, chapter, total: all.length, prev, next };
}

/** Western digits for English, Arabic-Indic for Arabic. */
export const num = (lang: Lang, n: number | string, pad = 0): string => {
  const s = String(n).padStart(pad, '0');
  return lang === 'en' ? s : s.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
};

/**
 * Arabic counted noun with the right agreement: forms are
 * [one, two, three-to-ten, eleven-and-up, the bare noun for 1].
 */
export const arCount = (n: number, f: [string, string, string, string]): string => {
  const d = num('ar', n);
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  const m = n % 100;
  if (m >= 3 && m <= 10) return `${d} ${f[2]}`;
  return `${d} ${f[3]}`;
};
