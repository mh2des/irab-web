/**
 * The dictionary entry as HTML, after the app's word details screen
 * (word_details_view.dart): the headword card with its readings, then one
 * card per part (meanings, i'rab, morphology, collocations, mistakes,
 * nuance, synonyms, the Quran, the classical dictionaries, translation,
 * etymology), each only when the entry has it, then the provenance line.
 */
import type { DictEntry, DictVariant } from './api';
import type { DictStrings } from './strings';
import { esc } from '../irab/render';
import { digits, type Lang } from '../irab/strings';
import * as I from '../irab/icons';
import surahs from '../../data/surahs.json';

// Lucide icons the shared set lacks (ISC licence).
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const searchIcon = svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>');
const eyeOff = svg('<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>');
const swap = svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>');
const languages = svg('<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>');
const library = svg('<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>');

const SURAH = new Map<number, { ar: string; en: string }>((surahs as { id: number; name: string; en: string }[]).map((x) => [x.id, { ar: x.name, en: x.en }]));

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** كَتَبَ → كتب: the key a word is remembered under, as the Worker normalises it. */
export const bare = (s: string) => s.normalize('NFC').replace(TASHKEEL, '').replace(/\s+/g, ' ').trim();

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []);
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const ar = (cls: string, s: string, tag = 'span') => `<${tag} class="${cls}" dir="rtl" lang="ar">${esc(s)}</${tag}>`;

function card(title: string, icon: string, body: string, tone = 'primary', note = ''): string {
  return `
    <section class="iu-card dc-sec dc-${tone}">
      <h2 class="dc-sec-head"><span class="dc-sec-icon" aria-hidden="true">${icon}</span><span class="t-body-strong dc-sec-title">${esc(title)}</span>${note ? `<span class="t-caption c-3 dc-sec-note">${esc(note)}</span>` : ''}</h2>
      ${body}
    </section>`;
}

const chips = (items: string[], cls: string) => `<div class="dc-chips">${items.map((x) => ar(`dc-chip ${cls}`, x)).join('')}</div>`;

export interface EntryView {
  entry: DictEntry;
  variant: number;
  diacritics: boolean;
  source: string;
  word: string;
}

/** The headword card: the word, its tags, the readings and the card's actions. */
function heroHtml(v: DictVariant, view: EntryView, s: DictStrings): string {
  const lemma = text(v.lemma) || view.word;
  const shown = view.diacritics ? lemma : bare(lemma);
  const tags: string[] = [];
  if (text(v.pos)) tags.push(`<span class="iu-tag primary" dir="rtl" lang="ar">${esc(text(v.pos))}</span>`);
  if (text(v.root)) tags.push(`<span class="iu-tag missing">${esc(s.root)}<b dir="rtl" lang="ar">${esc(text(v.root))}</b></span>`);
  if (text(v.pattern)) tags.push(`<span class="iu-tag missing">${esc(s.pattern)}<b dir="rtl" lang="ar">${esc(text(v.pattern))}</b></span>`);
  const cl = view.entry.classical;
  if (cl && (cl.count > 0 || (cl.entries ?? []).length > 0)) tags.push(`<span class="iu-tag success">${I.check}${esc(s.matches)}</span>`);

  const readings = view.entry.variants.length > 1
    ? `<div class="dc-readings" role="group" aria-label="${esc(s.readings)}">
        <span class="t-label c-3">${esc(s.readings)}</span>
        ${view.entry.variants.map((x, i) => `<button type="button" class="dc-reading${i === view.variant ? ' is-on' : ''}" data-variant="${i}" aria-pressed="${i === view.variant}" dir="rtl" lang="ar">${esc(text(x.lemma) || String(i + 1))}</button>`).join('')}
      </div>`
    : '';

  return `
    <section class="iu-card dc-hero">
      <p class="dc-lemma" dir="rtl" lang="ar">${esc(shown)}</p>
      ${tags.length ? `<div class="dc-tags">${tags.join('')}</div>` : ''}
      <div class="dc-actions">
        <button type="button" class="iu-pill quiet" data-diacritics aria-pressed="${!view.diacritics}">${view.diacritics ? eyeOff : I.eye}<span>${esc(view.diacritics ? s.hideDiacritics : s.showDiacritics)}</span></button>
        <button type="button" class="iu-pill quiet" data-copy>${I.copy}<span>${esc(s.copy)}</span></button>
        <button type="button" class="iu-pill quiet" data-share>${I.share}<span>${esc(s.share)}</span></button>
      </div>
      <p class="dc-sr" data-status aria-live="polite"></p>
      ${readings}
    </section>`;
}

