/**
 * animate.ts — tiny Motion (motion.dev) helpers for premium, RTL-safe entrances
 * and micro-interactions. Vanilla; used inside Astro <script> islands. Direction-
 * neutral (y + opacity + scale) so it reads identically in Arabic RTL and LTR.
 * Everything honours prefers-reduced-motion.
 */
import { animate, stagger, inView } from 'motion';

const reduce = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Springy staggered reveal of a set of elements (works on injected nodes — pass live refs). */
export function revealStagger(els: ArrayLike<Element>, delayStep = 0.07): void {
  const list = Array.from(els);
  if (!list.length) return;
  if (reduce()) {
    // Reduced motion: gentle opacity-only fade (no movement) — still feels alive, stays accessible.
    animate(list as Element[], { opacity: [0, 1] }, { duration: 0.4, delay: stagger(0.05) } as any);
    return;
  }
  animate(
    list as Element[],
    { opacity: [0, 1], y: [28, 0], scale: [0.96, 1] },
    { type: 'spring', visualDuration: 0.55, bounce: 0.34, delay: stagger(delayStep) } as any,
  );
}

/** A single element entrance. */
export function revealOne(el: Element, delay = 0): void {
  if (reduce()) { (el as HTMLElement).style.opacity = '1'; return; }
  animate(el, { opacity: [0, 1], y: [12, 0] }, { type: 'spring', visualDuration: 0.45, bounce: 0.2, delay } as any);
}

/** Spring hover + press micro-interaction on buttons (tactile, beats CSS transitions). */
export function springPress(els: ArrayLike<Element>): void {
  if (reduce()) return;
  const spring = { type: 'spring', stiffness: 420, damping: 24 } as any;
  Array.from(els).forEach((btn) => {
    btn.addEventListener('pointerenter', () => animate(btn, { scale: 1.04 }, spring));
    btn.addEventListener('pointerleave', () => animate(btn, { scale: 1 }, spring));
    btn.addEventListener('pointerdown', () => animate(btn, { scale: 0.95 }, spring));
    btn.addEventListener('pointerup', () => animate(btn, { scale: 1.04 }, spring));
  });
}

export { animate, stagger, inView };
