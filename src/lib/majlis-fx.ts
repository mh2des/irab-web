/**
 * Majlis motion helpers shared by the majlis islands. All effects are
 * transform/opacity only and no-op under prefers-reduced-motion (the CSS
 * classes are already guarded; countUp checks explicitly).
 */

const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Staggered entrance for a freshly rendered list item. */
export function stagger(el: HTMLElement, i: number): void {
  el.classList.add('panel-in');
  el.style.animationDelay = `${Math.min(i * 45, 400)}ms`;
}

/** Animate a number from 0 to `to` inside el (Western digits, optional suffix). */
export function countUp(el: HTMLElement, to: number, opts?: { ms?: number; suffix?: string }): void {
  const suffix = opts?.suffix ?? '';
  if (reduced() || !Number.isFinite(to)) { el.textContent = `${to}${suffix}`; return; }
  const ms = opts?.ms ?? 700;
  const start = performance.now();
  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(to * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Re-fire a one-shot animation class (e.g. mj-tick on a countdown digit). */
export function refire(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/** View switcher upgrade: show one section with an entrance animation. */
export function showAnimated(root: HTMLElement, views: string[], v: string): void {
  for (const x of views) {
    const el = root.querySelector<HTMLElement>(`[data-v="${x}"]`);
    if (!el) continue;
    const on = x === v;
    if (on && el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      refire(el, 'panel-in');
    } else if (!on) {
      el.classList.add('hidden');
    }
  }
}
