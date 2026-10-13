/**
 * «أعرب بنفسك» views as HTML, after the app's PracticeWordStepper and
 * PracticeResultsView (lib/features/practice/widgets/redesign).
 */
import type { GradeResult, WordFeedback, GradePart } from './api';
import type { PracticeStrings } from './strings';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import * as I from '../irab/icons';

export type AnswerStatus = 'correct' | 'close' | 'review';

/** «صحيحة» is the full i'rab, «قريبة» the position with something short,
 *  «تحتاج مراجعة» a wrong position or no answer (answerStatus in the app). */
export function answerStatus(f: WordFeedback): AnswerStatus {
  switch (f.status) {
    case 'correct': return 'correct';
    case 'incomplete': return 'close';
    case 'wrong':
    case 'empty': return 'review';
    default: return f.isCorrect ? 'correct' : f.wordScore >= 0.5 ? 'close' : 'review';
  }
}

export function levelOf(r: GradeResult, s: PracticeStrings): string {
  if (r.level.trim()) return r.level.trim();
  const v = r.score;
  return v >= 0.9 ? s.levels.excellent : v >= 0.8 ? s.levels.veryGood : v >= 0.65 ? s.levels.good : v >= 0.5 ? s.levels.fair : s.levels.keepGoing;
}

export function statusLabel(st: AnswerStatus, s: PracticeStrings): string {
  return st === 'correct' ? s.statusCorrect : st === 'close' ? s.statusClose : s.statusReview;
}

const STATUS_ICON: Record<AnswerStatus, string> = { correct: I.checkCircle, close: I.minusCircle, review: I.xCircle };
const STATUS_TONE: Record<AnswerStatus, string> = { correct: 'success', close: 'partial', review: 'error' };
const PART_ICON: Record<string, string> = { correct: I.checkCircle, partial: I.minusCircle, wrong: I.xCircle, missing: I.plusCircle };
const PART_TONE: Record<string, string> = { correct: 'success', partial: 'partial', wrong: 'error', missing: 'missing' };

/** Terms offered under the answer box (practiceQuickTerms in the app):
 *  constructions appear only when the sentence has the governing word. */
export function quickTerms(sentence: string): string[] {
  const bare = sentence.replace(/[ً-ْ]/g, '');
  const has = (w: string) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(bare);
  return [
    'مبتدأ', 'خبر', 'فاعل', 'مفعول به',
    ...(['إن', 'ان', 'أن', 'لكن', 'ليت', 'لعل', 'كأن'].some(has) ? ['اسم إنَّ', 'خبر إنَّ'] : []),
    ...(['كان', 'أصبح', 'ليس', 'صار', 'ظل'].some(has) ? ['اسم كان', 'خبر كان'] : []),
    'مضاف إليه', 'حرف جر', 'مرفوع', 'منصوب', 'مجرور', 'مبني', 'وعلامة', 'الضمة', 'الفتحة', 'الكسرة', 'الظاهرة',
  ];
}

function ring(score: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const c = 2 * Math.PI * 42;
  return `
    <div class="fp-ring" role="img" aria-label="${pct}%">
      <svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="42" class="fp-ring-track"/>
        <circle cx="48" cy="48" r="42" class="fp-ring-arc" stroke-dasharray="${c}" style="--fp-off:${c * (1 - pct / 100)}"/></svg>
      <span class="t-title-l c-1">${pct}%</span>
    </div>`;
}

function partChip(p: GradePart, s: PracticeStrings): string {
  return `<span class="iu-tag ${PART_TONE[p.verdict]}" title="${esc(p.expected)}" aria-label="${esc(`${p.label}: ${s.part[p.verdict]}`)}">${PART_ICON[p.verdict]}${esc(p.label)}</span>`;
}

/** The labels of «لماذا إجابتي خطأ؟» (T7) when the teacher is on. */
export interface WhyLabels { wrong: string; incomplete: string }

