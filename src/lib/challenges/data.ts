/**
 * The challenge bank (Firestore `grammar_topics` and `sentences/{topic}/items`,
 * shared with the app) and the grading of a guided answer. Grading happens
 * here, against the sentence's stored analysis, as the app does: no server
 * call, so a challenge never spends the day's practice checks.
 */
import type { GradeResult, WordFeedback, GradePart } from '../practice/api';

export interface Topic {
  id: string;
  name: string;
  level: number;
  order: number;
  sentenceCount: number;
}

export interface Analysis { word: string; type: string; role: string; caseMarker: string; explanation: string }

export interface Sentence {
  id: string;
  sentence: string;
  difficulty: number;
  order: number;
  analysis: Analysis[];
  explanation: string;
}

export interface Attempt { type: string; role: string; caseMarker: string }

/** The app's PracticeWordTypes, PracticeRoles and PracticeCaseMarkers. */
export const WORD_TYPES = ['اسم', 'فعل', 'حرف'];
export const ROLES: Record<string, string[]> = {
  'اسم': ['مبتدأ', 'خبر', 'فاعل', 'مفعول به', 'اسم مجرور', 'حال', 'تمييز', 'نعت', 'مضاف إليه', 'اسم إن وأخواتها', 'خبر إن وأخواتها', 'اسم كان وأخواتها', 'خبر كان وأخواتها', 'بدل', 'توكيد', 'معطوف', 'منادى', 'مستثنى', 'مفعول مطلق', 'مفعول لأجله', 'مفعول فيه', 'مفعول معه', 'نائب فاعل'],
  'فعل': ['فعل ماضٍ', 'فعل مضارع', 'فعل أمر'],
  'حرف': ['حرف جر', 'حرف نصب', 'حرف جزم', 'حرف عطف', 'حرف نفي', 'حرف استفهام', 'حرف نداء', 'حرف ناسخ', 'حرف شرط', 'حرف تعليل'],
};
export const CASES = ['مرفوع بالضمة', 'منصوب بالفتحة', 'مجرور بالكسرة', 'مبني على السكون', 'مبني على الفتح', 'مبني على الضم', 'مبني على الكسر', 'مرفوع بالواو', 'منصوب بالألف', 'مجرور بالياء', 'مرفوع بالألف', 'منصوب بالياء', 'مرفوع بثبوت النون', 'منصوب بحذف النون', 'مجزوم بحذف النون', 'مجزوم بالسكون', 'مجزوم بحذف حرف العلة', 'منصوب بالكسرة', 'مجرور بالفتحة'];

/** Free accounts get levels 1 and 2 (topic_selection.dart). */
export const FREE_LEVELS = 2;

let fs: any = null;
let db: any = null;
async function firestore() {
  if (!fs) {
    const [mod, { app }] = await Promise.all([import('firebase/firestore'), import('../firebase')]);
    fs = mod;
    db = mod.getFirestore(app);
  }
  return fs;
}

let topicsPromise: Promise<Topic[]> | null = null;
export function loadTopics(): Promise<Topic[]> {
  topicsPromise ??= (async () => {
    const f = await firestore();
    const snap = await f.getDocs(f.query(f.collection(db, 'grammar_topics'), f.orderBy('level')));
    return snap.docs
      .map((d: any) => {
        const x = d.data() ?? {};
        return { id: d.id, name: String(x.name ?? d.id), level: Number(x.level ?? 1), order: Number(x.order ?? 0), sentenceCount: Number(x.sentenceCount ?? 0) };
      })
      .sort((a: Topic, b: Topic) => a.level - b.level || a.order - b.order);
  })();
  topicsPromise.catch(() => { topicsPromise = null; });
  return topicsPromise;
}

const sentenceCache = new Map<string, Promise<Sentence[]>>();
export function loadSentences(topicId: string): Promise<Sentence[]> {
  let p = sentenceCache.get(topicId);
  if (!p) {
    p = (async () => {
      const f = await firestore();
      const snap = await f.getDocs(f.query(f.collection(db, 'sentences', topicId, 'items'), f.orderBy('order')));
      return snap.docs.map((d: any) => {
        const x = d.data() ?? {};
        const analysis: Analysis[] = (Array.isArray(x.correctAnalysis) ? x.correctAnalysis : []).map((a: any) => ({
          word: String(a?.word ?? ''), type: String(a?.type ?? ''), role: String(a?.role ?? ''),
          caseMarker: String(a?.caseMarker ?? ''), explanation: String(a?.explanation ?? ''),
        }));
        return { id: d.id, sentence: String(x.sentence ?? ''), difficulty: Math.min(3, Math.max(1, Number(x.difficulty ?? 1))), order: Number(x.order ?? 0), analysis, explanation: String(x.explanation ?? '') };
      });
    })();
    p.catch(() => sentenceCache.delete(topicId));
    sentenceCache.set(topicId, p);
  }
  return p;
}

/** The words to answer: the stored analysis, or the sentence split on spaces. */
export function wordsOf(s: Sentence): string[] {
  return s.analysis.length ? s.analysis.map((a) => a.word) : s.sentence.split(/\s+/).filter(Boolean);
}

export const complete = (a: Attempt | undefined) => !!(a && a.type && a.role && a.caseMarker);

const norm = (v: string) => v.trim().replace(/\s+/g, ' ');
const same = (a: string, b: string) => !!a && norm(a) === norm(b);

/** The labels of the three elements, for the result's part chips. */
export interface PartLabels { type: string; role: string; caseMarker: string }

/**
 * Grades the answers as the app's gradeAttempt does (each element compared
 * after trimming), in the shape «أعرب بنفسك» shows, so the result cards and
 * the saved history are the same: right = all three, «قريبة» = the role right
 * or two of three, the mark = words fully right.
 */
export function gradeChallenge(s: Sentence, attempts: Attempt[], labels: PartLabels, sep: string): GradeResult {
  const words = wordsOf(s);
  const feedback: WordFeedback[] = words.map((word, i) => {
    const a = attempts[i] ?? { type: '', role: '', caseMarker: '' };
    const c = s.analysis[i] ?? { word, type: '', role: '', caseMarker: '', explanation: '' };
    const parts: GradePart[] = [
      { label: labels.type, expected: c.type, said: a.type, verdict: same(a.type, c.type) ? 'correct' : 'wrong' },
      { label: labels.role, expected: c.role, said: a.role, verdict: same(a.role, c.role) ? 'correct' : 'wrong' },
      { label: labels.caseMarker, expected: c.caseMarker, said: a.caseMarker, verdict: same(a.caseMarker, c.caseMarker) ? 'correct' : 'wrong' },
    ];
    const right = parts.filter((p) => p.verdict === 'correct').length;
    const roleRight = parts[1].verdict === 'correct';
    const status = right === 3 ? 'correct' : roleRight || right === 2 ? 'incomplete' : 'wrong';
    return {
      word,
      isCorrect: right === 3,
      wordScore: right / 3,
      userIrab: [a.type, a.role, a.caseMarker].filter(Boolean).join(sep),
      correctIrab: [c.type, c.role, c.caseMarker].filter(Boolean).join(sep),
      explanation: c.explanation,
      status,
      parts,
    };
  });
  const full = feedback.filter((f) => f.isCorrect).length;
  return { sentence: s.sentence, score: feedback.length ? full / feedback.length : 0, level: '', overallFeedback: '', wordFeedback: feedback };
}
