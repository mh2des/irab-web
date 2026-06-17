/**
 * history.ts: saved history + derived stats for the analyzer and practice
 * tools. Browser-only (localStorage). Each item is tagged with the owner uid
 * ('anon' before sign-in, the Firebase uid after) so a shared device keeps
 * accounts separate. Stats are DERIVED from real saved items: never invented.
 *
 * Source of truth is the device; this is intentionally dependency-free and
 * cannot fail on a flaky network. Cross-device sync (Firestore) can layer on
 * top later without changing this contract.
 */

export type HistoryKind = 'analyze' | 'practice';

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  uid: string;          // 'anon' or the Firebase uid
  ts: number;           // epoch ms
  sentence: string;     // the original text the user entered
  vocalized?: string;   // fully-voweled form (analyze)
  meaning?: string;     // short meaning (analyze)
  wordCount?: number;   // analyze
  score?: number;       // practice, 0..1
  level?: string;       // practice label
  correctCount?: number;// practice
  totalCount?: number;  // practice
  data?: unknown;       // full payload to re-open without re-calling the API
}

export interface HistoryStats {
  analyzeCount: number;
  practiceCount: number;
  total: number;
  avgScore: number | null;   // 0..100, null if no practice yet
  bestScore: number | null;  // 0..100
  last7: number;             // items in the last 7 days
  streak: number;            // consecutive active days ending today/yesterday
  lastActive: number | null; // epoch ms of newest item
}

const KEY = 'irab-history-v1';
const CAP = 300;            // keep the newest N items
const DEDUP_WINDOW = 60_000; // collapse an identical re-run within 1 min

function readAll(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, CAP)));
  } catch {
    // quota exceeded → drop the oldest half and retry once
    try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, Math.floor(CAP / 2)))); } catch { /* give up silently */ }
  }
}

function uid8(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Add (or refresh) a history item. Returns the stored item. */
export function addHistory(
  input: Omit<HistoryItem, 'id' | 'ts'> & { id?: string; ts?: number },
): HistoryItem {
  const items = readAll();
  const now = Date.now();
  // Collapse an identical same-kind, same-sentence re-run within the window.
  const dupIdx = items.findIndex(
    (it) => it.uid === input.uid && it.kind === input.kind &&
      it.sentence === input.sentence && now - it.ts < DEDUP_WINDOW,
  );
  if (dupIdx !== -1) items.splice(dupIdx, 1);

  const item: HistoryItem = { id: input.id ?? uid8(), ts: input.ts ?? now, ...input };
  items.unshift(item);
  writeAll(items);
  return item;
}

/** All items for a scope, newest first, optionally filtered by kind. */
export function getHistory(uid: string, kind?: HistoryKind): HistoryItem[] {
  return readAll()
    .filter((it) => it.uid === uid && (!kind || it.kind === kind))
    .sort((a, b) => b.ts - a.ts);
}

export function getHistoryItem(id: string): HistoryItem | null {
  return readAll().find((it) => it.id === id) ?? null;
}

export function removeHistory(id: string): void {
  writeAll(readAll().filter((it) => it.id !== id));
}

export function clearHistory(uid: string, kind?: HistoryKind): void {
  writeAll(readAll().filter((it) => !(it.uid === uid && (!kind || it.kind === kind))));
}

/** Derive truthful stats for a scope from the saved items. */
export function getStats(uid: string): HistoryStats {
  const items = getHistory(uid);
  const analyze = items.filter((i) => i.kind === 'analyze');
  const practice = items.filter((i) => i.kind === 'practice' && typeof i.score === 'number');
  const scores = practice.map((i) => Math.round((i.score as number) * 100));
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;

  // Consecutive-day streak ending today or yesterday.
  const dayKey = (ms: number) => {
    const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime();
  };
  const days = new Set(items.map((i) => dayKey(i.ts)));
  let streak = 0;
  if (days.size) {
    const oneDay = 24 * 60 * 60 * 1000;
    let cursor = dayKey(now);
    if (!days.has(cursor)) cursor -= oneDay; // allow "yesterday" to keep a streak alive
    while (days.has(cursor)) { streak++; cursor -= oneDay; }
  }

  return {
    analyzeCount: analyze.length,
    practiceCount: practice.length,
    total: items.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    bestScore: scores.length ? Math.max(...scores) : null,
    last7: items.filter((i) => now - i.ts < week).length,
    streak,
    lastActive: items.length ? items[0].ts : null,
  };
}

/** "5m ago" / "منذ ٥ د" style relative time. */
export function formatAgo(ts: number, lang: 'ar' | 'en'): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  const ar = lang === 'ar';
  const units: [number, string, string][] = [
    [60, 'ث', 's'], [3600, 'د', 'm'], [86400, 'سا', 'h'], [604800, 'ي', 'd'],
  ];
  if (s < 60) return ar ? 'الآن' : 'just now';
  if (s < 3600) return ar ? `منذ ${Math.floor(s / 60)} د` : `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return ar ? `منذ ${Math.floor(s / 3600)} سا` : `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return ar ? `منذ ${Math.floor(s / 86400)} ي` : `${Math.floor(s / 86400)}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(ar ? 'ar' : 'en', { day: 'numeric', month: 'short' });
}
