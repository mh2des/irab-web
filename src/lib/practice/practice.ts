/**
 * «أعرب بنفسك» on the web, screen for screen the app's (P1 compose, P2 one
 * word at a time, P2c review, P3 the teacher reading, P4 the result).
 * Mounted by components/practice/FeedbackPractice.astro.
 */
import { grade, checksLeft, GradeFailure, type GradeResult } from './api';
import { PRACTICE } from './strings';
import * as R from './render';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import * as I from '../irab/icons';
import { maybeSignedIn } from '../session';
import { addHistory, getHistoryItem } from '../history';
import { guardArabicOnly } from '../../scripts/arabic-only';

const MIN_WORDS = 2;
const MAX_WORDS = 15;

type View = 'loading' | 'gate' | 'compose' | 'stepper' | 'review' | 'grading' | 'results' | 'error';

export function mountPractice(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'ar';
  const s = PRACTICE[lang];
  const D = (n: number | string) => digits(n, lang);
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const track = (e: string, p?: Record<string, string | number | boolean | null | undefined>) =>
    import('../analytics').then((m) => m.track(e, p)).catch(() => {});

  const views = Object.fromEntries((['loading', 'gate', 'compose', 'stepper', 'review', 'grading', 'results', 'error'] as View[])
    .map((v) => [v, q(`[data-view="${v}"]`)])) as Record<View, HTMLElement>;
  const input = q<HTMLTextAreaElement>('[data-input]');
  const counter = q('[data-counter]');
  const quota = q('[data-quota]');
  const quotaText = q('[data-quota-text]');
  const start = q<HTMLButtonElement>('[data-start]');
  const composeMsg = q('[data-compose-msg]');
  const checkBtn = q<HTMLButtonElement>('[data-check]');
  const reviewQuota = q('[data-review-quota]');

  const user = { uid: null as string | null, email: null as string | null, getToken: null as null | (() => Promise<string>) };
  let authResolved = false;
  let left: number | null = null;
  let sentence = '';
  let words: string[] = [];
  let answers: string[] = [];
  let index = 0;
  let last: GradeResult | null = null;

  const arabic = guardArabicOnly(input, { note: q('[data-arabic-only-note]'), linger: 4500 });

  function show(v: View, scroll = true) {
    (Object.keys(views) as View[]).forEach((k) => { views[k].hidden = k !== v; });
    if (scroll) {
      const top = root.getBoundingClientRect().top + window.scrollY - 88;
      if (window.scrollY > top + 10) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ── Allowance ────────────────────────────────────────────────────────────
  function renderQuota() {
    const known = left !== null && left !== Infinity;
    quota.hidden = !known;
    quota.classList.toggle('is-out', known && (left as number) <= 0);
    if (known) quotaText.textContent = D(s.checksLeft(left as number));
    reviewQuota.textContent = known ? D(s.checksLeft(left as number)) : '';
    reviewQuota.hidden = !known;
  }
  async function refreshQuota() {
    if (!user.getToken) return;
    const token = await user.getToken().catch(() => null);
    if (token) { left = await checksLeft(token); renderQuota(); }
  }

  // ── P1: the sentence ─────────────────────────────────────────────────────
  const split = (t: string) => t.trim().split(/\s+/).filter(Boolean);
  function syncInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 78), 190)}px`;
    const n = split(input.value).length;
    counter.textContent = D(s.words(n));
    counter.classList.toggle('c-error', n > MAX_WORDS);
    q('[data-composer]').classList.toggle('is-filled', n > 0);
    start.disabled = n === 0;
  }
  function note(el: HTMLElement, text: string) { el.textContent = text; el.hidden = !text; }
  input.addEventListener('input', () => { note(composeMsg, ''); syncInput(); });
  input.addEventListener('focus', () => q('[data-composer]').classList.add('is-focused'));
  input.addEventListener('blur', () => q('[data-composer]').classList.remove('is-focused'));
  start.addEventListener('click', () => {
    arabic.sanitize();
    const list = split(input.value);
    if (list.length < MIN_WORDS) { note(composeMsg, s.tooShort); return; }
    if (list.length > MAX_WORDS) { note(composeMsg, s.tooLong); return; }
    const text = list.join(' ');
    if (text !== sentence || answers.length !== list.length) answers = list.map(() => '');
    sentence = text;
    words = list;
    track('practice_custom_started', { word_count: words.length });
    openWord(0);
  });

  // ── P2: one word at a time ───────────────────────────────────────────────
  const strip = q('[data-strip]');
  const progress = q('[data-progress]');
  const answer = q<HTMLTextAreaElement>('[data-answer]');
  const terms = q('[data-terms]');
  function renderStepper() {
    progress.innerHTML = words.map((_, i) =>
      `<span class="${i < index || answers[i].trim() ? 'is-done' : ''}${i === index ? ' is-on' : ''}"></span>`).join('');
    strip.innerHTML = words.map((w, i) =>
      `<button type="button" class="fp-strip-word t-context${i === index ? ' is-on' : ''}" data-go="${i}">${esc(w)}</button>`).join('');
    q('[data-word-n]').textContent = D(s.wordNofM(index + 1, words.length));
    q('[data-word]').textContent = words[index];
    answer.value = answers[index];
    terms.innerHTML = R.quickTerms(sentence).map((t) => `<button type="button" class="fp-term" data-term="${esc(t)}">${esc(t)}</button>`).join('');
  }
  function openWord(i: number) {
    index = i;
    renderStepper();
    show('stepper');
    window.setTimeout(() => answer.focus({ preventScroll: true }), 60);
  }
  answer.addEventListener('input', () => {
    answers[index] = answer.value;
    progress.children[index]?.classList.toggle('is-done', !!answer.value.trim());
  });
  answer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next(); }
  });
  function next() {
    answers[index] = answer.value;
    if (index < words.length - 1) openWord(index + 1);
    else openReview();
  }
  q('[data-next]').addEventListener('click', next);
  q('[data-previous]').addEventListener('click', () => {
    answers[index] = answer.value;
    if (index > 0) openWord(index - 1);
    else show('compose');
  });
  terms.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-term]');
    if (!b) return;
    const text = answer.value.trimEnd();
    answer.value = text ? `${text} ${b.dataset.term}` : b.dataset.term!;
    answer.dispatchEvent(new Event('input'));
    answer.focus({ preventScroll: true });
  });
  strip.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (!b) return;
    answers[index] = answer.value;
    openWord(Number(b.dataset.go));
  });

  // ── P2c: review ──────────────────────────────────────────────────────────
  const reviewList = q('[data-review-list]');
  const allAnswered = () => answers.every((a) => a.trim().length > 0);
  function openReview() {
    reviewList.innerHTML = words.map((w, i) => {
      const a = answers[i].trim();
      return `
        <button type="button" class="iu-card fp-review-row" data-go="${i}">
          <span class="fp-review-text">
            <span class="t-word c-word" dir="rtl" lang="ar">${esc(w)}</span>
            <span class="t-caption c-3">${esc(D(s.answerN(i + 1)))}</span>
            <span class="t-body-s ${a ? 'c-1' : 'c-error'}" dir="rtl" lang="ar">${esc(a || s.answerMissing)}</span>
          </span>
          <span class="fp-review-edit">${I.pencil}</span>
        </button>`;
    }).join('');
    checkBtn.disabled = !allAnswered();
    note(q('[data-review-msg]'), '');
    show('review');
  }
  reviewList.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (b) openWord(Number(b.dataset.go));
  });
  q('[data-review-back]').addEventListener('click', () => openWord(words.length - 1));
  checkBtn.addEventListener('click', () => { void check(); });

  // ── P3, P4: grading and the result ───────────────────────────────────────
  let stepTimers: number[] = [];
  function startSteps() {
    views.grading.innerHTML = R.gradingHtml(sentence, s);
    const items = Array.from(views.grading.querySelectorAll<HTMLElement>('[data-step]'));
    const mark = (i: number, st: 'active' | 'done') => {
      const li = items[i];
      if (!li) return;
      li.dataset.state = st;
      li.querySelector('span:last-child')!.textContent = st === 'done' ? li.dataset.done! : li.dataset.doing!;
    };
    mark(0, 'active');
    [900, 3200].forEach((ms, i) => stepTimers.push(window.setTimeout(() => { mark(i, 'done'); mark(i + 1, 'active'); }, ms)));
  }

  async function check() {
    if (!allAnswered()) return;
    startSteps();
    show('grading');
    const started = performance.now();
    track('practice_custom_submitted', { word_count: words.length });
    try {
      const token = user.getToken ? await user.getToken().catch(() => null) : null;
      const result = await grade(sentence, words.map((w, i) => ({ word: w, irab: answers[i].trim() })), token);
      last = result;
      if (left !== null && left !== Infinity) left = Math.max(0, left - 1);
      renderQuota();
      track('practice_custom_completed', { score: result.score, word_count: words.length, latency_ms: Math.round(performance.now() - started) });
      try {
        addHistory({
          kind: 'practice', uid: user.uid || 'anon', sentence, score: result.score, level: result.level,
          correctCount: result.wordFeedback.filter((w) => w.isCorrect).length, totalCount: result.wordFeedback.length, data: result,
        });
      } catch { /* history is best-effort */ }
      renderResults(result);
    } catch (e) {
      const kind = e instanceof GradeFailure ? e.kind : 'failed';
      track('practice_custom_failed', { reason: kind });
      if (kind === 'limit' || kind === 'premium') {
        left = 0;
        renderQuota();
        openReview();
        (window as any).IrabPaywall?.show({ uid: user.uid ?? undefined, email: user.email ?? undefined, reason: 'limit' });
      } else if (kind === 'session') {
        openReview();
        note(q('[data-review-msg]'), s.sessionEnded);
      } else {
        show('error');
      }
    } finally {
      stepTimers.forEach(clearTimeout);
      stepTimers = [];
    }
  }

  function renderResults(r: GradeResult) {
    last = r;
    q('[data-results]').innerHTML = R.resultsHtml(r, s, lang);
    show('results');
    // Next frame, so the ring animates; the timer covers a tab that renders no frames.
    const draw = () => q('[data-results]').querySelector('.fp-ring')?.classList.add('is-drawn');
    requestAnimationFrame(draw);
    window.setTimeout(draw, 120);
  }

  q('[data-retry]').addEventListener('click', () => { if (words.length) openWord(0); });
  q('[data-new]').addEventListener('click', () => {
    input.value = '';
    sentence = '';
    words = [];
    answers = [];
    syncInput();
    show('compose');
    input.focus({ preventScroll: true });
  });
  root.querySelectorAll('[data-to-compose]').forEach((b) => b.addEventListener('click', () => show('compose')));
  q('[data-error-retry]').addEventListener('click', () => { void check(); });
  q('[data-error-edit]').addEventListener('click', openReview);

  // Share: the A4 report and plain text, as in the app's sheet.
  const menu = q('[data-share-menu]');
  q('[data-share]').addEventListener('click', () => { menu.hidden = !menu.hidden; });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !(e.target as HTMLElement).closest('[data-share], [data-share-menu]')) menu.hidden = true;
  });
  q('[data-share-pdf]').addEventListener('click', async (e) => {
    if (!last) return;
    const btn = e.currentTarget as HTMLButtonElement;
    const label = btn.querySelector<HTMLElement>('[data-label]')!;
    const restore = label.textContent;
    label.textContent = s.preparing;
    btn.disabled = true;
    try {
      await (await import('./export')).downloadPracticeReport(last, s, lang);
      track('practice_shared', { kind: 'pdf' });
    } catch (err) {
      console.warn('[practice-pdf]', err);
      label.textContent = s.exportFailed;
      await new Promise((ok) => window.setTimeout(ok, 1800));
    } finally {
      label.textContent = restore;
      btn.disabled = false;
      menu.hidden = true;
    }
  });
  q('[data-share-text]').addEventListener('click', async (e) => {
    if (!last) return;
    const text = R.reportText(last, s, lang);
    const label = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-label]')!;
    try {
      if (navigator.share) await navigator.share({ title: s.pdfTitle, text });
      else {
        await navigator.clipboard.writeText(text);
        const restore = label.textContent;
        label.textContent = s.copied;
        window.setTimeout(() => { label.textContent = restore; }, 1500);
      }
      track('practice_shared', { kind: 'text' });
    } catch { /* cancelled */ }
    menu.hidden = true;
  });

  // ── Voice input ──────────────────────────────────────────────────────────
  const mic = q<HTMLButtonElement>('[data-mic]');
  const micStatus = q('[data-mic-status]');
  const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRec) {
    mic.hidden = false;
    let rec: any = null;
    let silence = 0;
    const stop = () => { window.clearTimeout(silence); try { rec?.stop(); } catch { /* stopped */ } };
    const ui = (on: boolean) => { mic.classList.toggle('is-live', on); mic.setAttribute('aria-pressed', String(on)); note(micStatus, on ? s.listening : ''); };
    mic.addEventListener('click', () => {
      if (mic.classList.contains('is-live')) { stop(); return; }
      rec = new SpeechRec();
      rec.lang = 'ar-SA';
      rec.continuous = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      rec.interimResults = true;
      const base = input.value.trim();
      const arm = (ms: number) => { window.clearTimeout(silence); silence = window.setTimeout(stop, ms); };
      rec.onstart = () => { ui(true); arm(6000); };
      rec.onresult = (ev: any) => {
        const parts: string[] = [];
        for (let i = 0; i < ev.results.length; i++) parts.push(ev.results[i][0].transcript);
        input.value = [base, parts.join(' ').replace(/\s+/g, ' ').trim()].filter(Boolean).join(' ');
        arabic.sanitize();
        syncInput();
        arm(1800);
      };
      rec.onerror = () => { window.clearTimeout(silence); ui(false); };
      rec.onend = () => { window.clearTimeout(silence); ui(false); };
      try { rec.start(); } catch { ui(false); }
    });
    window.addEventListener('pagehide', stop);
  }

  // ── Start ────────────────────────────────────────────────────────────────
  syncInput();
  function openFirst() {
    try {
      const h = new URLSearchParams(location.search).get('h');
      const item = h ? getHistoryItem(h) : null;
      if (item?.kind === 'practice' && item.data && Array.isArray((item.data as any).wordFeedback)) {
        const d = item.data as GradeResult;
        sentence = d.sentence || item.sentence;
        words = split(sentence);
        answers = d.wordFeedback.map((w) => w.userIrab);
        renderResults({ ...d, sentence });
        return;
      }
    } catch { /* ignore */ }
    show('compose', false);
  }
  if (!maybeSignedIn()) { show('gate', false); return; }
  // The sign-in screen replaces only an empty writing screen: never a result
  // from history or answers in progress.
  const idle = () => !views.compose.hidden && !input.value.trim();
  // A returning user's writing screen paints now; Firebase loads behind it,
  // and only the check itself needs the token.
  openFirst();
  (async () => {
    try {
      const { onAuth } = await import('../auth');
      onAuth(async (u) => {
        authResolved = true;
        if (!u) {
          user.getToken = null;
          if (idle()) show('gate', false);
          return;
        }
        user.uid = u.uid;
        user.email = u.email;
        user.getToken = () => u.getIdToken();
        await refreshQuota();
      });
    } catch {
      if (!authResolved && idle()) show('gate', false);
    }
  })();
}
