/**
 * «اسأل الأستاذ» as HTML, after the app's TeacherSheet
 * (lib/features/teacher/widgets/teacher_sheet.dart): header, the sentence
 * card, the empty state with suggestions, and every entry of the
 * conversation (question, answer, quiz, review ruling, stopped, failed,
 * limit, account). Teal is the teacher's voice, as in the app.
 */
import type { TeacherAnswer, TeacherPartial, TeacherUsage } from './api';
import type { TeacherStrings } from './strings';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import * as I from '../irab/icons';

export interface Suggestion { text: string; wordIndex?: number; quiz?: boolean }
export interface CtxWord { word: string; irab: string; case?: string }

/** Studied Arabic (the sentence, its words, examples) is always right to left;
 *  the teacher's own words follow their language (an English page can get an
 *  English answer). */
const AR = 'dir="rtl" lang="ar"';
const AUTO = 'dir="auto"';

/** Up to four questions this sentence can answer (teacherSuggestions). */
export function suggestions(words: CtxWord[], corrected: boolean, focus: number | null, s: TeacherStrings): Suggestion[] {
  const out: Suggestion[] = [];
  const about = (i: number) => {
    const c = words[i]?.case;
    if (!c || !s.masdar[c]) return;
    out.push({ text: s.sgWhyCase(s.masdar[c], words[i].word), wordIndex: i });
  };
  if (focus !== null && focus >= 0 && focus < words.length) {
    about(focus);
    out.push({ text: s.sgPosition(words[focus].word), wordIndex: focus });
  } else {
    // The first inflected word that is not plain subject or predicate is
    // usually the one a learner stumbles on.
    const pick = words.findIndex((w) => w.case && w.case !== 'mabni' && w.case !== 'marfu');
    const fallback = words.findIndex((w) => w.case && w.case !== 'mabni');
    const i = pick >= 0 ? pick : fallback;
    if (i >= 0) about(i);
  }
  if (corrected) out.push({ text: s.sgCorrected });
  out.push({ text: s.sgSimilar });
  out.push({ text: s.sgQuiz, quiz: true });
  return out.slice(0, 4);
}

export function avatarHtml(size: 'sm' | 'md' | 'lg' = 'md'): string {
  return `<span class="tc-avatar ${size}" aria-hidden="true">${I.graduationCap}</span>`;
}

export function leftPillHtml(u: TeacherUsage | null, s: TeacherStrings, lang: Lang): string {
  if (!u || u.remaining < 0) return '';
  return `<span class="tc-left${u.remaining <= 0 ? ' is-none' : ''}" title="${esc(s.leftTitle)}">${I.zap}<span>${esc(digits(s.left(u.remaining), lang))}</span></span>`;
}

export function contextHtml(o: {
  words: CtxWord[]; focus: number | null; reviewing: boolean;
  practice: { sentence: string; word: string; userIrab: string; correctIrab: string } | null;
}, s: TeacherStrings): string {
  const p = o.practice;
  if (p) {
    return `
      <p class="t-micro c-3">${esc(s.fromPractice(p.sentence))}</p>
      <p class="t-word c-1" ${AR}>${esc(p.word)}</p>
      <div class="tc-prow"><span class="t-caption c-3">${esc(s.yourAnswer)}</span><span class="t-body-s c-error" ${AR}>${esc(p.userIrab || '…')}</span></div>
      ${p.correctIrab ? `<div class="tc-prow"><span class="t-caption c-3">${esc(s.correct)}</span><span class="t-body-s c-success" ${AR}>${esc(p.correctIrab)}</span></div>` : ''}`;
  }
  return `
    <p class="t-micro c-3">${esc(s.aboutSentence)}</p>
    <div class="tc-words" ${AR}>${o.words.map((w, i) =>
      `<button type="button" class="tc-word${o.focus === i ? ' is-on' : ''}" data-focus="${i}" aria-pressed="${o.focus === i}"${o.reviewing ? ' disabled' : ''}>${esc(w.word)}</button>`).join('')}</div>`;
}

