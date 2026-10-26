/**
 * «أعرب بنفسك» on the Worker: /api/grade-custom-irab (the feedback grader,
 * g2: each word's i'rab judged element by element, the mark counted on the
 * server) and today's allowance from /api/usage. Signed-in only.
 */
import { WORKER } from '../irab/api';
import { emailGateFor, guardHeaders } from '../guard';

export type GradeStatus = 'correct' | 'incomplete' | 'wrong' | 'empty';
export type PartVerdict = 'correct' | 'partial' | 'wrong' | 'missing';

export interface GradePart { label: string; expected: string; said: string; verdict: PartVerdict }

export interface WordFeedback {
  word: string;
  isCorrect: boolean;
  wordScore: number;
  userIrab: string;
  correctIrab: string;
  explanation: string;
  status: GradeStatus | null;
  parts: GradePart[];
}

export interface GradeResult {
  sentence: string;
  score: number;
  level: string;
  overallFeedback: string;
  wordFeedback: WordFeedback[];
}

/** 'email': unconfirmed or throwaway email, the paywall's email view is open. */
export type GradeError = 'limit' | 'premium' | 'session' | 'email' | 'failed';
export class GradeFailure extends Error {
  constructor(readonly kind: GradeError) { super(kind); }
}

const STATUSES = new Set(['correct', 'incomplete', 'wrong', 'empty']);
const VERDICTS = new Set(['correct', 'partial', 'wrong', 'missing']);

/** The grader's answer as the app reads it (practice_models.dart). */
export function toGrade(raw: any, sentence: string): GradeResult {
  const d = raw?.data ?? raw ?? {};
  return {
    sentence,
    score: typeof d.score === 'number' ? d.score : 0,
    level: String(d.level ?? ''),
    overallFeedback: String(d.overallFeedback ?? ''),
    wordFeedback: (Array.isArray(d.wordFeedback) ? d.wordFeedback : []).map((w: any) => ({
      word: String(w?.word ?? ''),
      isCorrect: w?.isCorrect === true,
      wordScore: typeof w?.wordScore === 'number' ? w.wordScore : (w?.isCorrect ? 1 : 0),
      userIrab: String(w?.userIrab ?? ''),
      correctIrab: String(w?.correctIrab ?? ''),
      explanation: String(w?.explanation ?? ''),
      status: STATUSES.has(w?.status) ? w.status : null,
      // Parts the grader leaves out (a past verb's place) never reach here.
      parts: (Array.isArray(w?.parts) ? w.parts : [])
        .filter((p: any) => p && p.verdict !== 'na')
        .map((p: any) => ({
          label: String(p.label ?? ''),
          expected: String(p.expected ?? ''),
          said: String(p.said ?? ''),
          verdict: VERDICTS.has(p.verdict) ? p.verdict : 'missing',
        })),
    })),
  };
}

export async function grade(sentence: string, answers: { word: string; irab: string }[], idToken: string | null): Promise<GradeResult> {
  if (!idToken) throw new GradeFailure('session');
  let res: Response;
  try {
    res = await fetch(`${WORKER}/api/grade-custom-irab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`, ...(await guardHeaders()) },
      body: JSON.stringify({ sentence, userAnalysis: answers }),
    });
  } catch {
    throw new GradeFailure('failed');
  }
  if (res.status === 429) throw new GradeFailure('limit');
  if (res.status === 403) {
    if (emailGateFor(403, await res.json().catch(() => null))) throw new GradeFailure('email');
    throw new GradeFailure('premium');
  }
  if (res.status === 401) throw new GradeFailure('session');
  if (!res.ok) throw new GradeFailure('failed');
  const raw = await res.json().catch(() => null);
  const result = toGrade(raw, sentence);
  if (!result.wordFeedback.length) throw new GradeFailure('failed');
  return result;
}

/** Checks left today (null: unknown; Infinity: Irab Plus). */
export async function checksLeft(idToken: string): Promise<number | null> {
  try {
    const res = await fetch(`${WORKER}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`, ...(await guardHeaders()) },
      body: '{}',
    });
    if (!res.ok) return null;
    const d = (await res.json())?.data;
    if (d?.isPremium) return Infinity;
    const u = d?.usage?.customPractice;
    return u && typeof u.remaining === 'number' && u.limit > 0 ? Math.max(0, u.remaining) : null;
  } catch {
    return null;
  }
}
