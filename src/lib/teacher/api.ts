/**
 * «اسأل الأستاذ» on the Worker (POST /api/teacher, /api/teacher-feedback),
 * as the app calls it (CloudApiService.askTeacherStream): the analysis the
 * student sees goes with every question, which is what grounds the answer.
 * Answers stream as Server-Sent Events: `partial` while the model writes,
 * then `done` or `error`. A stopped or failed answer is not counted.
 */
import { WORKER } from '../irab/api';

export type TeacherMode = 'ask' | 'quiz' | 'review' | 'hint';

export interface TeacherWord { word: string; irab: string; case?: string }
export interface TeacherTurn { role: 'student' | 'teacher'; text: string }
export interface PracticeContext { word: string; userIrab: string; correctIrab: string; explanation?: string }

export interface TeacherRequest {
  mode: TeacherMode;
  sentence: string;
  analysis: TeacherWord[];
  wordIndex?: number | null;
  question?: string;
  messages: TeacherTurn[];
  practice?: PracticeContext | null;
  lang: 'ar' | 'en';
}

export interface BeforeAfter { before: string; beforeLabel: string; after: string; afterLabel: string }

export type TeacherAnswer =
  | { mode: 'ask'; answerId?: string; lead: string; body: string; beforeAfter: BeforeAfter | null; example: { text: string; note: string } | null; followUps: string[]; offTopic: boolean }
  | { mode: 'quiz'; answerId?: string; question: string; options: string[]; answerIndex: number; explanation: string }
  | { mode: 'review'; answerId?: string; verdict: 'correct' | 'alternative' | 'fixed'; lead: string; body: string; correctedIrab: string | null; correctedCase: string | null }
  | { mode: 'hint'; answerId?: string; hint: string };

/** What has been written so far (lead and body; a review's verdict). */
export interface TeacherPartial { mode: TeacherMode; lead: string; body: string; verdict?: string }

/** Remaining questions today; -1 is unlimited. */
export interface TeacherUsage { remaining: number; limit: number }

export type TeacherError = 'account' | 'limit' | 'session' | 'stopped' | 'failed';
export class TeacherFailure extends Error {
  constructor(public kind: TeacherError) { super(kind); }
}

/** The text a later turn sends back as history (TeacherAnswer.asText). */
export function answerText(a: TeacherAnswer): string {
  switch (a.mode) {
    case 'quiz': return `${a.question}\n${a.options.join(' / ')}`;
    case 'hint': return a.hint;
    case 'ask': return [a.lead, a.body, a.example?.text ?? ''].filter(Boolean).join('\n');
    default: return [a.lead, a.body].filter(Boolean).join('\n');
  }
}

function failureFor(status: number, body: any): TeacherFailure {
  if (status === 403 && body?.error === 'account_required') return new TeacherFailure('account');
  if (status === 429) return new TeacherFailure('limit');
  if (status === 401) return new TeacherFailure('session');
  return new TeacherFailure('failed');
}

/**
 * One answer. [onPartial] sees the answer as it is written; aborting
 * [signal] stops it (TeacherFailure 'stopped', not counted).
 */
export async function askTeacher(
  req: TeacherRequest,
  idToken: string,
  onPartial: (p: TeacherPartial) => void,
  signal: AbortSignal,
): Promise<{ answer: TeacherAnswer; usage: TeacherUsage | null }> {
  let res: Response;
  try {
    res = await fetch(`${WORKER}/api/teacher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`, Accept: 'text/event-stream' },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    });
  } catch {
    throw new TeacherFailure(signal.aborted ? 'stopped' : 'failed');
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw failureFor(res.status, body);
  }
  // A plain JSON reply (an older Worker) is the final answer.
  if (!(res.headers.get('content-type') || '').includes('event-stream')) {
    const d = await res.json().catch(() => null);
    if (!d?.success || !d.data) throw new TeacherFailure('failed');
    return { answer: d.data, usage: usageOf(d.usage) };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        let event = 'message';
        const data: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        }
        if (!data.length) continue;
        let payload: any;
        try { payload = JSON.parse(data.join('\n')); } catch { continue; }
        if (event === 'partial') onPartial(payload);
        else if (event === 'done') {
          if (!payload?.success || !payload.data) throw new TeacherFailure('failed');
          return { answer: payload.data, usage: usageOf(payload.usage) };
        } else if (event === 'error') throw new TeacherFailure('failed');
      }
    }
  } catch (e) {
    if (e instanceof TeacherFailure) throw e;
    throw new TeacherFailure(signal.aborted ? 'stopped' : 'failed');
  } finally {
    reader.releaseLock?.();
  }
  throw new TeacherFailure(signal.aborted ? 'stopped' : 'failed');
}

function usageOf(u: any): TeacherUsage | null {
  return u && typeof u.remaining === 'number' ? { remaining: u.remaining, limit: Number(u.limit) || 0 } : null;
}

/** Today's questions left (-1 for Irab+), or null when unknown. */
export async function teacherLeft(idToken: string): Promise<TeacherUsage | null> {
  try {
    const res = await fetch(`${WORKER}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: '{}',
    });
    if (!res.ok) return null;
    const d = (await res.json())?.data;
    if (d?.isPremium) return { remaining: -1, limit: -1 };
    return usageOf(d?.usage?.askTeacher);
  } catch {
    return null;
  }
}

/** T11: a rating, with reasons and a note for a «لم تعجبني». */
export async function rateAnswer(body: {
  answerId: string; rating: 'up' | 'down'; reasons: string[]; note: string;
  mode: TeacherMode; sentence: string; question: string; answer: string;
}, idToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER}/api/teacher-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
