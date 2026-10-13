/**
 * «تقرير التدريب»: a graded sentence as an A4 report, in the analyzer
 * report's design (lib/irab/export.ts), after the app's
 * practice_pdf_service.dart: the sentence, the mark and the teacher's note,
 * then every word with the answer, its elements and the full i'rab.
 */
import type { GradeResult } from './api';
import type { PracticeStrings } from './strings';
import { answerStatus, levelOf, statusLabel } from './render';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import { paginate, downloadPages } from '../irab/export';

const TONE = { correct: 'ok', close: 'mid', review: 'bad' } as const;
const PART_TONE: Record<string, string> = { correct: 'ok', partial: 'mid', wrong: 'bad', missing: 'none' };

function pct(v: number, lang: Lang): string {
  const n = digits(Math.round(Math.max(0, Math.min(1, v)) * 100), lang);
  return lang === 'en' ? `${n}%` : `${n}٪`;
}

function blocks(r: GradeResult, s: PracticeStrings, lang: Lang): string[] {
  const statuses = r.wordFeedback.map(answerStatus);
  const count = (st: string) => statuses.filter((x) => x === st).length;
  const tags = (['correct', 'close', 'review'] as const).filter((st) => count(st) > 0)
    .map((st) => `<span class="xp-tag ${TONE[st]}">${esc(statusLabel(st, s))} ${digits(count(st), lang)}</span>`).join('');
  const out = [
    `<div class="xp-panel"><p>${esc(s.pdfSentence)}</p><p class="xp-studied" style="font-size:${r.sentence.length > 60 ? 24 : 30}px">${esc(r.sentence)}</p></div>`,
    `<div class="xp-score"><div><p>${esc(s.pdfScore)}</p><p><b>${pct(r.score, lang)}</b><span>${esc(levelOf(r, s))}</span></p></div><div class="xp-tags">${tags}</div></div>`,
  ];
  const note = r.overallFeedback.trim();
  if (note) out.push(`<div class="xp-clar"><b>${esc(s.teacherNote)}</b><p>${esc(note)}</p></div>`);
  out.push(`<h2 style="margin-top:16px">${esc(s.breakdown)}</h2>`);
  r.wordFeedback.forEach((f, i) => {
    const st = statuses[i];
    const short = st !== 'correct';
    const answered = f.userIrab.trim().length > 0;
    out.push(`<div class="xp-wb${i === r.wordFeedback.length - 1 ? ' last' : ''}">
      <div class="xp-wc"><p class="xp-studied">${esc(f.word)}</p><p class="xp-st ${TONE[st]}">${esc(statusLabel(st, s))} · ${pct(f.wordScore, lang)}</p></div>
      <div class="xp-wi">
        <p class="xp-lbl">${esc(s.yourAnswer)}</p>
        <p style="${answered ? '' : 'color:#5E7077'}">${esc(answered ? f.userIrab.trim() : s.noAnswer)}</p>
        ${short && f.parts.length ? `<div class="xp-tags xp-parts">${f.parts.map((p) => `<span class="xp-tag ${PART_TONE[p.verdict]}">${esc(p.label)}</span>`).join('')}</div>` : ''}
        ${short && f.correctIrab.trim() ? `<p class="xp-lbl">${esc(s.fullIrab)}</p><p>${esc(f.correctIrab.trim())}</p>` : ''}
        ${f.explanation.trim() ? `<p>${esc(f.explanation.trim())}</p>` : ''}
      </div></div>`);
  });
  return out;
}

export async function buildPracticePages(r: GradeResult, s: PracticeStrings, lang: Lang): Promise<HTMLElement[]> {
  return paginate(blocks(r, s, lang), { title: s.pdfTitle, madeWith: s.pdfMadeWith, page: s.pdfPage }, lang);
}

export async function downloadPracticeReport(r: GradeResult, s: PracticeStrings, lang: Lang): Promise<void> {
  await downloadPages(await buildPracticePages(r, s, lang), r.sentence);
}
