/**
 * The analyzer's two doors to the Worker.
 *
 *  • Signed-in visitors use /api/irab, the app's own endpoint: the same
 *    daily allowance as the app, deep analysis, «أعرب كما كتبتُها».
 *  • Guests use /v1/parse-public: three tries per device, standard
 *    analysis, 200 characters. Both return the same analysis object.
 */

export const WORKER = 'https://irab-api-v2.mansourhassan783.workers.dev';

export interface IrabWord {
  word: string;
  type: string;
  irab: string;
  details: string;
  case?: string;
}

export interface IrabDeep {
  jumal: { jumla: string; mahall: string }[];
  awjuh: { word: string; wajh: string }[];
  sarf: { word: string; note: string }[];
  qaida: string;
}

export interface IrabResult {
  originalSentence: string;
  vocalizedSentence?: string;
  correctedSentence?: string | null;
  correctionNote?: string | null;
  additionalClarification?: string | null;
  meaning?: string | null;
  explanation?: string;
  words: IrabWord[];
  deep?: IrabDeep | null;
  asTyped?: boolean;
}

export type AnalyzeError =
  | { kind: 'guest_limit' }
  | { kind: 'daily_limit' }
  | { kind: 'deep_locked' }
  | { kind: 'account_required' }
  | { kind: 'too_long' }
  | { kind: 'not_arabic' }
  | { kind: 'failed' };

export class AnalyzeFailure extends Error {
  constructor(readonly reason: AnalyzeError) {
    super(reason.kind);
  }
}

/** Accepts either response shape and returns the app's model. */
export function toResult(raw: any, sentence: string): IrabResult {
  const d = raw?.data ?? raw ?? {};
  const words: IrabWord[] = (Array.isArray(d.words) ? d.words : []).map((w: any) => ({
    word: String(w?.word ?? ''),
    type: String(w?.type ?? 'noun'),
    irab: String(w?.irab ?? ''),
    details: String(w?.details ?? ''),
    case: w?.case ? String(w.case) : undefined,
  }));
  const deep = d.deep && typeof d.deep === 'object'
    ? {
        jumal: Array.isArray(d.deep.jumal) ? d.deep.jumal : [],
        awjuh: Array.isArray(d.deep.awjuh) ? d.deep.awjuh : [],
        sarf: Array.isArray(d.deep.sarf) ? d.deep.sarf : [],
        qaida: String(d.deep.qaida ?? ''),
      }
    : null;
  return {
    originalSentence: String(d.originalSentence ?? d.text ?? sentence),
    vocalizedSentence: d.vocalizedSentence ?? undefined,
    correctedSentence: d.correctedSentence ?? null,
    correctionNote: d.correctionNote ?? null,
    additionalClarification: d.additionalClarification ?? null,
    meaning: d.meaning ?? null,
    explanation: d.explanation ?? undefined,
    words,
    deep,
    asTyped: d.asTyped === true,
  };
}

async function failureFrom(res: Response, signedIn: boolean): Promise<AnalyzeFailure> {
  let body: any = {};
  try { body = await res.json(); } catch { /* not JSON */ }
  const error = String(body?.error ?? '');
  if (res.status === 429) return new AnalyzeFailure({ kind: signedIn ? 'daily_limit' : 'guest_limit' });
  if (res.status === 403 && error === 'premium_required') return new AnalyzeFailure({ kind: 'deep_locked' });
  if (res.status === 403 && error === 'account_required') return new AnalyzeFailure({ kind: 'account_required' });
  if (res.status === 400 && /long/i.test(error)) return new AnalyzeFailure({ kind: 'too_long' });
  if (res.status === 400 && /arabic/i.test(error)) return new AnalyzeFailure({ kind: 'not_arabic' });
  return new AnalyzeFailure({ kind: 'failed' });
}

export interface AnalyzeOptions {
  idToken: string | null;
  fingerprint: () => Promise<string>;
  deep?: boolean;
  asTyped?: boolean;
}

/** One analysis; throws AnalyzeFailure. `fromCache` answers cost nothing. */
export async function analyze(text: string, opts: AnalyzeOptions): Promise<{ result: IrabResult; fromCache: boolean }> {
  let res: Response;
  try {
    if (opts.idToken) {
      res = await fetch(`${WORKER}/api/irab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.idToken}` },
        body: JSON.stringify({
          sentence: text,
          ...(opts.deep ? { depth: 'deep' } : {}),
          ...(opts.asTyped ? { asTyped: true } : {}),
        }),
      });
    } else {
      if (opts.deep || opts.asTyped) throw new AnalyzeFailure({ kind: 'account_required' });
      res = await fetch(`${WORKER}/v1/parse-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fingerprint: await opts.fingerprint() }),
      });
    }
  } catch (e) {
    if (e instanceof AnalyzeFailure) throw e;
    throw new AnalyzeFailure({ kind: 'failed' });
  }
  if (!res.ok) throw await failureFrom(res, !!opts.idToken);
  const raw = await res.json().catch(() => null);
  if (!raw || raw.success === false) throw new AnalyzeFailure({ kind: 'failed' });
  const result = toResult(raw, text);
  if (!result.words.length) throw new AnalyzeFailure({ kind: 'failed' });
  return { result, fromCache: raw.fromCache === true || raw.source === 'cache' };
}

export interface UsageStatus {
  premium: boolean;
  /** Standard analyses left today, null when unknown. */
  standard: { remaining: number; limit: number } | null;
  /** Free deep tries left (lifetime), null when unknown. */
  deep: number | null;
}

/** Today's allowance for a signed-in account, as the app shows it. */
export async function usageStatus(idToken: string): Promise<UsageStatus | null> {
  try {
    const res = await fetch(`${WORKER}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: '{}',
    });
    if (!res.ok) return null;
    const d = (await res.json())?.data;
    if (!d) return null;
    const a = d.usage?.irabAnalysis;
    const deep = d.usage?.irabDeep;
    return {
      premium: d.isPremium === true,
      standard: a && typeof a.remaining === 'number' && a.limit > 0 ? { remaining: Math.max(0, a.remaining), limit: a.limit } : null,
      deep: deep && typeof deep.remaining === 'number' && deep.limit > 0 ? Math.max(0, deep.remaining) : null,
    };
  } catch {
    return null;
  }
}
