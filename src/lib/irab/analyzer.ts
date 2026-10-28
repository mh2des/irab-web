/**
 * The web analyzer, screen for screen the app's (A1 compose, A2 analysis
 * type, A3 analyzing, A4-A7 result, A9 error). Mounted by
 * components/analyzer/Analyzer.astro on every [data-analyzer] root.
 */
import { analyze, usageStatus, AnalyzeFailure, type IrabResult, type UsageStatus } from './api';
import { STRINGS, digits, ago, type Lang } from './strings';
import * as R from './render';
import * as I from './icons';
import { teacherEnabled } from '../teacher/flag';
import { TEACHER } from '../teacher/strings';
import { getFingerprint, guestUsed, bumpGuestUsed, GUEST_TRIES } from './fingerprint';
import { maybeSignedIn } from '../session';
import { addHistory, getHistory, getHistoryItem } from '../history';
import { guardArabicOnly } from '../../scripts/arabic-only';

const MAX_WORDS = 30;
const GUEST_CHARS = 200;
const MEMBER_CHARS = 1000;

type View = 'compose' | 'analyzing' | 'result' | 'error';
type Mode = 'standard' | 'deep';

interface Run { text: string; deep: boolean; asTyped: boolean }

export function mountAnalyzer(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'ar';
  const s = STRINGS[lang];
  const D = (n: number | string) => digits(n, lang);
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const historyHref = root.dataset.history || '/history';
  const loginHref = root.dataset.login || '/login';
  const track = (e: string, p?: Record<string, string | number | boolean | null | undefined>) =>
    import('../analytics').then((m) => m.track(e, p)).catch(() => {});

  const views: Record<View, HTMLElement> = {
    compose: q('[data-view="compose"]'),
    analyzing: q('[data-view="analyzing"]'),
    result: q('[data-view="result"]'),
    error: q('[data-view="error"]'),
  };
  const form = q<HTMLFormElement>('[data-form]');
  const input = q<HTMLTextAreaElement>('[data-input]');
  const counter = q('[data-counter]');
  const submit = q<HTMLButtonElement>('[data-submit]');
  const submitLabel = q('[data-submit-label]');
  const modeBtn = q<HTMLButtonElement>('[data-mode]');
  const modeLabel = q('[data-mode-label]');
  const modeCrown = q('[data-mode-crown]');
  const micBtn = q<HTMLButtonElement>('[data-mic]');
  const micStatus = q('[data-mic-status]');
  const composerNote = q('[data-composer-note]');
  const recentEl = q('[data-recent]');
  const gate = q('[data-gate]');
  const sheet = q<HTMLDialogElement>('[data-mode-sheet]');
  const sticky = q('[data-sticky]');
  const quota = q('[data-quota]');
  const quotaText = q('[data-quota-text]');
  const quotaPlus = q<HTMLAnchorElement>('[data-quota-plus]');

  const user = { signedIn: false, uid: null as string | null, idToken: null as string | null, premium: false, getToken: null as null | (() => Promise<string>) };
  let mode: Mode = 'standard';
  let busy = false;
  let last: { run: Run; result: IrabResult } | null = null;
  let lastRun: Run | null = null;
  let usage: UsageStatus | null = null;
  let usageAt = 0; // when usage was last read from the Worker

  // A refused character says why, and the notice stays long enough to read.
  const arabic = guardArabicOnly(input, { note: q('[data-arabic-only-note]'), linger: 4500 });

  // ── Views ────────────────────────────────────────────────────────────────
  function show(view: View, scroll = true) {
    (Object.keys(views) as View[]).forEach((k) => { views[k].hidden = k !== view; });
    sticky.hidden = true;
    if (scroll) {
      const top = root.getBoundingClientRect().top + window.scrollY - 88;
      if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ── Composer (A1) ────────────────────────────────────────────────────────
  function words(): number { return R.wordCount(input.value); }
  function syncInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 78), 190)}px`;
    const n = words();
    counter.textContent = s.counter(D(n), D(MAX_WORDS));
    counter.classList.toggle('c-error', n > MAX_WORDS);
    form.classList.toggle('is-filled', input.value.trim().length > 0);
    submit.disabled = busy || n === 0 || n > MAX_WORDS;
  }
  function setNote(text: string) {
    composerNote.textContent = text;
    composerNote.hidden = !text;
  }
  input.addEventListener('input', () => { setNote(''); syncInput(); });
  input.addEventListener('focus', () => form.classList.add('is-focused'));
  input.addEventListener('blur', () => form.classList.remove('is-focused'));
  input.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
  });
  submit.addEventListener('click', () => form.requestSubmit());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    arabic.sanitize();
    const text = input.value.trim();
    if (!text || words() > MAX_WORDS) return;
    void run({ text, deep: mode === 'deep', asTyped: false });
  });

  function setMode(m: Mode) {
    mode = m;
    modeLabel.textContent = m === 'deep' ? s.modeDeep : s.modeStandard;
    modeCrown.hidden = m !== 'deep';
    modeBtn.classList.toggle('is-deep', m === 'deep');
    submitLabel.textContent = m === 'deep' ? s.analyzeDeep : s.analyze;
  }

  // ── Analysis type (A2) ───────────────────────────────────────────────────
  const premium = () => user.premium || usage?.premium === true;
  const deepSpent = () => user.signedIn && !premium() && usage?.deep === 0;
  function deepStatusText(): string {
    if (!user.signedIn) return s.modeDeepGuest;
    if (premium()) return '';
    if (usage?.deep === 0) return s.modeDeepLocked;
    if (typeof usage?.deep === 'number') return D(s.deepTries(usage.deep));
    return '';
  }
  function standardStatusText(): string {
    // A guest's free tries are not counted out to them (owner, 2026-10-13).
    if (!user.signedIn) return '';
    if (premium() || !usage?.standard) return '';
    return D(s.leftToday(String(usage.standard.remaining), String(usage.standard.limit)));
  }
  function renderSheet() {
    sheet.querySelectorAll<HTMLButtonElement>('[data-mode-option]').forEach((b) => {
      const on = b.dataset.modeOption === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    const set = (sel: string, text: string) => {
      const el = sheet.querySelector<HTMLElement>(sel)!;
      el.querySelector('[data-text]')!.textContent = text;
      el.hidden = !text;
    };
    set('[data-standard-status]', standardStatusText());
    set('[data-deep-status]', deepStatusText());
    sheet.querySelector<HTMLElement>('[data-plus-chip]')!.hidden = premium();
  }
  modeBtn.addEventListener('click', async () => {
    renderSheet();
    sheet.showModal();
    if (user.signedIn && user.getToken) {
      const token = await user.getToken().catch(() => null);
      if (token) { usage = (await usageStatus(token)) ?? usage; usageAt = Date.now(); renderSheet(); renderQuota(); }
    }
  });
  sheet.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === sheet || t.closest('[data-sheet-close]')) { sheet.close(); return; }
    const opt = t.closest<HTMLButtonElement>('[data-mode-option]');
    if (!opt) return;
    const m = opt.dataset.modeOption as Mode;
    if (m === 'deep' && deepSpent()) {
      sheet.close();
      (window as any).IrabPaywall?.show({ reason: 'deep' });
      return;
    }
    setMode(m);
    renderSheet();
    window.setTimeout(() => sheet.close(), 120);
  });

  // ── Today's allowance (A1) ───────────────────────────────────────────────
  // Under the button, for a free account only: what is left today and the
  // way to no limit, or, once it is used, when it renews. Not for a guest,
  // whose tries are not counted out (owner, 2026-10-13), nor for Irab Plus.
  async function refreshUsage() {
    if (!user.signedIn || !user.getToken || premium()) return;
    const token = await user.getToken().catch(() => null);
    if (!token) return;
    usage = (await usageStatus(token)) ?? usage;
    usageAt = Date.now();
    renderQuota();
  }
  /** The Worker's daily reset: the next UTC midnight. */
  function nextReset(): Date {
    const at = new Date();
    at.setUTCHours(24, 0, 0, 0);
    return at;
  }
  /** That reset in this browser's time zone, as the app says it. */
  function renewsLine(at: Date): string {
    const when = at.toDateString() === new Date().toDateString() ? s.renewsToday : s.renewsTomorrow;
    return s.quotaSpent(when, D(new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(at)));
  }
  let renewTimer = 0;
  function renderQuota() {
    window.clearTimeout(renewTimer);
    const st = user.signedIn && !premium() ? usage?.standard : null;
    quota.hidden = !st;
    if (!st) return;
    const spent = st.remaining <= 0;
    quota.classList.toggle('is-spent', spent);
    quotaPlus.textContent = spent ? s.quotaSpentCta : s.quotaPlus;
    if (!spent) { quotaText.textContent = D(s.leftToday(String(st.remaining), String(st.limit))); return; }
    const at = nextReset();
    quotaText.textContent = renewsLine(at);
    // Still on the page when the day renews: read the new allowance then.
    renewTimer = window.setTimeout(() => void refreshUsage(), at.getTime() - Date.now() + 5000);
  }
  quotaPlus.addEventListener('click', (e) => {
    const left = usage?.standard?.remaining ?? null;
    track('quota_upgrade_clicked', { source: 'web_tool', remaining: left });
    // A used-up day opens the limit paywall in place; otherwise the pricing page.
    const paywall = (window as any).IrabPaywall;
    if (left === 0 && paywall) { e.preventDefault(); paywall.show(); }
  });
  document.addEventListener('visibilitychange', () => {
    // Back on the tab: the day may have renewed, or the app used some.
    if (document.visibilityState === 'visible' && Date.now() - usageAt > 60_000) void refreshUsage();
  });

  // ── Gates ────────────────────────────────────────────────────────────────
  function showGate(title: string, body: string) {
    gate.querySelector('[data-gate-title]')!.textContent = title;
    gate.querySelector('[data-gate-body]')!.textContent = body;
    const cta = gate.querySelector<HTMLAnchorElement>('[data-gate-cta]')!;
    cta.href = `${loginHref}?next=${encodeURIComponent(location.pathname + location.search)}`;
    gate.hidden = false;
    show('compose', false);
    gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  gate.querySelector('[data-gate-later]')?.addEventListener('click', () => { gate.hidden = true; });

  // ── Analyzing (A3) ───────────────────────────────────────────────────────
  let stepTimers: number[] = [];
  function startSteps(text: string, deep: boolean) {
    views.analyzing.innerHTML = R.analyzingHtml(text, deep, s);
    const items = Array.from(views.analyzing.querySelectorAll<HTMLElement>('[data-step]'));
    const mark = (i: number, state: 'active' | 'done') => {
      const li = items[i];
      if (!li) return;
      li.dataset.state = state;
      li.querySelector('span:last-child')!.textContent = state === 'done' ? li.dataset.done! : li.dataset.doing!;
    };
    mark(0, 'active');
    const at = deep ? [1400, 3600, 9000] : [1100, 3000];
    at.forEach((ms, i) => stepTimers.push(window.setTimeout(() => { mark(i, 'done'); mark(i + 1, 'active'); }, ms)));
  }
  function stopSteps() { stepTimers.forEach(clearTimeout); stepTimers = []; }

  // ── Running an analysis ──────────────────────────────────────────────────
  // A guest asked for what needs an account: «as typed» needs a free one,
  // deep analysis Irab Plus.
  const accountGate = (r: Run) => r.asTyped
    ? showGate(s.asTypedAccountTitle, s.asTypedAccountBody)
    : showGate(s.deepAccountTitle, s.deepAccountBody);

  async function run(r: Run) {
    if (busy) return;
    gate.hidden = true;
    setNote('');
    if (!user.signedIn && (r.deep || r.asTyped)) { accountGate(r); return; }
    if (!user.signedIn && guestUsed() >= GUEST_TRIES && !maybeSignedIn()) { showGate(s.guestTitle, s.guestBody); return; }
    if (!user.signedIn && r.text.length > GUEST_CHARS) { show('compose', false); setNote(s.tooManyChars(GUEST_CHARS)); return; }
    busy = true;
    lastRun = r;
    syncInput();
    stopListening();
    startSteps(r.text, r.deep);
    show('analyzing');
    const started = performance.now();
    track('irab_requested', { source: 'web_tool', word_count: R.wordCount(r.text), signed_in: user.signedIn, depth: r.deep ? 'deep' : 'standard', as_typed: r.asTyped });
    try {
      const idToken = user.getToken ? await user.getToken().catch(() => user.idToken) : user.idToken;
      const { result } = await analyze(r.text, { idToken, fingerprint: getFingerprint, deep: r.deep, asTyped: r.asTyped });
      if (!user.signedIn) bumpGuestUsed(); // saved answers count too (Worker, 2026-10-26)
      if (usage && !premium()) {
        if (r.deep && typeof usage.deep === 'number') usage.deep = Math.max(0, usage.deep - 1);
        if (!r.deep && usage.standard) usage.standard.remaining = Math.max(0, usage.standard.remaining - 1);
        renderQuota();
      }
      track('irab_completed', { source: 'web_tool', word_count: result.words.length, latency_ms: Math.round(performance.now() - started), signed_in: user.signedIn, depth: r.deep ? 'deep' : 'standard' });
      try {
        addHistory({
          kind: 'analyze', uid: user.uid || 'anon', sentence: r.text,
          vocalized: result.vocalizedSentence, meaning: result.meaning ?? undefined,
          wordCount: result.words.length, data: result,
        });
      } catch { /* history is best-effort */ }
      renderResult(result, r);
    } catch (e) {
      const kind = e instanceof AnalyzeFailure ? e.reason.kind : 'failed';
      track('irab_failed', { source: 'web_tool', reason: kind });
      if (kind === 'guest_limit') showGate(s.guestTitle, s.guestBody);
      else if (kind === 'account_required') accountGate(r);
      else if (kind === 'daily_limit') {
        // The Worker is the authority: the day is used (in this browser or network too).
        if (usage?.standard) { usage.standard.remaining = 0; renderQuota(); } else void refreshUsage();
        show('compose');
        (window as any).IrabPaywall?.show();
      }
      else if (kind === 'deep_locked') { show('compose'); (window as any).IrabPaywall?.show({ reason: 'deep' }); }
      else if (kind === 'email') show('compose');
      else if (kind === 'too_long') { show('compose'); setNote(user.signedIn ? s.tooLong(MAX_WORDS) : s.tooManyChars(GUEST_CHARS)); }
      else if (kind === 'not_arabic') { show('compose'); setNote(s.arabicOnly); }
      else show('error');
    } finally {
      busy = false;
      stopSteps();
      syncInput();
      renderRecent();
    }
  }

  // ── Result (A4-A7) ───────────────────────────────────────────────────────
  const correctionEl = q('[data-correction]');
  const heroEl = q('[data-hero]');
  const jumpEl = q('[data-deep-jump-slot]');
  const cardsEl = q('[data-cards]');
  const noteEl = q('[data-note]');
  const deepEl = q('[data-deep]');

  function isCorrected(result: IrabResult): boolean {
    return !!(result.correctedSentence?.trim() && result.correctionNote?.trim()) && !result.asTyped;
  }
  function renderCorrection(result: IrabResult) {
    correctionEl.innerHTML = result.asTyped
      ? R.asTypedHtml(s)
      : isCorrected(result) ? R.correctionHtml(result, s, user.signedIn) : '';
    correctionEl.hidden = !correctionEl.innerHTML.trim();
  }
  function renderResult(result: IrabResult, r: Run) {
    last = { run: r, result };
    const corrected = isCorrected(result);
    renderCorrection(result);
    const caption = corrected ? s.afterCorrection : (R.isVocalized(result.words) ? s.withTashkeel : null);
    heroEl.innerHTML = R.heroHtml(result, s, caption);
    jumpEl.innerHTML = result.deep ? R.deepJumpHtml(s) : '';
    jumpEl.hidden = !result.deep;
    cardsEl.innerHTML = result.words.map((w, i) => R.wordCardHtml(w, i, s, teacherOn ? T.ask : null)).join('');
    renderTeacherSlot();
    const clar = result.additionalClarification?.trim();
    noteEl.innerHTML = clar ? R.clarificationHtml(clar, s) : '';
    noteEl.hidden = !clar;
    deepEl.innerHTML = result.deep ? R.deepHtml(result.deep, s) : '';
    deepEl.hidden = !result.deep;
    sticky.textContent = result.words.map((w) => w.word).join(' ');
    root.querySelectorAll<HTMLElement>('[data-pdf-crown]').forEach((c) => { c.hidden = user.premium; });
    show('result');
    observeHero();
  }

  // The sentence stays in view while the cards scroll (the app's top bar).
  let heroObserver: IntersectionObserver | null = null;
  function observeHero() {
    heroObserver?.disconnect();
    const target = heroEl.querySelector('.az-hero-words');
    if (!target || !('IntersectionObserver' in window)) return;
    heroObserver = new IntersectionObserver(([entry]) => {
      sticky.hidden = views.result.hidden || entry.isIntersecting || entry.boundingClientRect.top > 0;
    }, { rootMargin: '-72px 0px 0px 0px' });
    heroObserver.observe(target);
  }

  // ── «اسأل الأستاذ» (T1, T3, T10) ──────────────────────────────────────────
  const teacherOn = teacherEnabled();
  const T = TEACHER[lang];
  const teacherSlot = q<HTMLElement>('[data-teacher-slot]');
  const INTRO_SEEN = 'irab-teacher-intro-seen';
  function introSeen(): boolean {
    try { return localStorage.getItem(INTRO_SEEN) === '1'; } catch { return true; }
  }
  function renderTeacherSlot() {
    teacherSlot.hidden = !teacherOn;
    if (!teacherOn) return;
    teacherSlot.innerHTML = `
      <div class="az-report-row"><button type="button" class="tc-report" data-teacher-report>${I.messageQuestion}<span>${R.esc(T.reportError)}</span></button></div>
      <div class="tc-dock">
      ${introSeen() ? '' : `
        <div class="tc-intro" data-teacher-intro>
          <div class="tc-intro-head"><span class="tc-avatar">${I.graduationCap}</span><span class="t-body-strong c-1">${R.esc(T.ask)}</span></div>
          <p class="t-body-s c-2">${R.esc(T.introBody)}</p>
          <div class="tc-intro-acts">
            <button type="button" class="iu-btn teal" data-teacher-intro-try>${R.esc(T.introTry)}</button>
            <button type="button" class="iu-btn ghost" data-teacher-intro-later>${R.esc(T.introLater)}</button>
          </div>
        </div>`}
      <button type="button" class="tc-askbar" data-teacher-ask>
        <span class="tc-avatar">${I.graduationCap}</span><span>${R.esc(T.askPlaceholder)}</span><span class="tc-askbar-go">${I.arrowUp}</span>
      </button>
      </div>`;
  }
  function dismissIntro() {
    try { localStorage.setItem(INTRO_SEEN, '1'); } catch { /* shown again next time */ }
    teacherSlot.querySelector('[data-teacher-intro]')?.remove();
  }
  async function openTeacherFor(o: { focusWord?: number | null; pickReview?: boolean }) {
    if (!last) return;
    const result = last.result;
    // Whoever has opened the teacher has met it: no introduction again.
    dismissIntro();
    const { openTeacher } = await import('../teacher/teacher');
    openTeacher({
      lang,
      sentence: result.vocalizedSentence?.trim() || result.originalSentence,
      words: result.words.map((w) => ({ word: w.word, irab: w.irab, ...(w.case ? { case: w.case } : {}) })),
      corrected: isCorrected(result),
      focusWord: o.focusWord ?? null,
      pickReview: o.pickReview,
      getToken: async () => (user.getToken ? await user.getToken().catch(() => user.idToken) : user.idToken),
      loginHref: `${loginHref}${loginHref.includes('?') ? '&' : '?'}next=${encodeURIComponent(location.pathname)}`,
      onFix: (i, irab, kase) => {
        const w = result.words[i];
        if (!w) return;
        w.irab = irab;
        if (kase) w.case = kase;
        const card = cardsEl.querySelector<HTMLElement>(`#az-word-${i}`);
        if (card) card.outerHTML = R.wordCardHtml(w, i, s, T.ask);
      },
      track,
    });
    track('teacher_opened', { source: o.pickReview ? 'report' : o.focusWord != null ? 'word' : 'bar' });
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (teacherOn) {
      const ask = t.closest<HTMLElement>('[data-ask]');
      if (ask) { void openTeacherFor({ focusWord: Number(ask.dataset.ask) }); return; }
      if (t.closest('[data-teacher-ask]')) { void openTeacherFor({}); return; }
      if (t.closest('[data-teacher-report]')) { void openTeacherFor({ pickReview: true }); return; }
      if (t.closest('[data-teacher-intro-try]')) { dismissIntro(); void openTeacherFor({}); return; }
      if (t.closest('[data-teacher-intro-later]')) { dismissIntro(); return; }
    }
    const toggle = t.closest<HTMLButtonElement>('[data-details]');
    if (toggle) {
      const i = toggle.dataset.details!;
      const panel = root.querySelector<HTMLElement>(`#az-details-${i}`);
      if (!panel) return;
      const open = panel.hidden === true;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open);
      toggle.querySelector('[data-label]')!.textContent = open ? s.detailsHide : s.details;
      return;
    }
    const word = t.closest<HTMLElement>('[data-word]');
    if (word) {
      const card = root.querySelector<HTMLElement>(`#az-word-${word.dataset.word}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('is-flash');
        void card.offsetWidth;
        card.classList.add('is-flash');
      }
      return;
    }
    if (t.closest('[data-edit]') || t.closest('[data-back]') || t.closest('[data-error-edit]')) {
      if (last) input.value = last.run.text;
      syncInput();
      show('compose');
      input.focus({ preventScroll: true });
      return;
    }
    if (t.closest('[data-as-typed]') && last) { void run({ text: last.run.text, deep: false, asTyped: true }); return; }
    if (t.closest('[data-parse-corrected]') && last) { void run({ text: last.run.text, deep: false, asTyped: false }); return; }
    if (t.closest('[data-deep-jump]')) { root.querySelector('#az-deep')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.closest('[data-retry]') && lastRun) { void run(lastRun); return; }
    const recent = t.closest<HTMLElement>('[data-recent]');
    if (recent) {
      const item = getHistoryItem(recent.dataset.recent!);
      if (item?.data) { input.value = item.sentence; syncInput(); renderResult(item.data as IrabResult, { text: item.sentence, deep: false, asTyped: false }); }
    }
  });

  // ── Copy, share, PDF (A8) ────────────────────────────────────────────────
  async function busyButton(btn: HTMLButtonElement, task: () => Promise<void>) {
    if (btn.dataset.busy === '1') return;
    const label = btn.querySelector<HTMLElement>('[data-label]');
    const restore = label?.textContent ?? '';
    btn.dataset.busy = '1';
    btn.setAttribute('aria-busy', 'true');
    if (label) label.textContent = s.preparing;
    await new Promise((ok) => window.setTimeout(ok, 60));
    try { await task(); } catch (err) {
      console.warn('[irab-export]', err);
      if (label) { label.textContent = s.exportFailed; await new Promise((ok) => window.setTimeout(ok, 2000)); }
    } finally {
      btn.dataset.busy = '0';
      btn.removeAttribute('aria-busy');
      if (label) label.textContent = restore;
    }
  }
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!last) return;
    try {
      await navigator.clipboard.writeText(R.copyText(last.result));
      const label = btn.querySelector<HTMLElement>('[data-label]');
      btn.classList.add('is-done');
      if (label) { const old = label.textContent; label.textContent = s.copied; window.setTimeout(() => { label.textContent = old; btn.classList.remove('is-done'); }, 1600); }
      else window.setTimeout(() => btn.classList.remove('is-done'), 1600);
    } catch { /* clipboard blocked */ }
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((btn) => btn.addEventListener('click', () => {
    if (!last) return;
    track('irab_shared', { source: 'web_tool', kind: 'card' });
    void busyButton(btn, async () => (await import('./export')).shareCard(last!.result, s, lang, user.premium));
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-pdf]').forEach((btn) => btn.addEventListener('click', () => {
    if (!last) return;
    // PDF export is an Irab Plus feature, as in the app and on /pricing.
    if (!user.premium) {
      if (user.signedIn) (window as any).IrabPaywall?.show();
      else showGate(s.guestTitle, s.guestBody);
      return;
    }
    track('irab_shared', { source: 'web_tool', kind: 'pdf' });
    void busyButton(btn, async () => (await import('./export')).downloadReport(last!.result, s, lang));
  }));

  // ── Recent (A1) ──────────────────────────────────────────────────────────
  function renderRecent() {
    let items: { id: string; sentence: string; ts: number; words: number }[] = [];
    try {
      const all = [...getHistory('anon', 'analyze'), ...(user.uid ? getHistory(user.uid, 'analyze') : [])]
        .sort((a, b) => b.ts - a.ts);
      const seen = new Set<string>();
      items = all.filter((it) => it.data && !seen.has(it.sentence) && seen.add(it.sentence)).slice(0, 3)
        .map((it) => ({ id: it.id, sentence: it.sentence, ts: it.ts, words: it.wordCount ?? R.wordCount(it.sentence) }));
    } catch { items = []; }
    recentEl.innerHTML = R.recentHtml(items, s, lang, historyHref, (ts) => ago(ts, s));
    recentEl.hidden = items.length === 0;
  }

  // ── Voice input ──────────────────────────────────────────────────────────
  // Web Speech API, Arabic even on the English page. Stops by itself after a
  // pause, like the app's microphone (SilenceWatch: 1.8 s after words, 6 s
  // before any).
  const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let rec: any = null;
  let listening = false;
  let silence = 0;
  function micState(on: boolean, msg = '') {
    listening = on;
    micBtn.classList.toggle('is-live', on);
    micBtn.setAttribute('aria-pressed', String(on));
    micStatus.textContent = msg;
    micStatus.classList.toggle('c-error', !on && !!msg);
    micStatus.hidden = !msg;
  }
  function stopListening() {
    window.clearTimeout(silence);
    if (rec) { try { rec.stop(); } catch { /* stopped */ } }
    if (listening) micState(false);
  }
  if (SpeechRec) {
    micBtn.hidden = false;
    micBtn.addEventListener('click', () => {
      if (listening) { stopListening(); return; }
      rec = new SpeechRec();
      rec.lang = 'ar-SA';
      rec.continuous = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      rec.interimResults = true;
      const base = input.value.trim();
      const arm = (ms: number) => { window.clearTimeout(silence); silence = window.setTimeout(stopListening, ms); };
      rec.onstart = () => { micState(true, `${s.listening} ${s.tapMicToStop}`); arm(6000); };
      rec.onresult = (e: any) => {
        const parts: string[] = [];
        for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
        const spoken = parts.join(' ').replace(/\s+/g, ' ').trim();
        input.value = [base, spoken].filter(Boolean).join(' ').slice(0, user.signedIn ? MEMBER_CHARS : GUEST_CHARS);
        arabic.sanitize();
        syncInput();
        arm(1800);
      };
      rec.onerror = (e: any) => {
        const code = e?.error;
        if (code === 'aborted') return;
        const msg = code === 'not-allowed' || code === 'service-not-allowed' ? s.micDenied
          : code === 'no-speech' ? s.micNoSpeech
          : code === 'audio-capture' ? s.micNoMic
          : code === 'network' ? s.micNetwork
          : code === 'language-not-supported' ? s.micNoLang : s.micError;
        window.clearTimeout(silence);
        micState(false, msg);
      };
      rec.onend = () => { window.clearTimeout(silence); if (listening) micState(false); };
      try { rec.start(); } catch { micState(false, s.micError); }
    });
    window.addEventListener('pagehide', stopListening);
  }

  // ── Start ────────────────────────────────────────────────────────────────
  setMode('standard');
  input.maxLength = GUEST_CHARS;
  syncInput();
  renderRecent();
  try {
    const params = new URLSearchParams(location.search);
    const h = params.get('h');
    const item = h ? getHistoryItem(h) : null;
    if (item && item.kind === 'analyze' && item.data) {
      input.value = item.sentence;
      syncInput();
      renderResult(item.data as IrabResult, { text: item.sentence, deep: false, asTyped: false });
    } else {
      const prefill = params.get('s');
      if (prefill) { input.value = prefill.slice(0, MEMBER_CHARS); arabic.sanitize(); syncInput(); }
    }
  } catch { /* ignore */ }

  // Firebase loads only when this browser has signed in before.
  if (maybeSignedIn()) {
    (async () => {
      try {
        const [{ onAuth }, { fetchMe }] = await Promise.all([import('../auth'), import('../entitlement')]);
        onAuth(async (u) => {
          if (!u) return;
          user.signedIn = true;
          user.uid = u.uid;
          user.getToken = () => u.getIdToken();
          try { user.idToken = await u.getIdToken(); } catch { /* retried per request */ }
          try { const me = await fetchMe(u); user.premium = me?.premium === true; } catch { /* free */ }
          void refreshUsage();
          input.maxLength = MEMBER_CHARS;
          gate.hidden = true;
          renderRecent();
          root.querySelectorAll<HTMLElement>('[data-pdf-crown]').forEach((c) => { c.hidden = user.premium; });
          // «أعرب كما كتبتُها» needs an account: offer it now that there is one.
          if (last) renderCorrection(last.result);
        });
      } catch { /* the guest path already works */ }
    })();
  }
}

