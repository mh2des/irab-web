/**
 * /challenges on the web, screen for screen the app's «جمل منتقاة»: choose a
 * topic (levels as filters, levels 3+ on Irab+), choose a sentence, then for
 * each word its type, role and case marker, and the result as «أعرب بنفسك»
 * shows it. Graded here against the stored analysis (lib/challenges/data.ts).
 * Mounted by components/challenges/Challenges.astro.
 */
import { loadTopics, loadSentences, wordsOf, complete, gradeChallenge, ROLES, type Topic, type Sentence, type Attempt } from './data';
import { CHALLENGES } from './strings';
import * as R from './render';
import { resultsHtml, answerStatus } from '../practice/render';
import { PRACTICE } from '../practice/strings';
import type { GradeResult } from '../practice/api';
import { teacherEnabled } from '../teacher/flag';
import { TEACHER } from '../teacher/strings';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import { maybeSignedIn } from '../session';
import { addHistory } from '../history';

type View = 'gate' | 'topics' | 'sentences' | 'solve' | 'results';
interface Route { ch: View; t?: string; x?: string }

export function mountChallenges(root: HTMLElement): void {
  if (root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const lang: Lang = root.dataset.lang === 'en' ? 'en' : 'ar';
  const s = CHALLENGES[lang];
  const ps = PRACTICE[lang];
  const T = TEACHER[lang];
  const D = (n: number | string) => digits(n, lang);
  const q = <E extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<E>(sel)!;
  const track = (e: string, p?: Record<string, string | number | boolean | null | undefined>) =>
    import('../analytics').then((m) => m.track(e, p)).catch(() => {});
  const teacherOn = teacherEnabled();

  const views = Object.fromEntries((['gate', 'topics', 'sentences', 'solve', 'results'] as View[])
    .map((v) => [v, q(`[data-view="${v}"]`)])) as Record<View, HTMLElement>;

  const user = { uid: null as string | null, email: null as string | null, getToken: null as null | (() => Promise<string>) };
  let premium = cachedPremium();
  let topics: Topic[] = [];
  let level = 0;
  let topic: Topic | null = null;
  let list: Sentence[] = [];
  let sentence: Sentence | null = null;
  let words: string[] = [];
  let index = 0;
  let last: GradeResult | null = null;
  /** Answers per sentence, kept while the page is open so leaving a
   *  sentence never throws its answers away. */
  const answers = new Map<string, Attempt[]>();

  function cachedPremium(): boolean {
    try { return localStorage.getItem('irab-premium') === '1'; } catch { return false; }
  }

  function show(v: View) {
    (Object.keys(views) as View[]).forEach((k) => { views[k].hidden = k !== v; });
    const top = root.getBoundingClientRect().top + window.scrollY - 88;
    if (window.scrollY > top + 10) window.scrollTo({ top, behavior: 'smooth' });
  }
  function go(route: Route, push: boolean) {
    if (push) history.pushState({ ...history.state, irabCh: route }, '');
    else history.replaceState({ ...history.state, irabCh: route }, '');
  }

  function paywall() {
    (window as any).IrabPaywall?.show({ uid: user.uid ?? undefined, email: user.email ?? undefined, reason: 'challenges' });
  }

  // ── Topics ───────────────────────────────────────────────────────────────
  const levelsEl = q('[data-levels]');
  const topicsEl = q('[data-topics]');
  const topicsMsg = q('[data-topics-msg]');
  function renderTopics() {
    const levels = [...new Set(topics.map((t) => t.level))].sort((a, b) => a - b);
    levelsEl.innerHTML = R.levelChipsHtml(levels, level, premium, s);
    const shown = topics.filter((t) => level === 0 || t.level === level);
    topicsEl.innerHTML = R.topicsHtml(shown, premium, s, lang) + (premium ? '' : R.plusBannerHtml(s));
    topicsEl.setAttribute('aria-busy', 'false');
  }
  async function openTopics(push: boolean) {
    show('topics');
    go({ ch: 'topics' }, push);
    if (topics.length) { renderTopics(); return; }
    topicsMsg.hidden = true;
    try {
      topics = await loadTopics();
      if (!topics.length) throw new Error('empty');
      renderTopics();
    } catch {
      topicsEl.innerHTML = '';
      topicsMsg.hidden = false;
    }
  }
  q('[data-topics-retry]').addEventListener('click', () => {
    topicsEl.innerHTML = skeletons(4);
    openTopics(false);
  });
  levelsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-level]');
    if (!b) return;
    level = Number(b.dataset.level);
    renderTopics();
  });
  topicsEl.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-plus]')) { paywall(); return; }
    const b = el.closest<HTMLElement>('[data-topic]');
    const t = b && topics.find((x) => x.id === b.dataset.topic);
    if (!t) return;
    if (R.isLocked(t, premium)) { paywall(); return; }
    openTopic(t, true);
  });

  // ── Sentences ────────────────────────────────────────────────────────────
  const sentencesEl = q('[data-sentences]');
  async function openTopic(t: Topic, push: boolean) {
    topic = t;
    q('[data-topic-name]').textContent = t.name;
    q('[data-topic-level]').textContent = s.levels[t.level] ?? '';
    show('sentences');
    go({ ch: 'sentences', t: t.id }, push);
    sentencesEl.innerHTML = skeletons(4);
    sentencesEl.setAttribute('aria-busy', 'true');
    try {
      const got = await loadSentences(t.id);
      if (topic?.id !== t.id) return;
      list = got;
      renderSentences();
    } catch {
      if (topic?.id !== t.id) return;
      sentencesEl.innerHTML = `<p class="t-body-s c-3 ch-empty">${esc(s.loadFailed)}</p>`;
    }
    sentencesEl.setAttribute('aria-busy', 'false');
  }
  function renderSentences() {
    const started = new Set([...answers.entries()].filter(([, a]) => a.some(complete)).map(([id]) => id));
    sentencesEl.innerHTML = R.sentencesHtml(list, s, lang, started);
  }
  sentencesEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sentence]');
    const x = b && list.find((y) => y.id === b.dataset.sentence);
    if (x) openSolve(x, true);
  });
  q('[data-back-topics]').addEventListener('click', () => history.back());

  // ── One word at a time ───────────────────────────────────────────────────
  const blank = (): Attempt => ({ type: '', role: '', caseMarker: '' });
  const attempts = () => answers.get(sentence!.id)!;
  function openSolve(x: Sentence, push: boolean) {
    sentence = x;
    words = wordsOf(x);
    if (!answers.has(x.id) || answers.get(x.id)!.length !== words.length) answers.set(x.id, words.map(blank));
    const firstOpen = attempts().findIndex((a) => !complete(a));
    index = firstOpen < 0 ? 0 : firstOpen;
    q('[data-solve-topic]').textContent = topic?.name ?? '';
    show('solve');
    go({ ch: 'solve', t: topic?.id, x: x.id }, push);
    renderSolve();
    track('practice_guided_started', { platform: 'web', word_count: words.length });
  }
  function renderSolve(scrollTo: string | null = null) {
    const a = attempts();
    const done = a.filter(complete).length;
    q('[data-answered]').textContent = D(s.answered(done, words.length));
    q('[data-progress]').innerHTML = words.map((_, i) =>
      `<span class="${complete(a[i]) ? 'is-done' : ''}${i === index ? ' is-on' : ''}"></span>`).join('');
    q('[data-strip]').innerHTML = R.stripHtml(words, a, index);
    q('[data-word-n]').textContent = D(s.wordNofM(index + 1, words.length));
    q('[data-word]').textContent = words[index];
    q<HTMLButtonElement>('[data-prev]').disabled = index === 0;
    q<HTMLButtonElement>('[data-next]').disabled = index === words.length - 1;
    q('[data-steps]').innerHTML = R.stepsHtml(a[index], s, lang);
    const all = done === words.length;
    const confirm = q<HTMLButtonElement>('[data-confirm]');
    const check = q<HTMLButtonElement>('[data-check]');
    confirm.hidden = all;
    check.hidden = !all;
    confirm.disabled = !complete(a[index]);
    if (scrollTo) q('[data-steps]').querySelector<HTMLElement>(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function moveTo(i: number) {
    index = Math.max(0, Math.min(words.length - 1, i));
    renderSolve();
    q('[data-word-card]').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  q('[data-strip]').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]');
    if (b) moveTo(Number(b.dataset.go));
  });
  q('[data-prev]').addEventListener('click', () => moveTo(index - 1));
  q('[data-next]').addEventListener('click', () => moveTo(index + 1));
  q('[data-steps]').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pick]');
    if (!b) return;
    const a = attempts()[index];
    const value = b.dataset.value ?? '';
    const kind = b.dataset.pick as keyof Attempt;
    if (kind === 'type') {
      if (a.type !== value) { a.type = value; if (!(ROLES[value] ?? []).includes(a.role)) a.role = ''; }
    } else {
      a[kind] = value;
    }
    const next = kind === 'type' && !a.role ? '.ch-step:nth-child(2)' : kind === 'role' && !a.caseMarker ? '.ch-step:nth-child(3)' : null;
    renderSolve(next);
  });
  // «تأكيد»: on to the next word still unanswered, as the app's confirmCurrentWord.
  q('[data-confirm]').addEventListener('click', () => {
    const a = attempts();
    if (!complete(a[index])) return;
    const after = [...a.keys()].find((i) => i > index && !complete(a[i]));
    const before = a.findIndex((x) => !complete(x));
    moveTo(after ?? (before < 0 ? index : before));
  });
  q('[data-back-sentences]').addEventListener('click', () => history.back());
  q('[data-back-solve]').addEventListener('click', () => history.back());

  // ── Result ───────────────────────────────────────────────────────────────
  q('[data-check]').addEventListener('click', () => {
    if (!sentence || !attempts().every(complete)) return;
    const r = gradeChallenge(sentence, attempts(), { type: s.wordType, role: s.role, caseMarker: s.caseMarker }, s.sep);
    renderResults(r);
    go({ ch: 'results', t: topic?.id, x: sentence.id }, true);
    const right = r.wordFeedback.filter((f) => f.isCorrect).length;
    track('practice_guided_completed', { platform: 'web', correct_words: right, total_words: r.wordFeedback.length, is_perfect: right === r.wordFeedback.length });
    try {
      if (user.uid) addHistory({ kind: 'practice', uid: user.uid, sentence: r.sentence, score: r.score, correctCount: right, totalCount: r.wordFeedback.length, data: r });
    } catch { /* ignore */ }
  });
  function renderResults(r: GradeResult) {
    last = r;
    q('[data-results]').innerHTML = resultsHtml(r, ps, lang, teacherOn ? { wrong: T.whyWrongAsk, incomplete: T.whyIncompleteAsk } : null);
    q('[data-share-status]').textContent = '';
    show('results');
    const draw = () => q('[data-results]').querySelector('.fp-ring')?.classList.add('is-drawn');
    requestAnimationFrame(draw);
    window.setTimeout(draw, 120);
  }
  // T7: the teacher explains an answer that is not right.
  q('[data-results]').addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-why]');
    if (!btn || !last || !teacherOn) return;
    const r = last;
    const i = Number(btn.dataset.why);
    const f = r.wordFeedback[i];
    if (!f) return;
    const { openTeacher } = await import('../teacher/teacher');
    openTeacher({
      lang,
      sentence: r.sentence,
      words: r.wordFeedback.map((w) => ({ word: w.word, irab: w.correctIrab })),
      focusWord: i,
      practice: { sentence: r.sentence, word: f.word, userIrab: f.userIrab, correctIrab: f.correctIrab, explanation: f.explanation },
      autoAsk: answerStatus(f) === 'close' ? T.whyIncomplete : T.whyWrong,
      getToken: async () => (user.getToken ? await user.getToken().catch(() => null) : null),
      loginHref: `${lang === 'en' ? '/en' : ''}/login?next=${encodeURIComponent(location.pathname)}`,
      track,
    });
    track('teacher_opened', { source: 'challenges' });
  });
  q('[data-other]').addEventListener('click', () => {
    if (topic) { renderSentences(); show('sentences'); go({ ch: 'sentences', t: topic.id }, true); } else openTopics(true);
  });
  q('[data-retry]').addEventListener('click', () => {
    if (!sentence) return;
    answers.set(sentence.id, words.map(blank));
    openSolve(sentence, true);
  });
  q('[data-share]').addEventListener('click', async () => {
    if (!last) return;
    const text = s.shareText(Math.round(last.score * 100), last.sentence);
    const url = lang === 'en' ? 'https://irab.app/en/challenges' : 'https://irab.app/challenges';
    if (navigator.share) {
      try { await navigator.share({ title: 'irab.app', text, url }); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      q('[data-share-status]').textContent = s.copied;
    } catch { /* ignore */ }
  });

  // ── Back and forward ─────────────────────────────────────────────────────
  window.addEventListener('popstate', (e) => {
    const r: Route | undefined = (e.state as any)?.irabCh;
    if (!r || views.gate.hidden === false) return;
    if (r.ch === 'topics' || !topic || (r.t && r.t !== topic.id)) { openTopics(false); return; }
    if (r.ch === 'sentences' || !sentence || r.x !== sentence.id) { renderSentences(); show('sentences'); return; }
    if (r.ch === 'solve') { show('solve'); renderSolve(); return; }
    if (r.ch === 'results' && last) { renderResults(last); return; }
    show('solve'); renderSolve();
  });

  function skeletons(n: number) {
    return Array.from({ length: n }, () => '<div class="iu-card az-skel" aria-hidden="true"><span></span><span></span><span></span></div>').join('');
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  if (!maybeSignedIn()) { show('gate'); return; }
  topicsEl.innerHTML = skeletons(6);
  openTopics(false);
  const idle = () => views.solve.hidden && views.results.hidden;
  (async () => {
    try {
      const [{ onAuth }, { fetchMe }] = await Promise.all([import('../auth'), import('../entitlement')]);
      let probed = false;
      onAuth(async (u) => {
        if (!u) {
          user.getToken = null;
          if (idle()) show('gate');
          return;
        }
        user.uid = u.uid;
        user.email = u.email;
        user.getToken = () => u.getIdToken();
        if (probed) return;
        probed = true;
        // The worker enforces Irab+; this only draws the padlocks right.
        const me = await fetchMe(u).catch(() => null);
        const verdict = me ? me.premium === true : premium;
        if (verdict !== premium) {
          premium = verdict;
          if (topics.length && !views.topics.hidden) renderTopics();
        }
      });
    } catch {
      if (idle()) show('gate');
    }
  })();
}
