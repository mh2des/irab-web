/**
 * The analyzer's share image and A4 report, as the app makes them
 * (irab_card_service.dart, irab_pdf_service.dart): built off screen in the
 * light palette, then captured by lib/share.ts. Styles: irab-export.css.
 */
import type { IrabResult } from './api';
import { esc, hasDetails, unquote } from './render';
import { digits, type Lang, type Strings } from './strings';
import { lightbulb } from './icons';
import { shareImage, downloadPdfPages, exportFilename } from '../share';

const QR_URL = 'https://irab.app/?utm_source=share_card&utm_medium=qr';
let qr: Promise<string> | null = null;

function qrDataUrl(): Promise<string> {
  if (!qr) {
    qr = import('qrcode')
      .then((mod: any) => (mod?.toDataURL ?? mod?.default?.toDataURL)(QR_URL, {
        width: 192, margin: 0, color: { dark: '#173847', light: '#FFFFFF' },
      }))
      .catch((e) => { console.warn('[irab-qr]', e); qr = null; return ''; });
  }
  return qr;
}

function stage(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.xp-stage');
  if (!el) {
    el = document.createElement('div');
    el.className = 'xp-stage';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

function sentenceOf(r: IrabResult): string {
  return r.vocalizedSentence || r.words.map((w) => w.word).join(' ');
}

function corrected(r: IrabResult): boolean {
  return !!(r.correctedSentence?.trim() && r.correctionNote?.trim() && !r.asTyped);
}

async function imagesReady(root: HTMLElement): Promise<void> {
  await Promise.all(Array.from(root.querySelectorAll('img')).map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((ok) => { img.onload = () => ok(); img.onerror = () => ok(); })));
}

// ── Share image ─────────────────────────────────────────────────────────────

function cardSentenceSize(s: string): number {
  if (s.length > 90) return 26;
  if (s.length > 60) return 30;
  if (s.length > 40) return 34;
  return 38;
}

/** The share image's element, attached to the off-screen stage. */
export async function buildShareCard(r: IrabResult, s: Strings, lang: Lang, premium: boolean): Promise<HTMLElement> {
  const sentence = sentenceOf(r);
  const clar = r.additionalClarification?.trim() ?? '';
  const qrSrc = await qrDataUrl();
  const el = document.createElement('div');
  el.className = 'xp xp-card';
  el.dir = lang === 'ar' ? 'rtl' : 'ltr';
  el.innerHTML = `
    <div class="xp-brand"><img src="/brand-mark.png" alt=""><b>${esc(s.appName)}</b><span class="xp-ltr">irab.app</span></div>
    <div class="xp-sentence">
      <p>${esc(corrected(r) ? s.afterCorrection : s.withTashkeel)}</p>
      <p class="xp-studied" style="font-size:${cardSentenceSize(sentence)}px">${esc(sentence)}</p>
    </div>
    <h2>${esc(s.wordBreakdown)}</h2>
    <div class="xp-words">
      ${r.words.map((w) => `
        <div class="xp-row">
          <p class="xp-w xp-studied">${esc(w.word)}</p>
          <div class="xp-i"><p>${esc(w.irab)}</p>${hasDetails(w.details) ? `<p class="xp-d">${esc(w.details.trim())}</p>` : ''}</div>
        </div>`).join('')}
    </div>
    ${clar ? `<div class="xp-note"><b>${lightbulb}${esc(s.clarification)}</b><p>${esc(clar)}</p></div>` : ''}
    <div class="xp-foot">
      <div><b>${esc(premium ? s.appName : s.cardFooterCta)}</b><span class="xp-ltr">irab.app</span></div>
      ${qrSrc ? `<img class="xp-qr" src="${qrSrc}" alt="">` : ''}
    </div>`;
  stage().appendChild(el);
  await imagesReady(el);
  return el;
}

export async function shareCard(r: IrabResult, s: Strings, lang: Lang, premium: boolean): Promise<void> {
  const sentence = sentenceOf(r);
  const el = await buildShareCard(r, s, lang, premium);
  try {
    await shareImage(el, {
      filename: exportFilename(sentence, 'png'),
      title: 'إعراب · irab.app',
      text: sentence,
      background: '#F8F6F1',
    });
  } finally {
    el.remove();
  }
}

// ── A4 report ───────────────────────────────────────────────────────────────

function pageSentenceSize(s: string): number {
  if (s.length > 90) return 23;
  if (s.length > 50) return 27;
  return 31;
}

function dateLine(lang: Lang): string {
  const d = new Date();
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-arab' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch {
    return d.toDateString();
  }
}

/** A report's fixed words: its title, the footer credit, the page count. */
export interface ReportLabels { title: string; madeWith: string; page: (n: string, m: string) => string }

function newPage(l: ReportLabels, lang: Lang): HTMLElement {
  const page = document.createElement('div');
  page.className = 'xp xp-page';
  page.dir = lang === 'ar' ? 'rtl' : 'ltr';
  page.innerHTML = `
    <div class="xp-head"><img src="/brand-mark.png" alt=""><div><b>${esc(l.title)}</b><small>${esc(dateLine(lang))}</small></div><span class="xp-url xp-ltr">irab.app</span></div>
    <div class="xp-body"></div>
    <div class="xp-foot"><span>${esc(l.madeWith)}</span><span class="xp-ltr">irab.app</span><span class="xp-n"></span></div>`;
  return page;
}

