/**
 * The challenges' views as HTML, after the app's topic_selection,
 * sentence_selection and practice_interface. The result reuses «أعرب بنفسك»'s
 * cards (lib/practice/render.ts).
 */
import type { Topic, Sentence, Attempt } from './data';
import { ROLES, WORD_TYPES, CASES, FREE_LEVELS, complete } from './data';
import type { ChallengeStrings } from './strings';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import * as I from '../irab/icons';

const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const chev = I.chevronLeft.replace('<svg', '<svg class="flip-ltr"');

export const isLocked = (t: Topic, premium: boolean) => !premium && t.level > FREE_LEVELS;

/** The app colours levels 1-4 teal and the rest purple. */
const tone = (level: number) => (level <= 4 ? 'teal' : 'primary');

export function levelChipsHtml(levels: number[], selected: number, premium: boolean, s: ChallengeStrings): string {
  const chip = (level: number, label: string) => {
    const locked = level > FREE_LEVELS && !premium;
    return `<button type="button" class="ch-level${selected === level ? ' is-on' : ''}" data-level="${level}" aria-pressed="${selected === level}">${locked ? lock : ''}<span>${esc(label)}</span></button>`;
  };
  return chip(0, s.all) + levels.map((l) => chip(l, s.levels[l] ?? String(l))).join('');
}

export function topicsHtml(topics: Topic[], premium: boolean, s: ChallengeStrings, lang: Lang): string {
  return topics.map((t) => {
    const locked = isLocked(t, premium);
    const level = s.levels[t.level] ?? String(t.level);
    return `
      <button type="button" class="iu-card ch-topic ch-${tone(t.level)}${locked ? ' is-locked' : ''}" data-topic="${esc(t.id)}"
        aria-label="${esc(`${t.name}${s.sep}${level}${locked ? `${s.sep}${s.plusTag}` : ''}`)}">
        <span class="ch-topic-icon" aria-hidden="true">${locked ? lock : I.book}</span>
        <span class="ch-topic-text">
          <span class="t-micro ch-topic-level">${esc(level)}</span>
          <span class="t-card-title c-1">${esc(t.name)}</span>
          ${t.sentenceCount > 0 ? `<span class="t-caption c-3">${esc(digits(s.sentences(t.sentenceCount), lang))}</span>` : ''}
        </span>
        ${locked ? `<span class="iu-tag primary ch-plus">${I.crown}${esc(s.plusTag)}</span>` : chev}
      </button>`;
  }).join('');
}

export function plusBannerHtml(s: ChallengeStrings): string {
  return `
    <button type="button" class="iu-card ch-plus-banner" data-plus-banner>
      <span class="ch-plus-icon" aria-hidden="true">${I.crown}</span>
      <span class="ch-topic-text"><span class="t-card-title c-1">${esc(s.plusTitle)}</span><span class="t-caption c-2">${esc(s.plusSub)}</span></span>
      ${chev}
    </button>`;
}

export function sentencesHtml(list: Sentence[], s: ChallengeStrings, lang: Lang, started: Set<string>): string {
  if (!list.length) return `<p class="t-body-s c-3 ch-empty">${esc(s.noSentences)}</p>`;
  return list.map((x, i) => {
    const n = x.analysis.length || x.sentence.split(/\s+/).filter(Boolean).length;
    const dots = [1, 2, 3].map((d) => `<i class="${d <= x.difficulty ? 'is-on' : ''}"></i>`).join('');
    return `
      <button type="button" class="iu-card ch-sentence${started.has(x.id) ? ' is-started' : ''}" data-sentence="${esc(x.id)}">
        <span class="ch-num" aria-hidden="true">${digits(i + 1, lang)}</span>
        <span class="ch-sentence-text">
          <span class="t-sentence-s c-1" dir="rtl" lang="ar">${esc(x.sentence)}</span>
          <span class="ch-sentence-meta">
            <span class="t-caption c-3">${esc(digits(s.words(n), lang))}</span>
            <span class="ch-dots" role="img" aria-label="${esc(digits(s.difficulty(x.difficulty), lang))}">${dots}</span>
          </span>
        </span>
        ${chev}
      </button>`;
  }).join('');
}

/** The sentence with its words as chips: the current one ringed, done ones ticked. */
export function stripHtml(words: string[], attempts: Attempt[], index: number): string {
  return words.map((w, i) => {
    const done = complete(attempts[i]);
    return `<button type="button" class="ch-chip${i === index ? ' is-on' : ''}${done ? ' is-done' : ''}" data-go="${i}">${done ? I.checkCircle : ''}<span>${esc(w)}</span></button>`;
  }).join('');
}

function options(values: string[], picked: string, kind: string): string {
  return values.map((v) => `<button type="button" class="ch-opt${picked === v ? ' is-on' : ''}" data-pick="${kind}" data-value="${esc(v)}" aria-pressed="${picked === v}">${esc(v)}</button>`).join('');
}

function step(n: number, title: string, body: string, state: 'open' | 'done' | 'locked', hint: string, lang: Lang): string {
  return `
    <section class="iu-card ch-step is-${state}">
      <h3 class="ch-step-head"><span class="ch-step-n" aria-hidden="true">${state === 'done' ? I.check : digits(n, lang)}</span><span class="t-card-title">${esc(title)}</span></h3>
      ${state === 'locked' ? `<p class="t-caption c-3 ch-locked">${lock}<span>${esc(hint)}</span></p>` : `<div class="ch-opts" dir="rtl" lang="ar">${body}</div>`}
    </section>`;
}

/** The three steps for one word: type, then role (by type), then case marker. */
export function stepsHtml(a: Attempt, s: ChallengeStrings, lang: Lang): string {
  return [
    step(1, s.wordType, options(WORD_TYPES, a.type, 'type'), a.type ? 'done' : 'open', '', lang),
    step(2, s.role, options(ROLES[a.type] ?? [], a.role, 'role'), !a.type ? 'locked' : a.role ? 'done' : 'open', s.typeFirst, lang),
    step(3, s.caseMarker, options(CASES, a.caseMarker, 'caseMarker'), !a.role ? 'locked' : a.caseMarker ? 'done' : 'open', s.roleFirst, lang),
  ].join('');
}