function meaningsHtml(v: DictVariant, s: DictStrings, lang: Lang): string {
  const senses = (v.senses ?? []).filter((x) => text(x?.definition));
  if (!senses.length) return card(s.meanings, I.book, `<p class="t-body-s c-3">${esc(s.noMeanings)}</p>`);
  const tool = lang === 'ar' ? '/tool' : '/en/tool';
  const fwd = I.chevronLeft.replace('<svg', '<svg class="flip-ltr"');
  const items = senses.map((x, i) => {
    const tags = [x.register, x.domain].map(text).filter((t) => t && t !== 'عام' && t !== 'فصحى');
    const examples = (x.examples ?? []).filter((e) => text(e?.text)).slice(0, 3).map((e) => `
      <li class="dc-example">
        ${ar('t-sentence-s c-1', text(e.text), 'p')}
        ${lang === 'en' && text(e.translation_en) ? `<p class="t-body-s c-2" dir="ltr" lang="en">${esc(text(e.translation_en))}</p>` : ''}
        <a class="iu-card-link" href="${tool}?s=${encodeURIComponent(text(e.text))}">${esc(s.analyze)}${fwd}</a>
      </li>`).join('');
    return `
      <li class="dc-sense">
        ${senses.length > 1 ? `<span class="dc-sense-n" aria-hidden="true">${digits(i + 1, lang)}</span>` : ''}
        <div class="dc-sense-body">
          ${ar('t-body c-1 dc-def', text(x.definition), 'p')}
          ${tags.length ? chips(tags, 'quiet') : ''}
          ${examples ? `<ul class="dc-examples">${examples}</ul>` : ''}
        </div>
      </li>`;
  }).join('');
  return card(s.meanings, I.book, `<ol class="dc-senses">${items}</ol>`);
}

function irabHtml(v: DictVariant, s: DictStrings): string {
  const ir = v.irab;
  if (!ir) return '';
  const facts = [ir.gender, ir.declension, ir.transitivity].map(text).filter(Boolean);
  const preps = list(ir.prepositions);
  const note = text(ir.note);
  if (!facts.length && !preps.length && !note) return '';
  return card(s.irab, I.type, `
    ${facts.length ? chips(facts, 'primary') : ''}
    ${preps.length ? `<p class="t-body-s c-2 dc-gap">${esc(s.preps)} ${ar('dc-ar-strong', preps.join('، '))}</p>` : ''}
    ${note ? ar('t-body c-1 dc-gap', note, 'p') : ''}`);
}

function morphologyHtml(v: DictVariant, s: DictStrings): string {
  const m = v.morphology && typeof v.morphology === 'object' ? v.morphology : {};
  const rows = Object.keys(s.m).filter((k) => text(m[k]));
  if (!rows.length) return '';
  return card(s.morphology, I.branch, `<dl class="dc-morph">${rows.map((k) => `<div><dt class="t-caption c-3">${esc(s.m[k])}</dt><dd>${ar('dc-ar-strong', text(m[k]))}</dd></div>`).join('')}</dl>`);
}

function usageHtml(v: DictVariant, s: DictStrings): string {
  const out: string[] = [];
  const coll = (v.collocations ?? []).filter((c) => text(c?.text));
  if (coll.length) {
    out.push(card(s.collocations, I.quote, `<ul class="dc-rows">${coll.map((c) => `<li>${ar('dc-ar-strong', text(c.text))}${text(c.meaning) ? ar('t-body-s c-2', text(c.meaning), 'p') : ''}</li>`).join('')}</ul>`));
  }
  const mistakes = (v.common_mistakes ?? []).filter((c) => text(c?.right));
  if (mistakes.length) {
    out.push(card(s.mistakes, I.xCircle, `<ul class="dc-rows">${mistakes.map((c) => `
      <li>
        <p class="dc-mistake">
          ${text(c.wrong) ? `<span class="iu-tag error">${esc(s.wrong)}</span>${ar('dc-wrong', text(c.wrong))}` : ''}
          <span class="iu-tag success">${esc(s.right)}</span>${ar('dc-ar-strong c-success', text(c.right))}
        </p>
        ${text(c.why) ? ar('t-body-s c-2', text(c.why), 'p') : ''}
      </li>`).join('')}</ul>`, 'error'));
  }
  const nuance = text(v.nuance);
  if (nuance) out.push(card(s.nuance, I.lightbulb, ar('t-body c-1', nuance, 'p')));
  return out.join('');
}

function relatedHtml(v: DictVariant, entry: DictEntry, s: DictStrings): string {
  const syn = list(v.synonyms), ant = list(v.antonyms), der = list(v.derivations);
  const fam = (entry.root_family ?? []).filter((r) => text(r?.word));
  if (!syn.length && !ant.length && !der.length && !fam.length) return '';
  const group = (label: string, body: string) => `<div class="dc-group"><h3 class="t-label c-3">${esc(label)}</h3>${body}</div>`;
  return card(s.related, swap, [
    syn.length ? group(s.synonyms, chips(syn, 'primary')) : '',
    ant.length ? group(s.antonyms, chips(ant, 'quiet')) : '',
    der.length ? group(s.derivations, chips(der, 'outline')) : '',
    fam.length ? group(s.family, `<ul class="dc-family">${fam.slice(0, 8).map((r) => `<li>${ar('dc-ar-strong', text(r.word))}${text(r.gloss) ? ar('t-body-s c-2', text(r.gloss)) : ''}</li>`).join('')}</ul>`) : '',
  ].join(''));
}