/** The report's blocks in reading order; pages break only between them. */
function reportBlocks(r: IrabResult, s: Strings): string[] {
  const sentence = sentenceOf(r);
  const blocks: string[] = [];
  blocks.push(`<div class="xp-panel"><p>${esc(corrected(r) ? s.afterCorrection : s.withTashkeel)}</p><p class="xp-studied" style="font-size:${pageSentenceSize(sentence)}px">${esc(sentence)}</p></div>`);
  if (corrected(r)) {
    blocks.push(`<div class="xp-box"><b>${esc(s.corrected)}</b>
      <div class="xp-lab"><span>${esc(s.youWrote)}</span><span class="xp-studied" style="color:#C62828">${esc(r.originalSentence)}</span></div>
      <div class="xp-lab"><span>${esc(s.correctForm)}</span><span class="xp-studied" style="color:#047857">${esc(r.correctedSentence!.trim())}</span></div>
      <p>${esc(r.correctionNote!.trim())}</p></div>`);
  }
  blocks.push(`<h2>${esc(s.wordBreakdown)}</h2>`);
  r.words.forEach((w, i) => {
    blocks.push(`<div class="xp-wb${i === r.words.length - 1 ? ' last' : ''}">
      <div class="xp-wc"><p class="xp-studied">${esc(w.word)}</p><p>${esc(s.types[w.type] ?? s.types.noun)}</p></div>
      <div class="xp-wi"><p>${esc(w.irab)}</p>${hasDetails(w.details) ? `<p>${esc(w.details.trim())}</p>` : ''}</div></div>`);
  });
  const clar = r.additionalClarification?.trim();
  if (clar) blocks.push(`<div class="xp-clar"><b>${esc(s.clarification)}</b><p>${esc(clar)}</p></div>`);
  const deep = r.deep;
  if (deep) {
    const sec = (title: string, entries: [string, string][], body?: string) => `<div class="xp-deep"><b>${esc(title)}</b>${entries.map(([q, a]) => `<p class="xp-q xp-studied">«${esc(unquote(q))}»</p><p class="xp-a">${esc(a)}</p>`).join('')}${body ? `<p class="xp-a" style="margin-top:6px">${esc(body)}</p>` : ''}</div>`;
    blocks.push(`<h2 style="margin-top:18px">${esc(s.deepTitle)}</h2>`);
    if (deep.jumal.length) blocks.push(sec(s.deepClauses, deep.jumal.map((c) => [c.jumla, c.mahall])));
    if (deep.awjuh.length) blocks.push(sec(s.deepReadings, deep.awjuh.map((c) => [c.word, c.wajh])));
    if (deep.sarf.length) blocks.push(sec(s.deepMorphology, deep.sarf.map((c) => [c.word, c.note])));
    if (deep.qaida.trim()) blocks.push(sec(s.deepRule, [], deep.qaida.trim()));
  }
  return blocks;
}

export async function buildPages(r: IrabResult, s: Strings, lang: Lang): Promise<HTMLElement[]> {
  return paginate(reportBlocks(r, s), { title: s.pdfTitle, madeWith: s.pdfMadeWith, page: s.pdfPage }, lang);
}

/** Lays the blocks onto as many A4 pages as they need. */
export async function paginate(blocks: string[], l: ReportLabels, lang: Lang): Promise<HTMLElement[]> {
  const host = stage();
  const pages: HTMLElement[] = [];
  let page = newPage(l, lang);
  host.appendChild(page);
  pages.push(page);
  await imagesReady(page);
  let body = page.querySelector<HTMLElement>('.xp-body')!;
  for (const html of blocks) {
    const holder = document.createElement('div');
    holder.innerHTML = html.trim();
    const block = holder.firstElementChild as HTMLElement;
    body.appendChild(block);
    // A heading never ends a page alone, and a block that does not fit
    // moves whole to the next page.
    if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
      block.remove();
      const prev = body.lastElementChild as HTMLElement | null;
      const carry = prev && prev.tagName === 'H2' ? prev : null;
      carry?.remove();
      page = newPage(l, lang);
      host.appendChild(page);
      pages.push(page);
      body = page.querySelector<HTMLElement>('.xp-body')!;
      if (carry) body.appendChild(carry);
      body.appendChild(block);
    }
  }
  pages.forEach((p, i) => {
    p.querySelector('.xp-n')!.textContent = l.page(digits(i + 1, lang), digits(pages.length, lang));
  });
  return pages;
}

export async function downloadReport(r: IrabResult, s: Strings, lang: Lang): Promise<void> {
  await downloadPages(await buildPages(r, s, lang), sentenceOf(r));
}

/** Captures the pages into one PDF named after the sentence, then clears them. */
export async function downloadPages(pages: HTMLElement[], sentence: string): Promise<void> {
  try {
    await downloadPdfPages(pages, exportFilename(sentence, 'pdf'));
  } finally {
    pages.forEach((p) => p.remove());
  }
}