export function feedbackCardHtml(f: WordFeedback, s: PracticeStrings, why: WhyLabels | null = null, i = 0): string {
  const st = answerStatus(f);
  const tone = STATUS_TONE[st];
  const answered = f.userIrab.trim().length > 0;
  const short = st !== 'correct';
  const explanation = f.explanation.trim();
  return `
    <article class="iu-card fp-card">
      <header>
        <h3 class="t-word c-word" dir="rtl" lang="ar">${esc(f.word)}</h3>
        <span class="iu-tag ${tone}">${STATUS_ICON[st]}${esc(statusLabel(st, s))}</span>
      </header>
      <p class="t-micro c-3">${esc(s.yourAnswer)}</p>
      <p class="t-body-s fp-answer ${!answered ? 'c-3' : st === 'correct' ? 'c-1' : `c-${tone === 'partial' ? 'partial' : 'error'}`}" dir="rtl" lang="ar">${esc(answered ? f.userIrab : s.noAnswer)}</p>
      ${short && f.parts.length ? `<div class="fp-parts" dir="rtl">${f.parts.map((p) => partChip(p, s)).join('')}</div>` : ''}
      ${short && f.correctIrab.trim() ? `<p class="t-micro c-3 fp-gap">${esc(s.fullIrab)}</p><p class="t-body-s c-1" dir="rtl" lang="ar">${esc(f.correctIrab)}</p>` : ''}
      ${explanation ? `<p class="t-body-s c-2 fp-explain" dir="rtl" lang="ar">${esc(explanation)}</p>` : ''}
      ${why && short ? `<button type="button" class="tc-why" data-why="${i}">${I.graduationCap}<span>${esc(st === 'close' ? why.incomplete : why.wrong)}</span></button>` : ''}
    </article>`;
}

export function resultsHtml(r: GradeResult, s: PracticeStrings, lang: Lang, why: WhyLabels | null = null): string {
  const statuses = r.wordFeedback.map(answerStatus);
  const count = (st: AnswerStatus) => statuses.filter((x) => x === st).length;
  const pills = (['correct', 'close', 'review'] as AnswerStatus[]).filter((st) => count(st) > 0)
    .map((st) => `<span class="iu-tag ${STATUS_TONE[st]} fp-stat">${STATUS_ICON[st]}${esc(statusLabel(st, s))} ${digits(count(st), lang)}</span>`).join('');
  const note = r.overallFeedback.trim();
  return `
    <div class="iu-card fp-summary">
      <div><p class="t-display c-1">${esc(levelOf(r, s))}</p><p class="t-body-s c-2">${esc(s.youParsed(digits(s.words(r.wordFeedback.length), lang)))}</p></div>
      ${ring(r.score)}
    </div>
    <div class="fp-stats">${pills}</div>
    ${note ? `<div class="fp-note"><p class="t-label c-teal">${I.graduationCap}${esc(s.teacherNote)}</p><p class="t-body c-1" dir="rtl" lang="ar">${esc(note)}</p></div>` : ''}
    <div class="fp-section"><h2 class="t-title c-1">${esc(s.breakdown)}</h2><span class="t-caption c-3">${esc(digits(s.words(r.wordFeedback.length), lang))}</span></div>
    <div class="fp-cards">${r.wordFeedback.map((f, i) => feedbackCardHtml(f, s, why, i)).join('')}</div>`;
}

export function gradingHtml(sentence: string, s: PracticeStrings): string {
  return `
    <div class="iu-card az-echo"><p class="t-micro c-3">${esc(s.yourSentence)}</p><p class="t-sentence c-1" dir="rtl" lang="ar">${esc(sentence)}</p></div>
    <div class="iu-card az-steps fp-teal">
      <div class="az-steps-head"><span class="az-spinner" aria-hidden="true"></span><h2 class="t-title c-1">${esc(s.gradingTitle)}</h2></div>
      <ol>${s.gradingSteps.map(([doing, done], i) => `<li data-step="${i}" data-doing="${esc(doing)}" data-done="${esc(done)}"><span class="az-step-dot" aria-hidden="true"></span><span class="t-body-s">${esc(doing)}</span></li>`).join('')}</ol>
    </div>
    ${[0, 1].map(() => `<div class="iu-card az-skel" aria-hidden="true"><span></span><span></span><span></span></div>`).join('')}
    <p class="t-caption c-3 az-takes">${esc(s.takesSeconds)}</p>`;
}

/** The plain text «مشاركة كنص» sends. */
export function reportText(r: GradeResult, s: PracticeStrings, lang: Lang): string {
  const lines = [s.pdfTitle, '', r.sentence, '', `${digits(Math.round(r.score * 100), lang)}٪ · ${levelOf(r, s)}`];
  if (r.overallFeedback.trim()) lines.push('', r.overallFeedback.trim());
  r.wordFeedback.forEach((f, i) => {
    const st = answerStatus(f);
    lines.push('', `${digits(i + 1, lang)}. ${f.word} (${statusLabel(st, s)})`, `${s.yourAnswer}: ${f.userIrab.trim() || s.noAnswer}`);
    if (st !== 'correct' && f.correctIrab.trim()) lines.push(`${s.fullIrab}: ${f.correctIrab.trim()}`);
    if (f.explanation.trim()) lines.push(f.explanation.trim());
  });
  lines.push('', 'irab.app');
  return lang === 'en' ? lines.join('\n').replace('٪', '%') : lines.join('\n');
}
