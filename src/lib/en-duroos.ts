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

export interface EnLesson { slug: string; title: string; blurb: string }
export interface EnGroup { title: string; accent: string; lessons: EnLesson[] }

/** The curriculum, in teaching order. Mirrors the ten groups of /duroos. */
export const EN_GROUPS: { title: string; accent: string; lessons: { slug: string; title: string; blurb: string }[] }[] = [
  {
    title: 'The sentence and its pillars',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-jumla-al-ismiyya', title: 'The nominal sentence', blurb: 'Its two pillars, their cases, and the shapes of the predicate' },
      { slug: 'al-mubtada-wal-khabar', title: 'Subject and predicate', blurb: 'Their kinds, and when each is nominative' },
      { slug: 'al-jumla-al-filiyya', title: 'The verbal sentence', blurb: 'Verb, doer, object, and their order' },
      { slug: 'al-fail', title: 'The doer (fāʿil)', blurb: 'Its four rulings and the forms it takes' },
      { slug: 'naib-al-fail', title: 'The deputy doer', blurb: 'The passive and its rulings' },
    ],
  },
  {
    title: 'The objects',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'al-maful-bih', title: 'The direct object', blurb: 'Its accusative markers, fronting and postponing' },
      { slug: 'al-maful-al-mutlaq', title: 'The absolute object', blurb: 'Its three kinds and what stands in for it' },
      { slug: 'al-maful-li-ajlih', title: 'The object of purpose', blurb: 'The conditions for its accusative' },
      { slug: 'al-maful-fih', title: 'The adverbial object', blurb: 'Adverbs of time and of place' },
    ],
  },
  {
    title: 'The markers of iʿrāb',
    accent: 'var(--color-purple-deep)',
    lessons: [
      { slug: 'alamat-al-irab', title: 'The markers of iʿrāb', blurb: 'Original and substitute markers, and what replaces what' },
      { slug: 'al-afal-al-khamsa', title: 'The five verbs', blurb: 'Keeping and dropping the nūn' },
      { slug: 'al-asma-al-khamsa', title: 'The five nouns', blurb: 'The conditions for letter-marked case' },
      { slug: 'al-mamnu-min-al-sarf', title: 'Diptotes', blurb: 'Why they occur and their fatḥa in the genitive' },
    ],
  },
  {
    title: 'The abrogators',
    accent: 'var(--color-teal-deep)',
    lessons: [
      { slug: 'kana-wa-akhawatuha', title: 'Kāna and its sisters', blurb: 'How they govern, their noun and predicate' },
      { slug: 'inna-wa-akhawatuha', title: 'Inna and its sisters', blurb: 'Their governance, and hamza kasra vs fatḥa' },
      { slug: 'la-nafiya-lil-jins', title: 'The lā of absolute negation', blurb: 'Its governance, conditions, and lā ilāha illā Llāh' },
      { slug: 'kada-wa-akhawatuha', title: 'Kāda and its sisters', blurb: 'Verbs of approach, hope and beginning' },
      { slug: 'zanna-wa-akhawatuha', title: 'Ẓanna and its sisters', blurb: 'Verbs taking two objects' },
    ],
  },
  {
    title: 'Accusatives and styles',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-hal', title: 'The circumstantial accusative', blurb: 'Its conditions, its holder, and the sentence-ḥāl' },
      { slug: 'al-tamyiz', title: 'The specifier', blurb: 'Specifying a single word or a whole sentence' },
      { slug: 'al-istithna', title: 'Exception', blurb: 'Illā and its sisters, complete and incomplete' },
      { slug: 'al-munada', title: 'The vocative', blurb: 'Its five kinds and when it is built' },
      { slug: 'al-idafa', title: 'Annexation (iḍāfa)', blurb: 'Its rulings and the genitive of the second term' },
    ],
  },
  {
    title: 'The followers',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'al-naat', title: 'The adjective', blurb: 'Agreement in four respects, real and causal' },
      { slug: 'al-atf', title: 'Coordination', blurb: 'The particles and what follows in case' },
      { slug: 'al-badal', title: 'Substitution', blurb: 'Its kinds and the ruling of the substitute' },
      { slug: 'al-tawkid', title: 'Emphasis', blurb: 'Verbal and semantic emphasis' },
    ],
  },
  {
    title: 'The genitive and the imperfect',
    accent: 'var(--color-purple-deep)',
    lessons: [
      { slug: 'huruf-al-jarr', title: 'Prepositions', blurb: 'Their meanings and what they attach to' },
      { slug: 'nasb-al-mudari', title: 'The subjunctive', blurb: 'The particles that put the imperfect in the accusative' },
      { slug: 'jazm-al-mudari', title: 'The jussive', blurb: 'Apocopating one verb and two' },
      { slug: 'uslub-al-shart', title: 'Conditional sentences', blurb: 'The protasis, the apodosis, and the linking fāʾ' },
      { slug: 'al-adad', title: 'Numbers', blurb: 'Agreement, the counted noun, and its case' },
    ],
  },
  {
    title: 'The indeclinables',
    accent: 'var(--color-teal-deep)',
    lessons: [
      { slug: 'al-damair', title: 'Pronouns', blurb: 'Detached, attached and implied' },
      { slug: 'asma-al-ishara', title: 'Demonstratives', blurb: 'Their forms and their position in iʿrāb' },
      { slug: 'al-asma-al-mawsula', title: 'Relative nouns', blurb: 'The relative clause and its returning pronoun' },
    ],
  },
  {
    title: 'The noun and its divisions',
    accent: 'var(--color-purple)',
    lessons: [
      { slug: 'al-nakira-wal-marifa', title: 'Indefinite and definite', blurb: 'The kinds of definiteness' },
      { slug: 'al-maqsur-wal-manqus-wal-mamdud', title: 'Shortened, defective, extended', blurb: 'Estimated case marking' },
    ],
  },
  {
    title: 'Performative styles',
    accent: 'var(--color-teal)',
    lessons: [
      { slug: 'uslub-al-istifham', title: 'Questions', blurb: 'The particles and their positions in iʿrāb' },
      { slug: 'uslub-al-taajjub', title: 'Wonder', blurb: 'Mā afʿalahu and afʿil bihi' },
      { slug: 'uslub-al-madh-wal-dhamm', title: 'Praise and blame', blurb: 'Niʿma, biʾsa, ḥabbadhā and the specified' },
    ],
  },
];

/** Flat teaching order, used for the lesson counter and prev/next. */
export const EN_ORDER: EnLesson[] = EN_GROUPS.flatMap((g) => g.lessons);

export interface LessonPlace {
  no: number;            // 1-based position in the whole course
  total: number;
  group: string;
  prev?: EnLesson;       // previous PUBLISHED lesson, if any
  next?: EnLesson;       // next PUBLISHED lesson, if any
}

/** Where a lesson sits in the course, and its published neighbours. Prev/next
 *  skip unpublished lessons so a learner is never sent to a page that is not
 *  there yet, while the counter still reflects the real course position. */
export function lessonPlace(slug: string): LessonPlace | undefined {
  const i = EN_ORDER.findIndex((l) => l.slug === slug);
  if (i < 0) return undefined;
  const group = EN_GROUPS.find((g) => g.lessons.some((l) => l.slug === slug))!.title;
  const before = EN_ORDER.slice(0, i).reverse().find((l) => EN_DUROOS.has(l.slug));
  const after = EN_ORDER.slice(i + 1).find((l) => EN_DUROOS.has(l.slug));
  return { no: i + 1, total: EN_ORDER.length, group, prev: before, next: after };
}