export function emptyHtml(list: Suggestion[], reviewing: boolean, s: TeacherStrings): string {
  return `
    <div class="tc-empty">
      <div class="tc-empty-mid">
        ${avatarHtml('lg')}
        <h3 class="t-title c-1">${esc(reviewing ? s.reviewEmptyTitle : s.emptyTitle)}</h3>
        <p class="t-body-s c-3">${esc(reviewing ? s.reviewEmptyBody : s.emptyBody)}</p>
      </div>
      ${reviewing ? '' : `
        <div class="tc-suggest">
          <p class="t-micro c-3">${esc(s.suggested)}</p>
          ${list.map((g, i) => `<button type="button" class="tc-sg" data-sg="${i}"><span ${AUTO}>${esc(g.text)}</span>${I.messageQuestion}</button>`).join('')}
        </div>`}
    </div>`;
}

export function pickerHtml(words: CtxWord[], s: TeacherStrings): string {
  return `
    <div class="tc-pick">
      <h3 class="t-title c-1">${esc(s.pickWord)}</h3>
      <p class="t-body-s c-3">${esc(s.pickWordSub)}</p>
      <div class="tc-pick-list">${words.map((w, i) => `
        <button type="button" class="tc-pick-row" data-pick="${i}">
          <span class="t-word c-word" ${AR}>${esc(w.word)}</span>
          <span class="t-body-s c-2" ${AR}>${esc(w.irab)}</span>
        </button>`).join('')}</div>
    </div>`;
}

export function accountHtml(s: TeacherStrings, loginHref: string): string {
  return `
    <div class="tc-gate">
      ${avatarHtml('lg')}
      <h3 class="t-title c-1">${esc(s.accountTitle)}</h3>
      <p class="t-body-s c-2">${esc(s.accountBody)}</p>
      <a class="iu-btn teal lg" href="${esc(loginHref)}">${esc(s.accountCta)}</a>
    </div>`;
}

export function studentHtml(text: string): string {
  return `<div class="tc-q"><p class="t-body c-1" dir="auto">${esc(text)}</p></div>`;
}

function headHtml(s: TeacherStrings, trailing = ''): string {
  return `<div class="tc-head-row">${avatarHtml('sm')}<span class="t-label c-teal">${esc(s.name)}</span>${trailing ? `<span class="t-caption c-3">${esc(trailing)}</span>` : ''}</div>`;
}

export function thinkingHtml(s: TeacherStrings): string {
  return `
    <div class="tc-thinking" role="status" aria-label="${esc(s.thinking)}">
      ${headHtml(s, s.thinking)}
      <div class="tc-dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="tc-bar" style="width:100%"></span><span class="tc-bar" style="width:82%"></span><span class="tc-bar" style="width:60%"></span>
    </div>`;
}

/** The answer while it is being written: lead and body with a caret. */
export function writingHtml(p: TeacherPartial, s: TeacherStrings): string {
  if (p.mode === 'review') {
    return `${headHtml(s)}<div class="tc-review"><p class="t-body-s c-1" ${AUTO}>${esc(p.lead)}${p.body ? '' : '<span class="tc-caret"></span>'}</p>${p.body ? `<p class="t-body-s c-2" ${AUTO}>${esc(p.body)}<span class="tc-caret"></span></p>` : ''}</div>`;
  }
  return `${headHtml(s)}
    <p class="t-body-strong c-1 tc-lead" ${AUTO}>${esc(p.lead)}${p.body ? '' : '<span class="tc-caret"></span>'}</p>
    ${p.body ? `<p class="t-body c-2 tc-body-text" ${AUTO}>${esc(p.body)}<span class="tc-caret"></span></p>` : ''}`;
}

export interface AnswerView {
  answer: TeacherAnswer; streamed: boolean; rating: string | null;
  picked: number | null; feedbackOpen: boolean; reasons: Set<string>; fixedWord?: string;
}

