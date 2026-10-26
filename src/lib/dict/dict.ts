/**
 * /dictionary on the web: the app's smart dictionary. One search box, then
 * the entry as the app's word details screen draws it (lib/dict/render.ts).
 * Signed-in only, on the app's allowance (/api/dictionary). A word already
 * looked up opens again from this device, without spending a search.
 * Mounted by components/dictionary/Dictionary.astro.
 */
import { lookup, searchesLeft, type DictEntry } from './api';
import { DICT, TRY_WORDS } from './strings';
import { entryHtml, wordChip, bare, type EntryView } from './render';
import { digits, type Lang } from '../irab/strings';
import { maybeSignedIn } from '../session';
import { revealOnScroll } from '../scroll-in';
import * as I from '../irab/icons';

interface Saved { w: string; entry: DictEntry; source: string; at: number }

const RECENT_KEY = 'irab-dict-recent';
const RECENT_MAX = 8;
const ARABIC = /[ء-يٱ-ۓ]/;
const LATIN = /[A-Za-z]/;

function readRecent(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.w === 'string' && x.entry && Array.isArray(x.entry.variants)) : [];
  } catch {
    return [];
  }
}
function writeRecent(items: Saved[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX))); } catch { /* full or blocked: the page works without it */ }
}

export function mountDictionary(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'ar';
  const s = DICT[lang];
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

  const gate = q('[data-view="gate"]');
  const tool = q('[data-view="tool"]');
  const form = q<HTMLFormElement>('[data-form]');
  const composer = q('[data-composer]');
  const input = q<HTMLInputElement>('[data-input]');
  const clearBtn = q<HTMLButtonElement>('[data-clear]');
  const submit = q<HTMLButtonElement>('[data-submit]');
  const quota = q('[data-quota]');
  const msg = q('[data-msg]');
  const start = q('[data-start]');
  const tryEl = q('[data-try]');
  const recentWrap = q('[data-recent-wrap]');
  const recentEl = q('[data-recent]');
  const pending = q('[data-pending]');
  const pendingNote = q('[data-pending-note]');
  const result = q('[data-result]');

  const user: { uid: string | null; email: string | null; getToken: (() => Promise<string>) | null } = { uid: null, email: null, getToken: null };
  let resolveAuth: () => void = () => {};
  const authReady = new Promise<void>((r) => { resolveAuth = r; });
  let premium = false;
  let left: number | null = null;
  let busy = false;
  let view: EntryView | null = null;
  const memory = new Map<string, Saved>();

  // ── Composer ─────────────────────────────────────────────────────────────
  function sync() {
    const filled = input.value.trim().length > 0;
    composer.classList.toggle('is-filled', filled);
    clearBtn.hidden = !filled;
  }
  input.addEventListener('input', () => { sync(); if (!msg.hidden && ARABIC.test(input.value)) hideMsg(); });
  input.addEventListener('focus', () => composer.classList.add('is-focused'));
  input.addEventListener('blur', () => composer.classList.remove('is-focused'));
  clearBtn.addEventListener('click', () => { input.value = ''; sync(); hideMsg(); input.focus(); });

  function showMsg(text: string, kind: 'info' | 'error' = 'info', retry = false) {
    msg.className = `dc-msg ${kind === 'error' ? 'iu-wash-error c-error' : 'iu-panel c-2'}`;
    msg.innerHTML = '';
    const p = document.createElement('p');
    p.className = 't-body-s';
    p.textContent = text;
    msg.appendChild(p);
    if (retry) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'iu-btn secondary';
      b.textContent = s.retry;
      b.addEventListener('click', () => search(input.value, true));
      msg.appendChild(b);
    }
    msg.hidden = false;
  }
  function hideMsg() { msg.hidden = true; }

  function renderQuota() {
    if (premium || left === Infinity) {
      quota.innerHTML = `<span class="iu-tag primary">${I.crown}${s.unlimited}</span>`;
    } else if (typeof left === 'number') {
      quota.innerHTML = `<span class="t-caption ${left > 0 ? 'c-3' : 'c-error'}">${left > 0 ? s.leftToday(digits(left, lang)) : s.noneLeft}</span>`;
    } else {
      quota.innerHTML = '';
    }
  }
  async function refreshQuota() {
    if (!user.getToken) return;
    try {
      const n = await searchesLeft(await user.getToken());
      if (n !== null) { left = n; if (n === Infinity) premium = true; renderQuota(); }
    } catch { /* the line just stays as it was */ }
  }

  // ── Start screen: words to try, and recent searches ─────────────────────
  function renderStart() {
    tryEl.innerHTML = TRY_WORDS.map(wordChip).join('');
    const recent = readRecent();
    recentWrap.hidden = recent.length === 0;
    recentEl.innerHTML = recent.map((r) => wordChip(r.w)).join('');
  }
  start.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-clear-recent]')) { writeRecent([]); renderStart(); return; }
    const chip = t.closest<HTMLElement>('[data-word]');
    if (!chip) return;
    input.value = chip.dataset.word ?? '';
    sync();
    search(input.value, true);
  });

  // ── The entry ────────────────────────────────────────────────────────────
  function draw() {
    if (!view) return;
    result.innerHTML = entryHtml(view, s, lang);
    result.hidden = false;
    start.hidden = true;
    revealOnScroll(result, '.dc-sec');
  }
  function open(saved: Saved, push: boolean) {
    view = { entry: saved.entry, variant: 0, diacritics: true, source: saved.source, word: saved.w };
    hideMsg();
    draw();
    const url = new URL(location.href);
    url.searchParams.set('w', saved.w);
    if (push) history.pushState({ ...history.state, irabDict: saved.w }, '', url);
    else history.replaceState({ ...history.state, irabDict: saved.w }, '', url);
    const top = root.getBoundingClientRect().top + window.scrollY - 88;
    if (window.scrollY > top + 10) window.scrollTo({ top, behavior: 'smooth' });
  }
  function remember(saved: Saved) {
    memory.set(bare(saved.w), saved);
    writeRecent([saved, ...readRecent().filter((r) => bare(r.w) !== bare(saved.w))]);
  }
  function home(push: boolean) {
    view = null;
    result.hidden = true;
    result.innerHTML = '';
    start.hidden = false;
    renderStart();
    const url = new URL(location.href);
    url.searchParams.delete('w');
    if (push) history.pushState({ ...history.state, irabDict: null }, '', url);
  }

  /** «تم النسخ» on the pressed button for a moment, and to screen readers. */
  function status(button: HTMLElement | null, text: string) {
    const live = result.querySelector<HTMLElement>('[data-status]');
    if (live) live.textContent = text;
    const label = button?.querySelector('span');
    if (!label) return;
    const was = label.textContent;
    label.textContent = text;
    button!.classList.add('is-done');
    window.setTimeout(() => { label.textContent = was; button!.classList.remove('is-done'); if (live) live.textContent = ''; }, 1800);
  }
  result.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (!view) return;
    const reading = t.closest<HTMLElement>('[data-variant]');
    if (reading) { view.variant = Number(reading.dataset.variant) || 0; draw(); return; }
    if (t.closest('[data-diacritics]')) { view.diacritics = !view.diacritics; draw(); return; }
    const lemma = (result.querySelector('.dc-lemma')?.textContent ?? view.word).trim();
    const copyBtn = t.closest<HTMLElement>('[data-copy]');
    if (copyBtn) {
      try { await navigator.clipboard.writeText(lemma); status(copyBtn, s.copied); } catch { /* no clipboard: nothing to say */ }
      return;
    }
    const shareBtn = t.closest<HTMLElement>('[data-share]');
    if (shareBtn) {
      const url = new URL(lang === 'ar' ? '/dictionary' : '/en/dictionary', location.origin);
      url.searchParams.set('w', view.word);
      try {
        if (navigator.share) { await navigator.share({ title: lemma, url: url.toString() }); return; }
        await navigator.clipboard.writeText(url.toString());
        status(shareBtn, s.linkCopied);
      } catch { /* share sheet closed */ }
    }
  });

  // ── Search ───────────────────────────────────────────────────────────────
  const track = (p: Record<string, string | number | boolean | null>) =>
    import('../analytics').then((m) => m.track('dictionary_searched', { mode: 'smart', platform: 'web', ...p })).catch(() => {});

  /** After a search that opened nothing: back to what was on screen. */
  function restore() {
    if (view) result.hidden = false;
    else start.hidden = false;
  }

  async function search(raw: string, push: boolean) {
    const word = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!word || busy) return;
    if (!ARABIC.test(word)) { showMsg(LATIN.test(word) ? s.arabicOnly : s.noResult); return; }
    hideMsg();
    const known = memory.get(bare(word)) ?? readRecent().find((r) => bare(r.w) === bare(word));
    if (known) { remember({ ...known, at: Date.now() }); open(known, push); return; }

    busy = true;
    submit.disabled = true;
    input.blur();
    start.hidden = true;
    result.hidden = true;
    pending.hidden = false;
    pendingNote.textContent = s.searching;
    const noteTimer = window.setTimeout(() => { pendingNote.textContent = s.generating; }, 1500);
    const began = performance.now();
    try {
      await authReady;
      if (!user.getToken) { showMsg(s.sessionEnded, 'error'); restore(); return; }
      const r = await lookup(word, await user.getToken());
      const latency = Math.round(performance.now() - began);
      if (r.kind === 'found') {
        track({ outcome: 'found', cached: r.source === 'cache', latency_ms: latency });
        const saved = { w: word, entry: r.entry, source: r.source, at: Date.now() };
        remember(saved);
        open(saved, push);
        if (typeof left === 'number' && left !== Infinity) { left = Math.max(0, left - 1); renderQuota(); }
        refreshQuota();
        return;
      }
      track({ outcome: r.kind === 'not_found' ? 'not_found' : r.kind === 'limit' ? 'limit' : 'error', cached: false, latency_ms: latency });
      if (r.kind === 'limit') {
        left = 0;
        renderQuota();
        (window as any).IrabPaywall?.show({ uid: user.uid ?? undefined, email: user.email ?? undefined, reason: 'limit' });
      } else if (r.kind === 'not_found') {
        showMsg(s.noResult);
        refreshQuota();
      } else if (r.kind === 'session') {
        showMsg(s.sessionEnded, 'error');
      } else if (r.kind === 'email') {
        // The paywall's email view says what to do.
      } else {
        showMsg(s.error, 'error', true);
      }
      restore();
    } finally {
      window.clearTimeout(noteTimer);
      pending.hidden = true;
      busy = false;
      submit.disabled = false;
    }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); search(input.value, true); });

  window.addEventListener('popstate', () => {
    if (!gate.hidden) return;
    const w = new URL(location.href).searchParams.get('w');
    const known = w ? memory.get(bare(w)) ?? readRecent().find((r) => bare(r.w) === bare(w)) : null;
    if (known) { input.value = known.w; sync(); open(known, false); return; }
    if (!w) { input.value = ''; sync(); hideMsg(); home(false); }
  });

  // ── Boot ─────────────────────────────────────────────────────────────────
  if (!maybeSignedIn()) { gate.hidden = false; tool.hidden = true; return; }
  tool.hidden = false;
  renderStart();
  const deepLink = new URL(location.href).searchParams.get('w')?.trim() ?? '';
  if (deepLink) { input.value = deepLink.slice(0, 50); sync(); search(input.value, false); } else { input.focus({ preventScroll: true }); }

  (async () => {
    try {
      const [{ onAuth }, { fetchMe }] = await Promise.all([import('../auth'), import('../entitlement')]);
      let probed = false;
      onAuth(async (u) => {
        if (!u) {
          user.getToken = null;
          resolveAuth();
          if (!view && !busy) { tool.hidden = true; gate.hidden = false; }
          return;
        }
        user.uid = u.uid;
        user.email = u.email;
        user.getToken = () => u.getIdToken();
        resolveAuth();
        if (probed) return;
        probed = true;
        refreshQuota();
        const me = await fetchMe(u).catch(() => null);
        if (me?.premium) { premium = true; renderQuota(); }
      });
    } catch {
      resolveAuth();
    }
  })();
}