function quranHtml(entry: DictEntry, s: DictStrings, lang: Lang): string {
  const qn = entry.quran;
  if (!qn || typeof qn.n !== 'number' || qn.n <= 0) return '';
  const refs = (qn.refs ?? []).filter((r) => r && r.slug && r.a).slice(0, 3);
  const body = refs.length
    ? `<div class="dc-ayat">${refs.map((r) => {
        const name = SURAH.get(r.s);
        const where = `${s.surah} ${name ? (lang === 'ar' ? name.ar : name.en) : r.slug} · ${s.ayah} ${digits(r.a, lang)}`;
        return `
          <a class="dc-ayah" href="/quran/${encodeURIComponent(r.slug)}/${r.a}">
            <span class="t-caption c-teal">${esc(where)}</span>
            ${text(r.token) ? ar('dc-ar-strong', text(r.token)) : ''}
            ${text(r.analysis) ? ar('t-body-s c-2', text(r.analysis)) : ''}
          </a>`;
      }).join('')}</div>`
    : '';
  return card(s.quran, I.bookmark, body, 'teal', s.quranCount(qn.n, digits(qn.n, lang)));
}

function classicalHtml(entry: DictEntry, s: DictStrings): string {
  const items = (entry.classical?.entries ?? []).filter((c) => {
    const t = text(c?.text);
    return t.length >= 12 && t !== text(c.headword);
  }).slice(0, 3);
  if (!items.length) return '';
  const clip = (t: string) => (t.length > 700 ? `${t.slice(0, 700).replace(/\s+\S*$/, '')}…` : t);
  return card(s.classical, library, items.map((c) => `
    <blockquote class="dc-classical">
      ${text(c.dictionary) ? ar('t-caption c-teal', text(c.dictionary)) : ''}
      ${ar('t-body c-1', clip(text(c.text)), 'p')}
    </blockquote>`).join(''), 'teal');
}

function translationHtml(v: DictVariant, entry: DictEntry, s: DictStrings): string {
  const en = list(v.translations?.en), fr = list(v.translations?.fr);
  const out: string[] = [];
  if (en.length || fr.length) {
    out.push(card(s.translation, languages, `<div class="dc-rows">${[
      en.length ? `<div class="dc-tr"><span class="t-caption c-3">${esc(s.en)}</span><span class="t-body c-1" dir="ltr" lang="en">${esc(en.join(', '))}</span></div>` : '',
      fr.length ? `<div class="dc-tr"><span class="t-caption c-3">${esc(s.fr)}</span><span class="t-body c-1" dir="ltr" lang="fr">${esc(fr.join(', '))}</span></div>` : '',
    ].join('')}</div>`));
  }
  const ety = typeof entry.etymology === 'string' ? text(entry.etymology) : text(entry.etymology?.notes);
  if (ety) out.push(card(s.etymology, I.history, ar('t-body c-2', ety, 'p')));
  return out.join('');
}

function provenanceHtml(view: EntryView, lemma: string, s: DictStrings): string {
  const parts = [s.aiNote];
  if (view.source === 'cache') parts.push(s.fromStore);
  if (view.source === 'generated') parts.push(s.fresh);
  if (view.entry.meta?.verified) parts.push(s.verified);
  const href = `mailto:support@irab.app?subject=${encodeURIComponent(s.reportSubject(lemma))}`;
  return `<p class="t-caption c-3 dc-prov">${parts.map((p) => `<span>${esc(p)}</span>`).join('')}<a href="${href}">${esc(s.report)}</a></p>`;
}

export function entryHtml(view: EntryView, s: DictStrings, lang: Lang): string {
  const v = view.entry.variants[view.variant] ?? view.entry.variants[0];
  return [
    heroHtml(v, view, s),
    meaningsHtml(v, s, lang),
    irabHtml(v, s),
    morphologyHtml(v, s),
    usageHtml(v, s),
    relatedHtml(v, view.entry, s),
    quranHtml(view.entry, s, lang),
    classicalHtml(view.entry, s),
    translationHtml(v, view.entry, s),
    provenanceHtml(view, text(v.lemma) || view.word, s),
  ].join('');
}

/** A word chip for the start screen: tries and recent searches. */
export const wordChip = (w: string) => `<button type="button" class="dc-word" data-word="${esc(w)}" dir="rtl" lang="ar">${esc(w)}</button>`;