function footerHtml(v: AnswerView, s: TeacherStrings, grounded: boolean): string {
  const up = v.rating === 'up';
  const down = !!v.rating && v.rating.startsWith('down');
  return `
    <div class="tc-foot">
      ${grounded ? `<span class="tc-grounded">${I.shieldCheck}<span class="t-caption c-3">${esc(s.grounded)}</span></span>` : '<span></span>'}
      <span class="tc-acts">
        <button type="button" class="tc-act" data-act="copy" title="${esc(s.copy)}" aria-label="${esc(s.copy)}">${I.copy}</button>
        <button type="button" class="tc-act${up ? ' is-on' : ''}" data-act="up" title="${esc(s.helpful)}" aria-label="${esc(s.helpful)}" aria-pressed="${up}"${up ? ' disabled' : ''}>${I.thumbsUp}</button>
        <button type="button" class="tc-act${down ? ' is-on' : ''}" data-act="down" title="${esc(s.notHelpful)}" aria-label="${esc(s.notHelpful)}" aria-pressed="${down}"${down ? ' disabled' : ''}>${I.thumbsDown}</button>
      </span>
    </div>
    ${v.feedbackOpen ? `
      <div class="tc-fb">
        <p class="t-body-strong c-1">${esc(s.feedbackQ)}</p>
        <div class="tc-fb-reasons">${Object.entries(s.reasons).map(([k, label]) =>
          `<button type="button" class="tc-chip${v.reasons.has(k) ? ' is-on' : ''}" data-reason="${k}" aria-pressed="${v.reasons.has(k)}">${esc(label)}</button>`).join('')}</div>
        <textarea class="tc-fb-note" rows="2" maxlength="500" placeholder="${esc(s.feedbackNote)}" dir="auto"></textarea>
        <div class="tc-fb-foot"><span class="t-caption c-3">${esc(s.feedbackReviewed)}</span><button type="button" class="iu-btn teal" data-act="send-feedback">${esc(s.send)}</button></div>
      </div>` : ''}`;
}

export function answerHtml(v: AnswerView, s: TeacherStrings, lang: Lang): string {
  const a = v.answer;
  const enter = v.streamed ? 'tc-fade' : 'tc-reveal';
  switch (a.mode) {
    case 'quiz': {
      const picked = v.picked;
      const options = a.options.map((o, i) => {
        const state = picked === null ? 'is-open' : i === a.answerIndex ? 'is-right' : i === picked ? 'is-wrong' : 'is-dim';
        const mark = state === 'is-right' ? I.checkCircle : state === 'is-wrong' ? I.xCircle : '';
        return `<button type="button" class="tc-opt ${state}" data-opt="${i}"${picked === null ? '' : ' disabled'}>
          <span class="tc-opt-letter">${esc(s.quizLetters[i])}</span><span class="t-body c-1" ${AUTO}>${esc(o)}</span><span class="tc-opt-mark">${mark}</span></button>`;
      }).join('');
      const ok = picked === a.answerIndex;
      return `${headHtml(s)}
        <div class="${enter}">
          <p class="t-body c-2">${esc(s.quizIntro)}</p>
          <div class="iu-card tc-quiz"><p class="t-body-strong c-1" ${AUTO}>${esc(a.question)}</p><div class="tc-opts">${options}</div></div>
          ${picked !== null ? `<p class="t-body-s tc-quiz-after ${ok ? 'c-success' : 'c-error'}" ${AUTO}>${esc(`${ok ? s.quizRight : s.quizWrong} ${a.explanation}`)}</p>` : ''}
        </div>`;
    }
    case 'review': {
      const title = a.verdict === 'fixed' ? s.reviewFixed : a.verdict === 'alternative' ? s.reviewAlt : s.reviewCorrect;
      return `${headHtml(s)}
        <div class="tc-review${a.verdict === 'fixed' ? ' is-fix' : ''} ${enter}">
          <p class="tc-review-title">${I.checkCircle}<span class="t-body-strong c-1">${esc(title)}</span></p>
          <p class="t-body-s c-1" ${AUTO}>${esc(a.lead)}</p>
          ${a.body ? `<p class="t-body-s c-2" ${AUTO}>${esc(a.body)}</p>` : ''}
          ${a.verdict === 'fixed' && v.fixedWord ? `<span class="tc-fixed">${I.checkCircle}<span class="t-caption c-success">${esc(s.reviewFixedOutcome(v.fixedWord))}</span></span>` : ''}
        </div>
        <p class="tc-grounded">${I.shieldCheck}<span class="t-caption c-3">${esc(s.reviewCheckedDeep)}</span></p>`;
    }
    case 'hint':
      return `${headHtml(s)}<p class="t-body c-1 ${enter}" ${AUTO}>${esc(a.hint)}</p>`;
    default: {
      const ba = a.beforeAfter;
      return `${headHtml(s)}
        <p class="t-body-strong c-1 tc-lead ${v.streamed ? '' : enter}" ${AUTO}>${esc(a.lead)}</p>
        ${a.body ? `<p class="t-body c-2 tc-body-text ${v.streamed ? '' : enter}" ${AUTO}>${esc(a.body)}</p>` : ''}
        ${ba ? `<div class="tc-ba ${enter}">
          <div><span class="t-caption c-3" ${AUTO}>${esc(ba.beforeLabel || s.before)}</span><span class="t-context c-1" ${AR}>${esc(ba.before)}</span></div>
          <div><span class="t-caption c-3" ${AUTO}>${esc(ba.afterLabel || s.after)}</span><span class="t-context c-1" ${AR}>${esc(ba.after)}</span></div>
        </div>` : ''}
        ${a.example ? `<div class="tc-ex ${enter}">${I.quote}<div>
          <p class="t-micro c-3">${esc(s.exampleLabel)}</p>
          <p class="t-sentence-s c-1" ${AR}>${esc(a.example.text)}</p>
          ${a.example.note ? `<p class="t-caption c-2" ${AUTO}>${esc(a.example.note)}</p>` : ''}
        </div></div>` : ''}
        ${footerHtml(v, s, !a.offTopic)}`;
    }
  }
}

