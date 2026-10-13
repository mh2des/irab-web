/**
 * The analyzer's views as HTML, one function per part of the app's screen
 * (lib/features/irab/widgets/redesign/irab_result_view.dart and friends).
 * Pure functions of the result and the strings; the controller wires them.
 */
import type { IrabDeep, IrabResult, IrabWord } from './api';
import { digits, type Lang, type Strings } from './strings';
import * as I from './icons';

export function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** The model sometimes quotes a clause itself: never «« »». */
export function unquote(s: string): string {
  return String(s ?? '').trim().replace(/^[«"]+|[»"]+$/g, '').trim();
}

export function hasDetails(d: string): boolean {
  const s = (d ?? '').trim();
  return s.length > 0 && s !== '—' && s !== '-' && !s.startsWith('لا توجد تفاصيل');
}

const HARAKAT = /[ً-ْ]/;

/** Only claim «مضبوطة بالشكل» when the words really carry diacritics. */
export function isVocalized(words: IrabWord[]): boolean {
  return words.filter((w) => HARAKAT.test(w.word)).length * 2 >= words.length;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** On an as-typed answer, the «وكُتبت (…) والصواب (…)» sentence is the mistake. */
function irabHtml(irab: string): string {
  const m = /[،,]?\s*وكُتبت\s*\(.*والصواب/.exec(irab);
  if (!m) return esc(irab);
  return `${esc(irab.slice(0, m.index))}<span class="c-error">${esc(irab.slice(m.index))}</span>`;
}

export function heroHtml(r: IrabResult, s: Strings, caption: string | null, editable = true): string {
  const words = r.words.map((w, i) =>
    `<button type="button" class="az-hero-word t-hero c-1" data-word="${i}">${esc(w.word)}</button>`).join('');
  return `
    <div class="az-hero">
      ${caption ? `<p class="t-caption c-3">${esc(caption)}</p>` : ''}
      <div class="az-hero-words" dir="rtl" lang="ar" role="text" aria-label="${esc(r.words.map((w) => w.word).join(' '))}">${words}</div>
      ${editable ? `<button type="button" class="iu-pill outline az-edit" data-edit>${I.pencil}<span>${esc(s.edit)}</span></button>` : ''}
    </div>`;
}

export function correctionHtml(r: IrabResult, s: Strings, canAsTyped: boolean): string {
  const corrected = (r.correctedSentence ?? '').trim();
  const row = (label: string, text: string, cls: string) => `
    <div class="az-corr-row">
      <span class="t-caption c-3">${esc(label)}</span>
      <span class="t-sentence ${cls}" dir="rtl" lang="ar">${esc(text)}</span>
    </div>`;
  return `
    <div class="iu-wash-error az-corr">
      <div class="az-corr-head"><span class="az-corr-icon">${I.info}</span><span class="t-body-strong c-1">${esc(s.corrected)}</span></div>
      ${row(s.youWrote, r.originalSentence, 'c-error')}
      ${corrected ? row(s.correctForm, corrected, 'c-success') : ''}
      <p class="t-body-s c-2" dir="rtl" lang="ar">${esc((r.correctionNote ?? '').trim())}</p>
      ${canAsTyped ? `<button type="button" class="iu-card-link" data-as-typed>${esc(s.parseAsTyped)}${I.chevronLeft.replace('<svg', '<svg class="flip-ltr"')}</button>` : ''}
    </div>`;
}

export function asTypedHtml(s: Strings): string {
  return `
    <div class="iu-panel az-astyped">
      <div class="az-astyped-row"><span class="az-astyped-icon">${I.pencil}</span><p class="t-body-s c-2">${esc(s.asTypedNote)}</p></div>
      <button type="button" class="iu-card-link" data-parse-corrected>${esc(s.parseCorrected)}${I.chevronLeft.replace('<svg', '<svg class="flip-ltr"')}</button>
    </div>`;
}

export function wordCardHtml(w: IrabWord, i: number, s: Strings, ask: string | null = null): string {
  const details = hasDetails(w.details);
  const type = s.types[w.type] ?? s.types.noun;
  return `
    <article class="iu-card az-word" id="az-word-${i}" data-card="${i}">
      <h3 class="t-word c-word az-word-title" dir="rtl" lang="ar">${esc(w.word)}</h3>
      <p class="t-body c-2 az-word-irab" dir="rtl" lang="ar">${irabHtml(w.irab)}</p>
      ${details ? `
        <div class="az-details" id="az-details-${i}" hidden>
          <div class="az-details-inner">
            <p class="t-micro c-3">${esc(s.detailsLabel)}</p>
            <p class="t-body-s c-2" dir="rtl" lang="ar">${esc(w.details.trim())}</p>
            <p class="t-caption c-3">${esc(s.kind(type))}</p>
          </div>
        </div>` : ''}
      ${details || ask ? `
        <div class="az-word-foot">
          ${details ? `<button type="button" class="iu-pill az-details-toggle" data-details="${i}" aria-expanded="false" aria-controls="az-details-${i}">
            ${I.fileText}<span data-label>${esc(s.details)}</span><span class="az-chev">${I.chevronDown}</span>
          </button>` : ''}
          ${ask ? `<button type="button" class="tc-word-ask" data-ask="${i}">${I.graduationCap}<span>${esc(ask)}</span></button>` : ''}
        </div>` : ''}
    </article>`;
}

export function clarificationHtml(text: string, s: Strings): string {
  return `
    <div class="iu-card flat az-note">
      <div class="az-note-head"><span class="az-note-icon">${I.lightbulb}</span><span class="t-body-strong c-1">${esc(s.clarification)}</span></div>
      <p class="t-body-s c-2" dir="rtl" lang="ar">${esc(text)}</p>
    </div>`;
}

export function deepJumpHtml(s: Strings): string {
  return `<button type="button" class="az-deep-jump" data-deep-jump>${I.crown}<span class="t-label">${esc(s.deepJump)}</span>${I.chevronDown}</button>`;
}

export function deepHtml(deep: IrabDeep, s: Strings): string {
  const card = (icon: string, title: string, entries: [string, string][], body?: string) => `
    <section class="iu-card az-deep-card">
      <header><span class="az-deep-icon">${icon}</span><h3 class="t-body-strong c-1">${esc(title)}</h3></header>
      ${entries.map(([q, t]) => `<div class="az-deep-entry" dir="rtl" lang="ar"><p class="t-sentence-s c-1">«${esc(unquote(q))}»</p><p class="t-body-s c-2">${esc(t)}</p></div>`).join('')}
      ${body ? `<p class="t-body c-1 az-deep-body" dir="rtl" lang="ar">${esc(body)}</p>` : ''}
    </section>`;
  return `
    <div class="az-deep" id="az-deep">
      <span class="iu-tag primary az-deep-chip">${I.crown}${esc(s.modeDeep)}</span>
      <h2 class="t-title-l c-1">${esc(s.deepTitle)}</h2>
      <p class="t-body-s c-3">${esc(s.deepSub)}</p>
      ${deep.jumal.length ? card(I.branch, s.deepClauses, deep.jumal.map((c) => [c.jumla, c.mahall])) : ''}
      ${deep.awjuh.length ? card(I.route, s.deepReadings, deep.awjuh.map((r) => [r.word, r.wajh])) : ''}
      ${deep.sarf.length ? card(I.type, s.deepMorphology, deep.sarf.map((m) => [m.word, m.note])) : ''}
      ${deep.qaida.trim() ? card(I.book, s.deepRule, [], deep.qaida.trim()) : ''}
    </div>`;
}

export function analyzingHtml(text: string, deep: boolean, s: Strings): string {
  const steps = deep ? [s.steps[0], s.steps[1], s.stepDeep, s.steps[2]] : s.steps;
  return `
    <div class="iu-card az-echo"><p class="t-micro c-3">${esc(s.yourSentence)}</p><p class="t-sentence c-1" dir="rtl" lang="ar">${esc(text)}</p></div>
    <div class="iu-card az-steps">
      <div class="az-steps-head"><span class="az-spinner" aria-hidden="true"></span><h2 class="t-title c-1">${esc(deep ? s.analyzingTitleDeep : s.analyzingTitle)}</h2></div>
      <ol>
        ${steps.map(([doing, done], i) => `<li data-step="${i}" data-doing="${esc(doing)}" data-done="${esc(done)}"><span class="az-step-dot" aria-hidden="true"></span><span class="t-body-s">${esc(doing)}</span></li>`).join('')}
      </ol>
    </div>
    ${[0, 1].map(() => `<div class="iu-card az-skel" aria-hidden="true"><span></span><span></span><span></span></div>`).join('')}
    <p class="t-caption c-3 az-takes">${esc(deep ? s.takesLonger : s.takesSeconds)}</p>`;
}

export interface RecentItem { id: string; sentence: string; ts: number; words: number }

export function recentHtml(items: RecentItem[], s: Strings, lang: Lang, historyHref: string, ago: (ts: number) => string): string {
  if (!items.length) return '';
  return `
    <div class="az-recent-head"><h2 class="t-title c-1">${esc(s.recent)}</h2><a class="t-caption c-primary" href="${historyHref}">${esc(s.viewAll)}</a></div>
    <div class="iu-card az-recent-list">
      ${items.map((it) => `
        <button type="button" class="az-recent-row" data-recent="${esc(it.id)}">
          <span class="az-recent-text">
            <span class="t-sentence-s c-1" dir="rtl" lang="ar">${esc(it.sentence)}</span>
            <span class="t-caption c-3">${esc(digits(`${ago(it.ts)} · ${s.words(it.words)}`, lang))}</span>
          </span>
          <span class="az-recent-chev">${I.chevronLeft.replace('<svg', '<svg class="flip-ltr"')}</span>
        </button>`).join('')}
    </div>`;
}

/** The text copied by «نسخ الإعراب». */
export function copyText(r: IrabResult): string {
  const lines: string[] = [r.vocalizedSentence || r.words.map((w) => w.word).join(' '), ''];
  r.words.forEach((w) => {
    lines.push(`${w.word}: ${w.irab}`);
    if (hasDetails(w.details)) lines.push(`  ${w.details.trim()}`);
  });
  if (r.additionalClarification?.trim()) lines.push('', r.additionalClarification.trim());
  lines.push('', 'irab.app');
  return lines.join('\n');
}
