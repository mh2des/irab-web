/**
 * duroos.ts: the single source of truth for the grammar lessons.
 *
 * Every entry has a page at src/pages/duroos/<slug>.astro; keep the two in
 * step when adding a lesson. Lives here rather than inside the hub page so
 * that any page can link into the lessons: on 2026-09-06 Search Console
 * showed the hub and all 40 lessons as "Discovered - currently not indexed"
 * (never crawled), because the only page linking to them in volume was the
 * hub itself, which Google had never fetched. Prose pages that teach the
 * same topic now link the lessons directly.
 *
 * Group accents reuse the site's i'rab case colors (marfu purple, majrur
 * teal, jazm warm gold): meaningful color, not decoration.
 */
export interface Lesson {
  slug: string;
  title: string;
  blurb: string;
}
export interface LessonGroup {
  title: string;
  accent: string;
  lessons: Lesson[];
}

export const LESSON_GROUPS: LessonGroup[] = [
  {
    title: 'الجملة وأركانها',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-jumla-al-ismiyya', title: 'الجملة الاسمية', blurb: 'ركناها وأحكامها وصور الخبر' },
      { slug: 'al-mubtada-wal-khabar', title: 'المبتدأ والخبر', blurb: 'أنواعهما وحالات الرفع' },
      { slug: 'al-jumla-al-filiyya', title: 'الجملة الفعلية', blurb: 'الفعل والفاعل والمفعول وترتيبها' },
      { slug: 'al-fail', title: 'الفاعل', blurb: 'أحكامه الأربعة وصوره' },
      { slug: 'naib-al-fail', title: 'نائب الفاعل', blurb: 'البناء للمجهول وأحكامه' },
    ],
  },
  {
    title: 'المفاعيل',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'al-maful-bih', title: 'المفعول به', blurb: 'علامات نصبه وتقديمه وتأخيره' },
      { slug: 'al-maful-al-mutlaq', title: 'المفعول المطلق', blurb: 'أنواعه الثلاثة وما ينوب عنه' },
      { slug: 'al-maful-li-ajlih', title: 'المفعول لأجله', blurb: 'شروط نصبه وأحواله' },
      { slug: 'al-maful-fih', title: 'المفعول فيه', blurb: 'ظرف الزمان وظرف المكان' },
    ],
  },
  {
    title: 'علامات الإعراب',
    accent: 'var(--color-jazm)',
    lessons: [
      { slug: 'alamat-al-irab', title: 'علامات الإعراب', blurb: 'الأصلية والفرعية وما ينوب عن ماذا' },
      { slug: 'al-afal-al-khamsa', title: 'الأفعال الخمسة', blurb: 'ثبوت النون وحذفها' },
      { slug: 'al-asma-al-khamsa', title: 'الأسماء الخمسة', blurb: 'شروط إعرابها بالحروف' },
      { slug: 'al-mamnu-min-al-sarf', title: 'الممنوع من الصرف', blurb: 'أسبابه وجرّه بالفتحة' },
    ],
  },
  {
    title: 'النواسخ',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'kana-wa-akhawatuha', title: 'كان وأخواتها', blurb: 'عملها واسمها وخبرها' },
      { slug: 'inna-wa-akhawatuha', title: 'إنّ وأخواتها', blurb: 'عملها وكسر الهمزة وفتحها' },
      { slug: 'la-nafiya-lil-jins', title: 'لا النافية للجنس', blurb: 'عملها وشروطها ولا إله إلا الله' },
      { slug: 'zanna-wa-akhawatuha', title: 'ظنّ وأخواتها', blurb: 'أفعال القلوب والتحويل والمفعولان' },
      { slug: 'kada-wa-akhawatuha', title: 'كاد وأخواتها', blurb: 'المقاربة والرجاء والشروع' },
    ],
  },
  {
    title: 'المنصوبات والأساليب',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'al-hal', title: 'الحال', blurb: 'أنواعها وصاحب الحال' },
      { slug: 'al-tamyiz', title: 'التمييز', blurb: 'تمييز الذات وتمييز النسبة' },
      { slug: 'al-munada', title: 'المنادى', blurb: 'أنواعه الخمسة وبناؤه ونصبه' },
      { slug: 'al-istithna', title: 'الاستثناء', blurb: 'إلا وغير وأحكام المستثنى' },
      { slug: 'al-adad', title: 'العدد', blurb: 'التذكير والتأنيث وتمييز العدد' },
    ],
  },
  {
    title: 'التوابع',
    accent: 'var(--color-jazm)',
    lessons: [
      { slug: 'al-naat', title: 'النعت', blurb: 'الحقيقي والسببي والمطابقة' },
      { slug: 'al-atf', title: 'العطف', blurb: 'حروفه ومعانيها وإعراب المعطوف' },
      { slug: 'al-badal', title: 'البدل', blurb: 'أنواعه الثلاثة وإعرابه' },
      { slug: 'al-tawkid', title: 'التوكيد', blurb: 'اللفظي والمعنوي وألفاظه' },
    ],
  },
  {
    title: 'الجر والمضارع',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-idafa', title: 'الإضافة', blurb: 'المعنوية واللفظية والمضاف إليه' },
      { slug: 'huruf-al-jarr', title: 'حروف الجر', blurb: 'معانيها وعملها والتعلق' },
      { slug: 'nasb-al-mudari', title: 'نصب المضارع', blurb: 'أدوات النصب وعلاماته' },
      { slug: 'jazm-al-mudari', title: 'جزم المضارع', blurb: 'أدوات الجزم وأثرها' },
      { slug: 'uslub-al-shart', title: 'أسلوب الشرط', blurb: 'أدواته وجوابه واقترانه بالفاء' },
    ],
  },
  {
    title: 'المبنيات',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'al-damair', title: 'الضمائر', blurb: 'المنفصل والمتصل والمستتر ومحالها' },
      { slug: 'al-asma-al-mawsula', title: 'الأسماء الموصولة', blurb: 'الصلة والعائد ومحل الموصول' },
      { slug: 'asma-al-ishara', title: 'أسماء الإشارة', blurb: 'بناؤها ومحلها والمثنى منها' },
    ],
  },
  {
    title: 'الاسم وأقسامه',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-nakira-wal-marifa', title: 'النكرة والمعرفة', blurb: 'أقسام المعارف وأثرها في الإعراب' },
      { slug: 'al-maqsur-wal-manqus-wal-mamdud', title: 'المقصور والمنقوص والممدود', blurb: 'الحركات المقدّرة وتثنيتها' },
    ],
  },
  {
    title: 'الأساليب الإنشائية',
    accent: 'var(--color-jazm)',
    lessons: [
      { slug: 'uslub-al-istifham', title: 'أسلوب الاستفهام', blurb: 'أدواته ومحلها من الإعراب' },
      { slug: 'uslub-al-taajjub', title: 'أسلوب التعجب', blurb: 'ما أفعله وأفعِل به' },
      { slug: 'uslub-al-madh-wal-dhamm', title: 'أسلوب المدح والذم', blurb: 'نعم وبئس وحبذا والمخصوص' },
    ],
  },
];


/** Every lesson, in curriculum order. */
export const LESSONS: Lesson[] = LESSON_GROUPS.flatMap((g) => g.lessons);

export const LESSON_COUNT = LESSONS.length;

const bySlug = new Map(LESSONS.map((l) => [l.slug, l]));

/** Look up lessons by slug, skipping any that no longer exist. */
export const lessonsBySlug = (...slugs: string[]): Lesson[] =>
  slugs.map((s) => bySlug.get(s)).filter((l): l is Lesson => Boolean(l));

/** The accent colour of the group a lesson belongs to. */
export const accentFor = (slug: string): string =>
  LESSON_GROUPS.find((g) => g.lessons.some((l) => l.slug === slug))?.accent ?? 'var(--color-purple)';
