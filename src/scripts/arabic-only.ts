/**
 * Arabic-only input guard.
 *
 * The analyzer and the practice grader take one Arabic sentence. Text in any
 * other script (Latin, Cyrillic, CJK, emoji…) is nothing the parser can use,
 * so instead of letting it through and failing later the box refuses it as it
 * arrives (typed, pasted, dropped or dictated) and says why, once.
 *
 * Allowed: everything the Arabic script uses (letters, tashkeel, tatweel, the
 * Quranic marks, Arabic punctuation and digits) via Script_Extensions=Arabic,
 * which, unlike Script=Arabic, also catches the marks Unicode files as
 * "Inherited" and the punctuation it files as "Common"; plus whitespace,
 * decimal digits, punctuation and math/currency symbols (a sentence may quote
 * a number or a price), and the invisible direction and joining controls.
 * Blocked: letters and combining marks of every other script, and pictographic
 * symbols such as emoji.
 */

const ALLOWED = String.raw`\p{scx=Arabic}\p{Nd}\p{P}\p{Sm}\p{Sc}\s\u200C-\u200F\uFEFF`;
const NON_ARABIC = new RegExp(`[^${ALLOWED}]`, 'u');
const NON_ARABIC_ALL = new RegExp(`[^${ALLOWED}]`, 'gu');

/** True when the text holds at least one character the parser cannot take. */
export function hasNonArabic(text: string): boolean {
  return NON_ARABIC.test(text);
}

/** The text with every non-Arabic character removed. */
export function stripNonArabic(text: string): string {
  return text.replace(NON_ARABIC_ALL, '');
}

export interface ArabicOnlyGuard {
  /** Re-check the field after a programmatic write. True if anything was removed. */
  sanitize(): boolean;
}

export interface ArabicOnlyOptions {
  /**
   * The notice under the field: an element carrying the copy in `data-text`
   * and a `[data-arabic-only-text]` child that receives it. Filled on show and
   * emptied after hide so a live region announces it every time.
   */
  note?: HTMLElement | null;
  /** How long the notice stays after the last refused character, in ms. */
  linger?: number;
}

/**
 * Keep a text field Arabic-only. Sanitizes on every input event except during
 * IME composition (editing the value mid-composition corrupts the IME's
 * buffer), and again when the composition ends. Returns a handle so callers
 * can sanitize after writing the value themselves (voice transcript, URL
 * prefill), which fires no input event.
 */
export function guardArabicOnly(
  el: HTMLTextAreaElement | HTMLInputElement,
  opts: ArabicOnlyOptions = {},
): ArabicOnlyGuard {
  const note = opts.note ?? null;
  const textEl = note?.querySelector<HTMLElement>('[data-arabic-only-text]') ?? null;
  const linger = opts.linger ?? 2800;
  let hideTimer: number | undefined;
  let clearTimer: number | undefined;
  let composing = false;

  function show(): void {
    if (note) {
      window.clearTimeout(clearTimer);
      if (textEl) textEl.textContent = note.dataset.text ?? '';
      note.classList.add('is-on');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, linger);
    }
    // Restart the nudge even when the previous one is still running.
    el.classList.remove('ar-only-nudge');
    void el.offsetWidth;
    el.classList.add('ar-only-nudge');
  }

  function hide(): void {
    if (!note) return;
    note.classList.remove('is-on');
    // Empty the live region once the collapse has played, so the next show
    // is a fresh insertion that screen readers announce again.
    clearTimer = window.setTimeout(() => { if (textEl) textEl.textContent = ''; }, 350);
  }

  function sanitize(): boolean {
    const value = el.value;
    if (!NON_ARABIC.test(value)) return false;
    // Keep the caret where the writer left it, minus whatever vanished before it.
    const start = el.selectionStart ?? value.length;
    const caret = stripNonArabic(value.slice(0, start)).length;
    el.value = stripNonArabic(value);
    try { el.setSelectionRange(caret, caret); } catch { /* some input types refuse */ }
    show();
    return true;
  }

  el.addEventListener('compositionstart', () => { composing = true; });
  el.addEventListener('compositionend', () => { composing = false; sanitize(); });
  el.addEventListener('input', () => { if (!composing) sanitize(); });
  el.addEventListener('animationend', () => el.classList.remove('ar-only-nudge'));

  return { sanitize };
}
