/**
 * A saved analysis or practice result, opened from /history, in the same
 * design as the tools that made it (the analyzer's result view, the
 * practice result), with a way back into the full tool.
 */
import type { HistoryItem } from '../history';
import { toResult } from './api';
import * as R from './render';
import { STRINGS, type Lang } from './strings';
import { toGrade } from '../practice/api';
import { resultsHtml } from '../practice/render';
import { PRACTICE } from '../practice/strings';

export function historyDetailHtml(item: HistoryItem, lang: Lang): string {
  const base = lang === 'ar' ? '' : '/en';
  if (item.kind === 'practice') {
    const s = PRACTICE[lang];
    const g = toGrade(item.data, item.sentence);
    g.sentence = (item.data as any)?.sentence || item.sentence;
    return `
      <p class="t-sentence c-1 hd-iu-sentence" dir="rtl" lang="ar">${R.esc(g.sentence)}</p>
      ${resultsHtml(g, s, lang)}
      <a class="iu-btn teal lg block hd-iu-open" href="${base}/practice/play?h=${encodeURIComponent(item.id)}">${R.esc(s.openInPractice)}</a>`;
  }
  const s = STRINGS[lang];
  const r = toResult(item.data, item.sentence);
  const corrected = !!(r.correctedSentence?.trim() && r.correctionNote?.trim()) && !r.asTyped;
  const caption = corrected ? s.afterCorrection : (R.isVocalized(r.words) ? s.withTashkeel : null);
  const clar = r.additionalClarification?.trim();
  return `
    ${corrected ? R.correctionHtml(r, s, false) : ''}
    ${R.heroHtml(r, s, caption, false)}
    <h2 class="t-title c-1 az-section">${R.esc(s.wordBreakdown)}</h2>
    <div class="az-cards">${r.words.map((w, i) => R.wordCardHtml(w, i, s)).join('')}</div>
    ${clar ? `<div class="az-block">${R.clarificationHtml(clar, s)}</div>` : ''}
    ${r.deep ? `<div class="az-block">${R.deepHtml(r.deep, s)}</div>` : ''}
    <a class="iu-btn primary lg block hd-iu-open" href="${base}/tool?h=${encodeURIComponent(item.id)}">${R.esc(s.openInTool)}</a>`;
}

/** «التفاصيل» on the word cards inside [container]. */
export function wireDetails(container: HTMLElement, lang: Lang): void {
  const s = STRINGS[lang];
  container.addEventListener('click', (e) => {
    const toggle = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-details]');
    if (!toggle) return;
    const panel = container.querySelector<HTMLElement>(`#az-details-${toggle.dataset.details}`);
    if (!panel) return;
    const open = panel.hidden === true;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.classList.toggle('is-open', open);
    toggle.querySelector('[data-label]')!.textContent = open ? s.detailsHide : s.details;
  });
}
