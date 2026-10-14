/**
 * Cards rise into place as they scroll into view: a short fade and lift, run
 * with Web Animations so the cards' own hover and press transitions are left
 * alone. Cards already on screen when the list renders (or above it) show at
 * once; the ones below the fold wait for the scroll, with a small stagger,
 * row by row, when several arrive together. Nothing moves under
 * prefers-reduced-motion.
 * Call again after re-rendering the list: the previous watch is dropped.
 */
const watches = new WeakMap<Element, IntersectionObserver>();

const FRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
  { opacity: 1, transform: 'none' },
];
const TIMING: KeyframeAnimationOptions = { duration: 560, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' };

export function revealOnScroll(root: Element, selector: string): void {
  watches.get(root)?.disconnect();
  watches.delete(root);
  if (!('IntersectionObserver' in window) || typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Held on the first frame until the card comes into view. Map order = page order.
  const pending = new Map<Element, Animation>();
  const fold = window.innerHeight;
  root.querySelectorAll(selector).forEach((el) => {
    if (el.getBoundingClientRect().top < fold) return;
    const a = el.animate(FRAMES, TIMING);
    a.pause();
    pending.set(el, a);
  });
  if (!pending.size) return;

  const io = new IntersectionObserver((entries) => {
    // The stagger goes row by row, so cards side by side in a grid arrive together.
    const rows: number[] = [];
    for (const e of entries) {
      const a = e.isIntersecting && pending.get(e.target);
      if (!a) continue;
      io.unobserve(e.target);
      pending.delete(e.target);
      const top = Math.round(e.boundingClientRect.top);
      let row = rows.findIndex((t) => Math.abs(t - top) < 8);
      if (row < 0) row = rows.push(top) - 1;
      (a.effect as KeyframeEffect).updateTiming({ delay: Math.min(row, 4) * 80 });
      a.play();
    }
    // A fast jump can pass cards by without them ever intersecting: whatever
    // is now above the viewport just shows.
    for (const [el, a] of pending) {
      if (el.getBoundingClientRect().bottom > 0) break;
      a.cancel();
      io.unobserve(el);
      pending.delete(el);
    }
    if (!pending.size) { io.disconnect(); watches.delete(root); }
  }, { rootMargin: '0px 0px -6% 0px' });
  pending.forEach((_, el) => io.observe(el));
  watches.set(root, io);
}
