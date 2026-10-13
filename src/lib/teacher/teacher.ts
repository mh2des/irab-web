/**
 * «اسأل الأستاذ» on the website: one panel, opened from an analysis (the ask
 * bar, a word card, «أرى خطأً في الإعراب») or a graded practice answer. It
 * follows the app's TeacherController: the analysis the student sees is
 * sent with every question, answers stream in with a stop button, a stopped
 * or failed answer is not counted, and a review that fixes a word updates
 * that word's card. A bottom sheet on phones; on wide screens a panel
 * beside the result, so the word cards stay in view.
 */
import {
  askTeacher, answerText, rateAnswer, teacherLeft, TeacherFailure,
  type TeacherAnswer, type TeacherMode, type TeacherPartial, type TeacherTurn, type TeacherUsage,
} from './api';
import * as R from './render';
import { TEACHER } from './strings';
import type { Lang } from '../irab/strings';
import * as I from '../irab/icons';
import '../../styles/irab-teacher.css';

export interface TeacherOpen {
  lang: Lang;
  sentence: string;
  words: R.CtxWord[];
  /** The analyzer corrected the sentence before analysing it. */
  corrected?: boolean;
  focusWord?: number | null;
  /** T10: the student disputes a word; null with [pickReview] asks which. */
  reviewWord?: number | null;
  pickReview?: boolean;
  /** T7: opened from a graded practice answer. */
  practice?: { sentence: string; word: string; userIrab: string; correctIrab: string; explanation?: string } | null;
  autoAsk?: string;
  /** A fresh ID token, or null for a visitor who is not signed in. */
  getToken: () => Promise<string | null>;
  loginHref: string;
  onFix?: (wordIndex: number, irab: string, kase: string | null) => void;
  /** Wide screens: a panel beside the result, or a centred dialog. */
  layout?: 'side' | 'dialog';
  track?: (event: string, props?: Record<string, string | number | boolean | null | undefined>) => void;
}

type Entry =
  | { kind: 'student'; text: string }
  | ({ kind: 'answer' } & R.AnswerView)
  | { kind: 'stopped'; draft: TeacherPartial | null }
  | { kind: 'failed'; message?: string }
  | { kind: 'limit' };

const QUIZ_REQUEST = /^\s*(?:اختبرني|اختبرنى|quiz me)/i;
const WIDE = '(min-width: 900px)';
/** Wide enough for the result column and the panel side by side. */
const DOCK = '(min-width: 1180px)';

let panel: Panel | null = null;

/** Opens the teacher; one panel at a time, a new open replaces the last. */
export function openTeacher(o: TeacherOpen): void {
  panel?.close(true);
  panel = new Panel(o);
}

class Panel {
  private s;
  private root: HTMLElement;
  private q = <T extends Element>(sel: string) => this.root.querySelector<T>(sel)!;
  private entries: Entry[] = [];
  private nodes = new Map<Entry, HTMLElement>();
  private busy = false;
  private draft: TeacherPartial | null = null;
  private usage: TeacherUsage | null = null;
  private focus: number | null;
  private review: number | null;
  private picking: boolean;
  private abort: AbortController | null = null;
  private retry: (() => void) | null = null;
  private signedIn: boolean | null = null;
  private opener = document.activeElement as HTMLElement | null;
  private writingNode: HTMLElement | null = null;
  private suggestions: R.Suggestion[] = [];