export function stoppedHtml(p: TeacherPartial | null, s: TeacherStrings): string {
  return `${headHtml(s)}
    ${p?.lead ? `<p class="t-body-strong c-2" ${AUTO}>${esc(p.lead)}</p>` : ''}
    ${p?.body ? `<p class="t-body c-3" ${AUTO}>${esc(p.body)}</p>` : ''}
    <div class="tc-stopped"><span class="tc-grounded">${I.square}<span class="t-caption c-3">${esc(s.stopped)}</span></span>
      <button type="button" class="iu-btn secondary" data-act="retry">${I.refresh}<span>${esc(s.askAgain)}</span></button></div>`;
}

export function failedHtml(s: TeacherStrings, message?: string): string {
  return `
    <div class="tc-failed" role="alert">
      <p class="tc-failed-title">${I.info}<span class="t-body-strong c-1">${esc(s.failedTitle)}</span></p>
      <p class="t-body-s c-2">${esc(message || s.failedBody)}</p>
      <button type="button" class="iu-btn secondary" data-act="retry">${I.refresh}<span>${esc(s.retry)}</span></button>
    </div>`;
}

export function limitHtml(s: TeacherStrings): string {
  const perk = (t: string) => `<li>${I.checkCircle}<span class="t-body-s c-1">${esc(t)}</span></li>`;
  return `
    <div class="iu-card tc-limit">
      <div class="tc-limit-head"><span class="tc-crown">${I.crown}</span><div>
        <p class="t-body-strong c-1">${esc(s.limitTitle)}</p>
        <p class="t-caption c-2">${esc(s.limitBody)}</p></div></div>
      <p class="t-micro c-3">${esc(s.limitWithPlus)}</p>
      <ul>${perk(s.perkQuestions)}${perk(s.perkDeep)}${perk(s.perkPdf)}</ul>
      <button type="button" class="iu-btn primary lg block" data-act="plus">${I.crown}<span>${esc(s.limitCta)}</span></button>
      <button type="button" class="iu-btn ghost block" data-act="close">${esc(s.limitLater)}</button>
    </div>`;
}
