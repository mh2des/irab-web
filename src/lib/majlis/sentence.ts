/**
 * The word a question asks about is the one written «like this» in the
 * question text. The stage, the phone and the creator all light it in the
 * sentence with this one rule: letters must match, harakat on either side
 * are ignored (the question may write «الطالبُ» while the sentence has
 * الطالب).
 */
const HARAKAT = /[\u064B-\u0652\u0670\u0640]/g;

/** The «quoted» word of a question, or ''. */
export function askedWord(questionText: string): string {
  const m = /«([^»]+)»/.exec(questionText ?? '');
  return (m?.[1] ?? '').trim();
}

/** [start, end) of the asked word inside the sentence, or null. */
export function askedRange(sentence: string, questionText: string): [number, number] | null {
  const letters = askedWord(questionText).replace(HARAKAT, '').trim();
  if (!letters) return null;
  const re = new RegExp(
    [...letters].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\u064B-\u0652\u0670\u0640]*') + '[\u064B-\u0652\u0670]*',
  );
  const m = re.exec(sentence ?? '');
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Fill `el` with the sentence, the asked word wrapped in <span class="hl">. */
export function sentenceInto(el: HTMLElement, sentence: string, questionText: string): void {
  el.textContent = '';
  const r = askedRange(sentence, questionText);
  if (!r) { el.textContent = sentence; return; }
  const hl = document.createElement('span');
  hl.className = 'hl';
  hl.textContent = sentence.slice(r[0], r[1]);
  el.append(document.createTextNode(sentence.slice(0, r[0])), hl, document.createTextNode(sentence.slice(r[1])));
}