  constructor(private o: TeacherOpen) {
    this.s = TEACHER[o.lang];
    this.focus = o.focusWord ?? o.reviewWord ?? null;
    this.review = o.reviewWord ?? null;
    this.picking = !!o.pickReview && this.review === null;
    this.root = this.build();
    document.body.appendChild(this.root);
    document.documentElement.classList.add('tc-open');
    this.place();
    this.media.addEventListener('change', this.place);
    requestAnimationFrame(() => this.root.classList.add('is-in'));
    this.wire();
    this.renderAll();
    void this.start();
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  private build(): HTMLElement {
    const s = this.s;
    const el = document.createElement('div');
    el.className = 'iu tc-root';
    el.dir = this.o.lang === 'ar' ? 'rtl' : 'ltr';
    el.innerHTML = `
      <div class="tc-scrim" data-act="close"></div>
      <section class="tc-panel" role="dialog" aria-modal="true" aria-labelledby="tc-title">
        <div class="tc-grab" aria-hidden="true"></div>
        <header class="tc-header">
          ${R.avatarHtml('md')}
          <div class="tc-titles"><h2 id="tc-title" class="t-title c-1">${s.title}</h2><p class="t-caption c-3" data-sub></p></div>
          <span data-left></span>
          <button type="button" class="iu-icon-btn" data-act="close" aria-label="${s.close}" title="${s.close}">${I.x}</button>
        </header>
        <div class="tc-context" data-context></div>
        <div class="tc-scroll" data-scroll>
          <div class="tc-list" data-list aria-live="polite"></div>
        </div>
        <button type="button" class="tc-jump" data-jump aria-label="${s.toLatest}" title="${s.toLatest}" hidden>${I.chevronDown}</button>
        <div class="tc-follow" data-follow hidden></div>
        <div class="tc-limitbar" data-limitbar hidden>
          <span class="tc-crown">${I.crown}</span>
          <span class="tc-limitbar-text"><span class="t-label c-1">${s.limitTitle}</span><span class="t-caption c-2">${s.limitBody}</span></span>
          <button type="button" class="iu-btn primary" data-act="plus">${I.crown}<span>${s.limitCtaShort}</span></button>
        </div>
        <form class="tc-composer" data-composer>
          <textarea data-input rows="1" maxlength="500" dir="auto" aria-label="${s.inputHint}"></textarea>
          <button type="button" class="iu-icon-btn tc-mic" data-mic aria-label="${s.micStart}" title="${s.micStart}" hidden>${I.mic}</button>
          <button type="submit" class="tc-send" data-send aria-label="${s.send}" title="${s.send}">${I.arrowUp}</button>
        </form>
      </section>`;
    return el;
  }

  private wire(): void {
    const input = this.q<HTMLTextAreaElement>('[data-input]');
    const scroll = this.q<HTMLElement>('[data-scroll]');
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.q<HTMLFormElement>('[data-composer]').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.busy) { this.stop(); return; }
      this.send(input.value);
    });
    input.addEventListener('input', () => { this.grow(); this.renderComposer(); });
    input.addEventListener('keydown', (e) => {
      // Enter sends, Shift+Enter is a new line (as in the analyzer's ⌘+Enter
      // for a long sentence, a question is one line).
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!this.busy) this.send(input.value);
      }
    });
    scroll.addEventListener('scroll', () => {
      const far = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight > 240;
      this.q<HTMLElement>('[data-jump]').hidden = !far;
    }, { passive: true });
    this.keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      if (e.key === 'Tab') this.trap(e);
    };
    document.addEventListener('keydown', this.keydown);
    this.wireMic(input);
  }
  private keydown: (e: KeyboardEvent) => void = () => {};

  /** Beside the result when both fit (under the sticky nav, the page moves
   *  over); otherwise a centred dialog; a bottom sheet on phones (CSS). */
  private media = window.matchMedia(DOCK);
  private place = () => {
    const side = (this.o.layout ?? 'side') === 'side' && this.media.matches;
    this.root.dataset.layout = side ? 'side' : 'dialog';
    const nav = document.querySelector<HTMLElement>('nav.sticky');
    this.root.style.setProperty('--tc-top', `${nav ? Math.round(nav.getBoundingClientRect().height) : 0}px`);
    document.documentElement.classList.toggle('tc-docked', side);
  };

  /** Keeps Tab inside the dialog. */
  private trap(e: KeyboardEvent): void {
    const f = Array.from(this.root.querySelectorAll<HTMLElement>('button:not([disabled]):not([hidden]), a[href], textarea:not([disabled])'))
      .filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  close(instant = false): void {
    this.stop();
    document.removeEventListener('keydown', this.keydown);
    this.stopMic?.();
    document.documentElement.classList.remove('tc-open', 'tc-docked');
    this.media.removeEventListener('change', this.place);
    const el = this.root;
    if (instant) el.remove();
    else {
      el.classList.remove('is-in');
      window.setTimeout(() => el.remove(), 260);
    }
    if (panel === this) panel = null;
    this.opener?.focus?.({ preventScroll: true });
  }

  private async start(): Promise<void> {
    const token = await this.o.getToken().catch(() => null);
    this.signedIn = !!token;
    if (token) {
      this.usage = await teacherLeft(token);
      if (this.usage && this.usage.remaining === 0 && !this.entries.length) this.entries.push({ kind: 'limit' });
    }
    this.renderAll();
    if (token && this.o.autoAsk && !this.limitReached) this.send(this.o.autoAsk);
    else if (window.matchMedia(WIDE).matches) this.q<HTMLTextAreaElement>('[data-input]').focus({ preventScroll: true });
  }

  private get limitReached(): boolean {
    return !!this.usage && this.usage.remaining === 0;
  }
  private get reviewing(): boolean {
    return this.review !== null && !this.entries.some((e) => e.kind === 'answer');
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  private renderAll(): void {
    const s = this.s;
    this.q<HTMLElement>('[data-sub]').textContent = this.o.practice ? s.subPractice : this.review !== null || this.picking ? s.subReview : s.sub;
    this.q<HTMLElement>('[data-left]').innerHTML = R.leftPillHtml(this.usage, s, this.o.lang);
    this.q<HTMLElement>('[data-context]').innerHTML = R.contextHtml({
      words: this.o.words, focus: this.focus, reviewing: this.review !== null || this.picking, practice: this.o.practice ?? null,
    }, s);
    const list = this.q<HTMLElement>('[data-list]');
    list.replaceChildren();
    this.nodes.clear();
    this.writingNode = null;
    const solo = this.signedIn === false
      ? R.accountHtml(s, this.o.loginHref)
      : this.picking
        ? R.pickerHtml(this.o.words, s)
        : !this.entries.length && !this.busy
          ? R.emptyHtml(this.suggestions = R.suggestions(this.o.words, !!this.o.corrected, this.focus, s), this.reviewing, s)
          : '';
    this.root.classList.toggle('is-solo', !!solo);
    if (solo) list.innerHTML = solo;
    else {
      for (const e of this.entries) list.appendChild(this.node(e, false));
      this.renderBusy();
    }
    this.renderFollow();
    this.renderComposer();
  }

  private node(e: Entry, arrive: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = `tc-entry tc-e-${e.kind}${arrive && e.kind !== 'answer' ? ' tc-arrive' : ''}`;
    el.innerHTML = this.entryHtml(e);
    this.nodes.set(e, el);
    return el;
  }

  private entryHtml(e: Entry): string {
    const s = this.s;
    switch (e.kind) {
      case 'student': return R.studentHtml(e.text);
      case 'answer': return R.answerHtml(e, s, this.o.lang);
      case 'stopped': return R.stoppedHtml(e.draft, s);
      case 'failed': return R.failedHtml(s, e.message);
      case 'limit': return R.limitHtml(s);
    }
  }

  private refresh(e: Entry): void {
    const el = this.nodes.get(e);
    if (el) el.innerHTML = this.entryHtml(e);
  }

  private add(e: Entry): void {
    if (this.root.classList.contains('is-solo')) { this.entries.push(e); this.renderAll(); this.toBottom(); return; }
    this.entries.push(e);
    this.writingNode?.remove();
    this.writingNode = null;
    this.q<HTMLElement>('[data-list]').appendChild(this.node(e, true));
    this.renderBusy();
    this.toBottom();
  }

  /** The thinking row, or the answer as it is being written. */
  private renderBusy(): void {
    const list = this.q<HTMLElement>('[data-list]');
    if (!this.busy) { this.writingNode?.remove(); this.writingNode = null; return; }
    if (!this.writingNode) {
      this.writingNode = document.createElement('div');
      this.writingNode.className = 'tc-entry tc-writing tc-arrive';
      list.appendChild(this.writingNode);
    }
    this.writingNode.innerHTML = this.draft ? R.writingHtml(this.draft, this.s) : R.thinkingHtml(this.s);
  }

  private renderFollow(): void {
    const box = this.q<HTMLElement>('[data-follow]');
    const last = [...this.entries].reverse().find((e) => e.kind === 'answer') as (Entry & { kind: 'answer' }) | undefined;
    const tail = this.entries[this.entries.length - 1];
    const items = this.busy || !last || tail?.kind === 'limit' || this.limitReached
      ? []
      : last.answer.mode === 'quiz' ? [this.s.quizAnother, this.s.quizHarder]
        : last.answer.mode === 'ask' ? last.answer.followUps : [];
    box.hidden = !items.length;
    box.innerHTML = items.map((t, i) => `<button type="button" class="tc-chip" data-follow-i="${i}" data-quiz="${last?.answer.mode === 'quiz'}" dir="auto"><span>${escapeHtml(t)}</span></button>`).join('');
    this.followItems = items;
  }
  private followItems: string[] = [];

  private renderComposer(): void {
    const s = this.s;
    const input = this.q<HTMLTextAreaElement>('[data-input]');
    const send = this.q<HTMLButtonElement>('[data-send]');
    const off = this.signedIn === false || this.picking || this.limitReached;
    input.disabled = off;
    input.placeholder = this.limitReached ? s.renewsTomorrow
      : this.reviewing && this.review !== null ? s.reviewHint(this.o.words[this.review]?.word ?? '')
        : this.listening ? s.listening : s.inputHint;
    const can = !off && (this.busy || input.value.trim().length > 0);
    send.disabled = !can;
    send.classList.toggle('is-busy', this.busy);
    send.innerHTML = this.busy ? I.square : I.arrowUp;
    send.setAttribute('aria-label', this.busy ? s.stop : s.send);
    send.title = this.busy ? s.stop : s.send;
    this.q<HTMLElement>('[data-composer]').classList.toggle('is-off', off);
    // The allowance ran out with this answer: say so where the input was,
    // with the way to more (the limit card already does when it is shown).
    const spent = this.limitReached && this.signedIn !== false;
    const cardShown = this.entries[this.entries.length - 1]?.kind === 'limit';
    this.q<HTMLElement>('[data-limitbar]').hidden = !spent || cardShown;
    this.q<HTMLElement>('[data-composer]').hidden = spent;
    const mic = this.root.querySelector<HTMLButtonElement>('[data-mic]');
    if (mic) mic.disabled = off;
  }

  private grow(): void {
    const t = this.q<HTMLTextAreaElement>('[data-input]');
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 132)}px`;
  }

  private toBottom(): void {
    const sc = this.q<HTMLElement>('[data-scroll]');
    requestAnimationFrame(() => sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' }));
  }

  /** Keeps the answer being written in view unless the student scrolled up. */
  private follow(): void {
    const sc = this.q<HTMLElement>('[data-scroll]');
    if (sc.scrollHeight - sc.scrollTop - sc.clientHeight < 160) sc.scrollTop = sc.scrollHeight;
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  private onClick(ev: MouseEvent): void {
    const t = ev.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]');
    const entryEl = t.closest<HTMLElement>('.tc-entry');
    const entry = entryEl ? [...this.nodes].find(([, n]) => n === entryEl)?.[0] : undefined;
    if (act) {
      const a = act.dataset.act;
      if (a === 'close') { this.close(); return; }
      if (a === 'retry') { this.retry?.(); return; }
      if (a === 'plus') {
        this.o.track?.('teacher_upgrade_tapped', {});
        const pw = (window as any).IrabPaywall;
        if (pw?.show) { this.close(true); pw.show({ reason: 'limit' }); } else location.href = this.o.lang === 'ar' ? '/pricing' : '/en/pricing';
        return;
      }
      if (entry?.kind === 'answer') this.answerAction(entry, a!, act);
      return;
    }
    const sg = t.closest<HTMLElement>('[data-sg]');
    if (sg) {
      const g = this.suggestions[Number(sg.dataset.sg)];
      if (g) g.quiz ? this.quiz(g.text) : this.ask(g.text, g.wordIndex ?? null);
      return;
    }
    const fu = t.closest<HTMLElement>('[data-follow-i]');
    if (fu) {
      const text = this.followItems[Number(fu.dataset.followI)];
      if (text) fu.dataset.quiz === 'true' ? this.quiz(text) : this.ask(text, null);
      return;
    }
    const fw = t.closest<HTMLElement>('[data-focus]');
    if (fw && !this.picking && this.review === null) {
      const i = Number(fw.dataset.focus);
      this.focus = this.focus === i ? null : i;
      this.q<HTMLElement>('[data-context]').querySelectorAll<HTMLElement>('[data-focus]').forEach((b) => {
        const on = Number(b.dataset.focus) === this.focus;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (!this.entries.length && !this.busy) this.renderAll();
      return;
    }
    const pick = t.closest<HTMLElement>('[data-pick]');
    if (pick) {
      this.review = Number(pick.dataset.pick);
      this.focus = this.review;
      this.picking = false;
      this.renderAll();
      this.q<HTMLTextAreaElement>('[data-input]').focus();
      return;
    }
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt && entry?.kind === 'answer' && entry.picked === null && entry.answer.mode === 'quiz') {
      entry.picked = Number(opt.dataset.opt);
      this.o.track?.('teacher_quiz_answered', { correct: entry.picked === entry.answer.answerIndex });
      this.refresh(entry);
      this.renderFollow();
      this.toBottom();
      return;
    }
    const reason = t.closest<HTMLElement>('[data-reason]');
    if (reason && entry?.kind === 'answer') {
      const k = reason.dataset.reason!;
      entry.reasons.has(k) ? entry.reasons.delete(k) : entry.reasons.add(k);
      reason.classList.toggle('is-on', entry.reasons.has(k));
      reason.setAttribute('aria-pressed', String(entry.reasons.has(k)));
    }
  }

  private answerAction(e: Entry & { kind: 'answer' }, a: string, btn: HTMLElement): void {
    const s = this.s;
    if (a === 'copy') {
      void navigator.clipboard?.writeText(answerText(e.answer)).then(() => {
        btn.innerHTML = I.check;
        btn.classList.add('is-on');
        window.setTimeout(() => { btn.innerHTML = I.copy; btn.classList.remove('is-on'); }, 1600);
      }).catch(() => {});
      return;
    }
    if (a === 'up') { void this.rate(e, 'up'); return; }
    if (a === 'down') {
      e.rating = 'down*';
      e.feedbackOpen = true;
      this.refresh(e);
      this.nodes.get(e)?.querySelector<HTMLTextAreaElement>('.tc-fb-note')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (a === 'send-feedback') {
      const note = this.nodes.get(e)?.querySelector<HTMLTextAreaElement>('.tc-fb-note')?.value.trim() ?? '';
      void this.rate(e, 'down', [...e.reasons], note).then((ok) => {
        this.toast(ok ? s.feedbackThanks : s.feedbackFailed);
      });
    }
  }

  private async rate(e: Entry & { kind: 'answer' }, rating: 'up' | 'down', reasons: string[] = [], note = ''): Promise<boolean> {
    e.rating = rating;
    e.feedbackOpen = false;
    this.refresh(e);
    const token = await this.o.getToken().catch(() => null);
    if (!token || !e.answer.answerId) return false;
    const i = this.entries.indexOf(e);
    const asked = [...this.entries.slice(0, i)].reverse().find((x) => x.kind === 'student') as { text: string } | undefined;
    return rateAnswer({
      answerId: e.answer.answerId, rating, reasons, note, mode: e.answer.mode,
      sentence: this.o.sentence, question: asked?.text ?? '', answer: answerText(e.answer),
    }, token);
  }

  private toast(text: string): void {
    const t = document.createElement('div');
    t.className = 'tc-toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    this.q<HTMLElement>('.tc-panel').appendChild(t);
    window.setTimeout(() => t.classList.add('is-out'), 2200);
    window.setTimeout(() => t.remove(), 2600);
  }

  // ── Asking ───────────────────────────────────────────────────────────────
  private send(text: string): void {
    const q = text.trim();
    if (!q || this.busy || this.limitReached || this.signedIn === false) return;
    const input = this.q<HTMLTextAreaElement>('[data-input]');
    input.value = '';
    this.grow();
    this.stopMic?.();
    this.ask(q, null);
  }

  private ask(question: string, wordIndex: number | null): void {
    if (this.reviewing) { this.run('review', question, question, this.review); return; }
    // A quiz request gets the quiz card, not a quiz written out as prose.
    if (QUIZ_REQUEST.test(question)) { this.quiz(question); return; }
    this.run('ask', question, question, wordIndex ?? this.focus);
  }

  private quiz(shown: string): void {
    this.run('quiz', shown, shown, null);
  }

  private stop(): void {
    this.abort?.abort();
  }

  private history(): TeacherTurn[] {
    const turns: TeacherTurn[] = [];
    for (const e of this.entries) {
      if (e.kind === 'student') turns.push({ role: 'student', text: e.text });
      else if (e.kind === 'answer') turns.push({ role: 'teacher', text: answerText(e.answer) });
    }
    return turns.slice(-6);
  }

  private run(mode: TeacherMode, shown: string, question: string, wordIndex: number | null): void {
    if (this.busy) return;
    // A failed or stopped attempt leaves the conversation when it is retried.
    const clear = () => {
      const gone: Entry[] = this.entries.filter((e) => e.kind === 'failed' || e.kind === 'stopped');
      if (!gone.length) return;
      this.entries = this.entries.filter((e) => !gone.includes(e));
      gone.forEach((e) => { this.nodes.get(e)?.remove(); this.nodes.delete(e); });
    };
    clear();
    const history = this.history();
    this.add({ kind: 'student', text: shown });
    const attempt = async () => {
      clear();
      this.busy = true;
      this.draft = null;
      this.renderBusy();
      this.renderFollow();
      this.renderComposer();
      this.toBottom();
      const abort = this.abort = new AbortController();
      const started = performance.now();
      try {
        const token = await this.o.getToken();
        if (!token) throw new TeacherFailure('account');
        const { answer, usage } = await askTeacher({
          mode, sentence: this.o.sentence,
          analysis: this.o.words.map((w) => ({ word: w.word, irab: w.irab, ...(w.case ? { case: w.case } : {}) })),
          wordIndex, question, messages: history,
          practice: this.o.practice ? { word: this.o.practice.word, userIrab: this.o.practice.userIrab, correctIrab: this.o.practice.correctIrab, ...(this.o.practice.explanation ? { explanation: this.o.practice.explanation } : {}) } : null,
          lang: this.o.lang,
        }, token, (p) => {
          if (abort.signal.aborted || (mode !== 'ask' && mode !== 'review')) return;
          this.draft = p;
          this.renderBusy();
          this.follow();
        }, abort.signal);
        if (usage) this.usage = usage;
        const entry: Entry = {
          kind: 'answer', answer, streamed: !!this.draft, rating: null, picked: null, feedbackOpen: false, reasons: new Set(),
          fixedWord: answer.mode === 'review' && answer.verdict === 'fixed' && wordIndex !== null ? this.o.words[wordIndex]?.word : undefined,
        };
        this.busy = false;
        this.draft = null;
        this.retry = null;
        this.add(entry);
        if (answer.mode === 'review' && answer.verdict === 'fixed' && answer.correctedIrab && wordIndex !== null) {
          this.o.onFix?.(wordIndex, answer.correctedIrab, answer.correctedCase);
        }
        this.o.track?.('teacher_answered', { mode, ms: Math.round(performance.now() - started) });
      } catch (e) {
        const kind = e instanceof TeacherFailure ? e.kind : 'failed';
        const draft = this.draft;
        this.busy = false;
        this.draft = null;
        if (kind === 'stopped') { this.retry = () => void attempt(); this.add({ kind: 'stopped', draft }); }
        else if (kind === 'limit') { this.usage = { remaining: 0, limit: this.usage?.limit ?? 0 }; this.retry = null; this.add({ kind: 'limit' }); }
        else if (kind === 'account') { this.signedIn = false; this.retry = null; this.renderAll(); }
        else if (kind === 'session') { this.retry = () => void attempt(); this.add({ kind: 'failed', message: this.s.sessionEnded }); }
        else { this.retry = () => void attempt(); this.add({ kind: 'failed' }); }
        if (kind !== 'stopped') this.o.track?.('teacher_failed', { mode, kind });
      } finally {
        if (this.abort === abort) this.abort = null;
        this.renderBusy();
        this.q<HTMLElement>('[data-left]').innerHTML = R.leftPillHtml(this.usage, this.s, this.o.lang);
        this.renderFollow();
        this.renderComposer();
      }
    };
    void attempt();
  }

  // ── Microphone (the analyzer's dictation, Arabic) ────────────────────────
  private listening = false;
  private stopMic: (() => void) | null = null;
  private wireMic(input: HTMLTextAreaElement): void {
    const SpeechRec: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const btn = this.q<HTMLButtonElement>('[data-mic]');
    if (!SpeechRec) return;
    btn.hidden = false;
    let rec: any = null;
    let silence = 0;
    const set = (on: boolean) => {
      this.listening = on;
      btn.classList.toggle('is-live', on);
      btn.setAttribute('aria-pressed', String(on));
      this.renderComposer();
    };
    const stop = () => {
      window.clearTimeout(silence);
      if (rec) { try { rec.stop(); } catch { /* stopped */ } }
      if (this.listening) set(false);
    };
    this.stopMic = stop;
    btn.addEventListener('click', () => {
      if (this.listening) { stop(); return; }
      rec = new SpeechRec();
      rec.lang = 'ar-SA';
      rec.continuous = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      rec.interimResults = true;
      const base = input.value.trim();
      const arm = (ms: number) => { window.clearTimeout(silence); silence = window.setTimeout(stop, ms); };
      rec.onstart = () => { set(true); arm(6000); };
      rec.onresult = (e: any) => {
        const parts: string[] = [];
        for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
        input.value = [base, parts.join(' ')].filter(Boolean).join(' ').slice(0, 500);
        this.grow();
        this.renderComposer();
        arm(1800);
      };
      rec.onerror = () => stop();
      rec.onend = () => { if (this.listening) set(false); };
      try { rec.start(); } catch { set(false); }
    });
  }
}

function escapeHtml(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);
}
