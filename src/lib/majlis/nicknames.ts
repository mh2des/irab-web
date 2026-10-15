/**
 * Grammar nicknames («ألقاب نحوية»): a kind two-word name a player can take
 * instead of typing one, and the fallback offered when a typed name is
 * refused. Every result is 2 to 20 characters and passes the server's name
 * filter (functions-majalis/src/majalis/names.ts).
 */
const FIRST = ['فارس', 'صقر', 'نجم', 'حارس', 'أمير', 'سيف', 'قمر', 'نسر', 'شهاب', 'ليث', 'رفيق', 'بطل', 'غيث', 'برق'];
const SECOND = ['المبتدأ', 'الخبر', 'الحال', 'التمييز', 'النعت', 'البدل', 'الإضافة', 'الفاعل', 'المفعول', 'الإعراب', 'النحو', 'البيان', 'الضمة', 'الفتحة', 'الكسرة', 'السكون'];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** A random grammar nickname, different from `avoid` when possible. */
export function grammarNickname(avoid = ''): string {
  for (let i = 0; i < 6; i++) {
    const n = `${pick(FIRST)} ${pick(SECOND)}`;
    if (n !== avoid) return n;
  }
  return `${pick(FIRST)} ${pick(SECOND)}`;
}
