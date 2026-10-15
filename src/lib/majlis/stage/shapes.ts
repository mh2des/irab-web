/**
 * Answer marks shared by the stage and (Phase 2) the phone: each option has a
 * colour, a shape and a letter, so the projector and every phone line up and
 * nothing depends on colour alone. Shapes come from Islamic geometry:
 * khatam (8-point star), hexagon, rhombus, circle.
 */
export const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

/** Tile colour class for option i (c1..c4, repeating). */
export const tileClass = (i: number) => `c${(i % 4) + 1}`;

/** Ink for the shape: amber tiles take dark ink, the rest white. */
const ink = (i: number) => (i % 4 === 2 ? '#173847' : '#fff');

export function shapeSvg(i: number, cls = 'sh'): string {
  const c = ink(i);
  switch (i % 4) {
    case 0:
      return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" fill="${c}"/><rect x="5" y="5" width="14" height="14" fill="${c}" transform="rotate(45 12 12)"/></svg>`;
    case 1:
      return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="${c}"/></svg>`;
    case 2:
      return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,12 12,22 2,12" fill="${c}"/></svg>`;
    default:
      return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="${c}"/></svg>`;
  }
}

export const TICK_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The board's mark: the khatam outline in gold. */
export const MARK_SVG = '<svg class="ms-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" fill="none" stroke="#F5C15E" stroke-width="1.6"/><rect x="5" y="5" width="14" height="14" fill="none" stroke="#F5C15E" stroke-width="1.6" transform="rotate(45 12 12)"/></svg>';
